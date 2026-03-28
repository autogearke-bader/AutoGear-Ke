<?php
/**
 * Security Configuration and Functions
 * AutoGear Ke - Security Hardening Module
 */

// Include HTML Purifier for XSS protection
$htmlPurifierPath = __DIR__ . '/h/HTMLPurifier.auto.php';
if (file_exists($htmlPurifierPath)) {
    require_once $htmlPurifierPath;
}

/**
 * Configuration Constants
 */

/**
 * Get cached HTML Purifier instance for content (rich text)
 * Uses singleton pattern for better performance
 */
function get_content_purifier() {
    static $purifier = null;
    if ($purifier === null) {
        $config = HTMLPurifier_Config::createDefault();
        // Allow basic formatting tags plus iframes for YouTube embeds
        $config->set('HTML.Allowed', 'p,br,b,i,u,strong,em,a[href],ul,ol,li,blockquote,pre,code,h1,h2,h3,h4,h5,h6,img[src|alt|title],span[style],div[class],iframe[width|height|src|frameborder|allowfullscreen],video[src|poster|preload|controls],source[src|type]');
        $config->set('Attr.EnableID', false);
        $config->set('HTML.SafeIframe', true);
        $config->set('URI.SafeIframeRegexp', '%^(https?:)?//(www\.youtube\.com/embed/|player\.vimeo\.com/video/)%');
        // Enable cache for better performance
        $cachePath = __DIR__ . '/../logs/htmlpurifier_cache';
        if (!is_dir($cachePath)) {
            @mkdir($cachePath, 0750, true);
        }
        if (is_dir($cachePath) && is_writable($cachePath)) {
            $config->set('Cache.SerializerPath', $cachePath);
        }
        $purifier = new HTMLPurifier($config);
    }
    return $purifier;
}

/**
 * Get cached HTML Purifier instance for simple HTML
 */
function get_simple_purifier() {
    static $purifier = null;
    if ($purifier === null) {
        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', 'p,br,b,i,u,strong,em,a[href],ul,ol,li');
        $config->set('Attr.EnableID', false);
        // Enable cache for better performance
        $cachePath = __DIR__ . '/../logs/htmlpurifier_cache';
        if (!is_dir($cachePath)) {
            @mkdir($cachePath, 0750, true);
        }
        if (is_dir($cachePath) && is_writable($cachePath)) {
            $config->set('Cache.SerializerPath', $cachePath);
        }
        $purifier = new HTMLPurifier($config);
    }
    return $purifier;
}

// Secure session configuration
function secure_session_start() {
    $isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https';
    
    $sessionOptions = [
        'cookie_lifetime' => 86400,        // 24 hours
        'cookie_secure' => $isHttps,      // HTTPS only if available
        'cookie_httponly' => true         // Prevent JavaScript access
    ];
    
    // Add samesite only if supported (PHP 7.3+)
    if (version_compare(PHP_VERSION, '7.3.0') >= 0) {
        $sessionOptions['samesite'] = 'Strict';
    }
    
    @session_start($sessionOptions);
}

/**
 * Generate a cryptographically secure CSRF token
 */
function generate_csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Validate CSRF token from header or body
 */
function validate_csrf_token(string $token): bool {
    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    
    // Use timing-safe comparison to prevent timing attacks
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Regenerate session ID to prevent session fixation
 */
function regenerate_session(): void {
    if (session_status() === PHP_SESSION_NONE) {
        secure_session_start();
    }
    session_regenerate_id(true);
}

/**
 * Check and increment failed login attempts
 * @param PDO $pdo Database connection
 * @param string $ipAddress Client IP address
 * @param int $maxAttempts Maximum failed attempts allowed
 * @param int $lockoutMinutes Lockout duration in minutes
 * @return array ['blocked' => bool, 'attempts_remaining' => int, 'lockout_expires' => int|null]
 */
function check_login_attempts(PDO $pdo, string $ipAddress, int $maxAttempts = 10, int $lockoutMinutes = 15): array {
    $ipAddress = filter_var($ipAddress, FILTER_VALIDATE_IP) ?: '0.0.0.0';
    
    // Clean up expired lockouts
    $stmt = $pdo->prepare("DELETE FROM login_attempts WHERE expires_at < NOW()");
    $stmt->execute();
    
    // Get failed attempts count
    $stmt = $pdo->prepare("SELECT attempts, expires_at FROM login_attempts WHERE ip_address = ? AND expires_at > NOW()");
    $stmt->execute([$ipAddress]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($record) {
        $attemptsRemaining = $maxAttempts - $record['attempts'];
        
        if ($attemptsRemaining <= 0) {
            return [
                'blocked' => true,
                'attempts_remaining' => 0,
                'lockout_expires' => strtotime($record['expires_at'])
            ];
        }
        
        return [
            'blocked' => false,
            'attempts_remaining' => $attemptsRemaining,
            'lockout_expires' => null
        ];
    }
    
    return [
        'blocked' => false,
        'attempts_remaining' => $maxAttempts,
        'lockout_expires' => null
    ];
}

/**
 * Record a failed login attempt
 * @param PDO $pdo Database connection
 * @param string $ipAddress Client IP address
 * @param int $maxAttempts Maximum failed attempts allowed
 * @param int $lockoutMinutes Lockout duration in minutes
 */
function record_failed_attempt(PDO $pdo, string $ipAddress, int $maxAttempts = 10, int $lockoutMinutes = 15): void {
    $ipAddress = filter_var($ipAddress, FILTER_VALIDATE_IP) ?: '0.0.0.0';
    
    // Check if record exists
    $stmt = $pdo->prepare("SELECT id, attempts FROM login_attempts WHERE ip_address = ? AND expires_at > NOW()");
    $stmt->execute([$ipAddress]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($record) {
        // Increment attempts
        $newAttempts = $record['attempts'] + 1;
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes"));
        
        $stmt = $pdo->prepare("UPDATE login_attempts SET attempts = ?, expires_at = ? WHERE id = ?");
        $stmt->execute([$newAttempts, $expiresAt, $record['id']]);
    } else {
        // Create new record
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes"));
        
        $stmt = $pdo->prepare("INSERT INTO login_attempts (ip_address, attempts, expires_at) VALUES (?, 1, ?)");
        $stmt->execute([$ipAddress, $expiresAt]);
    }
}

/**
 * Clear failed login attempts on successful login
 * @param PDO $pdo Database connection
 * @param string $ipAddress Client IP address
 */
function clear_login_attempts(PDO $pdo, string $ipAddress): void {
    $ipAddress = filter_var($ipAddress, FILTER_VALIDATE_IP) ?: '0.0.0.0';
    
    $stmt = $pdo->prepare("DELETE FROM login_attempts WHERE ip_address = ?");
    $stmt->execute([$ipAddress]);
}

/**
 * Get client IP address (handles proxies)
 */
function get_client_ip(): string {
    $ipKeys = [
        'HTTP_CF_CONNECTING_IP',     // Cloudflare
        'HTTP_X_FORWARDED_FOR',      // Proxy
        'HTTP_X_REAL_IP',            // Nginx proxy
        'HTTP_CLIENT_IP',            // Client IP
        'REMOTE_ADDR'                // Standard
    ];
    
    foreach ($ipKeys as $key) {
        if (!empty($_SERVER[$key])) {
            $ips = explode(',', $_SERVER[$key]);
            $ip = trim($ips[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    
    return '0.0.0.0';
}

/**
 * Generate secure unique filename for uploads
 */
function generate_secure_filename(string $originalName): string {
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    // Ensure extension is safe
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!in_array($extension, $allowedExtensions)) {
        $extension = 'bin'; // Default to binary if unknown
    }
    
    // Generate unique random filename
    $uniqueName = bin2hex(random_bytes(8)) . '.' . $extension;
    return $uniqueName;
}

/**
 * Validate file MIME type using finfo_file
 * @param string $filePath Temporary file path
 * @param array $allowedTypes Allowed MIME types
 * @return bool
 */
function validate_file_mime_type(string $filePath, array $allowedTypes = ['image/jpeg', 'image/png', 'image/webp']): bool {
    if (!file_exists($filePath) || !is_readable($filePath)) {
        return false;
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo === false) {
        return false;
    }
    
    $mimeType = finfo_file($finfo, $filePath);
    finfo_close($finfo);
    
    // Validate exact MIME type (not extension)
    return in_array($mimeType, $allowedTypes, true);
}

/**
 * Sanitize string using HTML Purifier if available, otherwise basic sanitization
 * @param string $string Raw input string
 * @return string Sanitized string
 */
function sanitize_html(string $string): string {
    // Remove null bytes and other dangerous characters
    $string = str_replace("\0", '', $string);
    $string = htmlspecialchars($string, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    
    // Use cached HTML Purifier for full sanitization
    if (class_exists('HTMLPurifier')) {
        $purifier = get_simple_purifier();
        $string = $purifier->purify($string);
    }
    
    return $string;
}

/**
 * Sanitize content field (allows safe HTML tags including iframes for YouTube)
 */
function sanitize_content(string $content): string {
    // Remove null bytes
    $content = str_replace("\0", '', $content);
    
    if (class_exists('HTMLPurifier')) {
        $purifier = get_content_purifier();
        return $purifier->purify($content);
    }
    
    // Fallback: Basic sanitization without HTML Purifier
    return filter_var($content, FILTER_SANITIZE_FULL_SPECIAL_CHARS);
}

/**
 * Sanitize meta description (plain text only)
 */
function sanitize_meta_description(string $metaDescription): string {
    $metaDescription = str_replace("\0", '', $metaDescription);
    // Remove all HTML tags, keep only plain text
    $metaDescription = strip_tags($metaDescription);
    // Limit length
    $metaDescription = substr($metaDescription, 0, 160);
    return htmlspecialchars($metaDescription, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/**
 * Log security events
 */
function log_security_event(string $eventType, string $message, array $context = []): void {
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'event_type' => $eventType,
        'message' => $message,
        'ip_address' => get_client_ip(),
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        'context' => $context
    ];
    
    $logFile = __DIR__ . '/../logs/security.log';
    
    // Ensure logs directory exists
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0750, true);
    }
    
    error_log(json_encode($logData) . "\n", 3, $logFile);
}

/**
 * Require CSRF token validation - halts if invalid
 */
function require_csrf_validation(): void {
    // Try to get token from header first
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    
    // Fall back to body
    if (empty($token)) {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $input['csrf_token'] ?? '';
    }
    
    if (!validate_csrf_token($token)) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Invalid CSRF token',
            'message' => 'Request validation failed. Please refresh and try again.'
        ]);
        log_security_event('csrf_validation_failed', 'CSRF token validation failed');
        exit;
    }
}

/**
 * Require admin authentication - halts if not authenticated
 */
function require_admin_auth(): void {
    if (session_status() === PHP_SESSION_NONE) {
        secure_session_start();
    }
    
    if (empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Unauthorized',
            'message' => 'Admin authentication required'
        ]);
        log_security_event('unauthorized_access', 'Unauthorized access attempt to admin endpoint');
        exit;
    }
}

/**
 * Decode Base64 image data and return binary image data
 * @param string $base64Data Base64 encoded image data
 * @return array ['success' => bool, 'data' => string|null, 'mime' => string|null, 'error' => string|null]
 */
function decode_base64_image(string $base64Data): array {
    // Clean up Base64 data (remove data URI prefix if present)
    $data = $base64Data;
    if (preg_match('/^data:image\/([a-zA-Z]+);base64,(.+)$/', $base64Data, $matches)) {
        $mime = 'image/' . strtolower($matches[1]);
        $data = $matches[2];
    } else {
        $mime = null;
    }
    
    // Validate Base64 data
    if (!preg_match('/^[A-Za-z0-9+\/=]+$/', rtrim($data, '='))) {
        return ['success' => false, 'data' => null, 'mime' => null, 'error' => 'Invalid Base64 data'];
    }
    
    $binaryData = base64_decode($data, true);
    if ($binaryData === false) {
        return ['success' => false, 'data' => null, 'mime' => null, 'error' => 'Failed to decode Base64 data'];
    }
    
    // Detect MIME type if not provided
    if ($mime === null) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_buffer($finfo, $binaryData);
        finfo_close($finfo);
    }
    
    // Validate MIME type
    if (!in_array($mime, ALLOWED_MIME_TYPES)) {
        return ['success' => false, 'data' => null, 'mime' => null, 'error' => 'Invalid image type: ' . $mime];
    }
    
    return ['success' => true, 'data' => $binaryData, 'mime' => $mime, 'error' => null];
}

/**
 * Generate filename based on title with timestamp and unique identifier
 * @param string $title Product or article title
 * @param string $type 'product' or 'article'
 * @param string $extension File extension (without dot)
 * @param PDO|null $pdo Database connection for checking duplicates
 * @return string Generated filename
 */
function generate_title_based_filename(string $title, string $type, string $extension, ?PDO $pdo = null): string {
    // Clean and sanitize title
    $cleanTitle = strtolower(trim($title));
    $cleanTitle = preg_replace('/[^a-z0-9\s-]/', '', $cleanTitle);
    $cleanTitle = preg_replace('/[\s-]+/', '-', $cleanTitle);
    $cleanTitle = trim($cleanTitle, '-');
    
    if ($type === 'article') {
        // For articles: use first 5 words of title
        $words = explode('-', $cleanTitle);
        $words = array_slice($words, 0, 5);
        $baseName = implode('-', $words);
    } else {
        // For products: use full product name (slugified)
        $baseName = substr($cleanTitle, 0, 50); // Limit length
    }
    
    // Add timestamp and unique identifier
    $timestamp = date('YmdHis');
    $uniqueId = bin2hex(random_bytes(4));
    
    // Build filename: {baseName}-{timestamp}-{uniqueId}.{extension}
    $filename = $baseName . '-' . $timestamp . '-' . $uniqueId . '.' . $extension;
    
    // Ensure uniqueness in database if pdo provided
    if ($pdo !== null) {
        $table = $type === 'article' ? 'article_images' : 'product_images';
        $counter = 1;
        $originalFilename = $filename;
        
        while (true) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM {$table} WHERE image_name = ?");
            $stmt->execute([$filename]);
            if ($stmt->fetchColumn() == 0) {
                break;
            }
            $filename = str_replace('.' . $extension, '-' . $counter . '.' . $extension, $originalFilename);
            $counter++;
        }
    }
    
    return $filename;
}

/**
 * Compress image to target size (200KB max) while maintaining quality
 * @param string $imageData Binary image data
 * @param string $mime MIME type of the image
 * @param bool $useWhiteBg Whether to add white background (for products)
 * @return array ['success' => bool, 'data' => string|null, 'extension' => string, 'error' => string|null]
 */
function compress_image(string $imageData, string $mime, bool $useWhiteBg = false): array {
    // Create image resource from data
    $image = @imagecreatefromstring($imageData);
    if (!$image) {
        return ['success' => false, 'data' => null, 'extension' => 'jpg', 'error' => 'Failed to create image resource'];
    }
    
    $width = imagesx($image);
    $height = imagesy($image);
    
    // WHITE BACKGROUND LOGIC for products
    if ($useWhiteBg) {
        $canvas = imagecreatetruecolor($width, $height);
        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefill($canvas, 0, 0, $white);
        imagealphablending($canvas, true);
        imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
        imagedestroy($image);
        $image = $canvas;
    }
    
    // Target max size 200KB
    $targetSize = MAX_IMAGE_SIZE;
    $maxWidth = MAX_IMAGE_DIMENSION;
    
    // Resize if too large (max 1920px width)
    if ($width > $maxWidth) {
        $newWidth = $maxWidth;
        $newHeight = intval($height * ($maxWidth / $width));
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        
        // Handle transparency for PNG/WebP
        if ($useWhiteBg) {
            imagealphablending($resized, true);
            $white = imagecolorallocate($resized, 255, 255, 255);
            imagefill($resized, 0, 0, $white);
        }
        
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($image);
        $image = $resized;
        $width = $newWidth;
        $height = $newHeight;
    }
    
    // Convert to WebP first (better compression)
    $outputExtension = 'webp';
    $quality = 85;
    
    ob_start();
    imagewebp($image, null, $quality);
    $compressed = ob_get_clean();
    
    // If WebP still too big, reduce quality
    while (strlen($compressed) > $targetSize && $quality > 10) {
        $quality -= 5;
        imagedestroy($image);
        $image = imagecreatefromstring($imageData);
        
        if ($useWhiteBg) {
            $canvas = imagecreatetruecolor($width, $height);
            $white = imagecolorallocate($canvas, 255, 255, 255);
            imagefill($canvas, 0, 0, $white);
            imagealphablending($canvas, true);
            imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
            imagedestroy($image);
            $image = $canvas;
        }
        
        if ($width > $maxWidth) {
            $newWidth = $maxWidth;
            $newHeight = intval($height * ($maxWidth / $width));
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }
        
        ob_start();
        imagewebp($image, null, $quality);
        $compressed = ob_get_clean();
    }
    
    // If WebP still too big, fallback to JPG
    if (strlen($compressed) > $targetSize) {
        $outputExtension = 'jpg';
        $quality = 85;
        
        ob_start();
        imagejpeg($image, null, $quality);
        $compressed = ob_get_clean();
        
        while (strlen($compressed) > $targetSize && $quality > 10) {
            $quality -= 5;
            imagedestroy($image);
            $image = imagecreatefromstring($imageData);
            
            if ($useWhiteBg) {
                $canvas = imagecreatetruecolor($width, $height);
                $white = imagecolorallocate($canvas, 255, 255, 255);
                imagefill($canvas, 0, 0, $white);
                imagealphablending($canvas, true);
                imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
                imagedestroy($image);
                $image = $canvas;
            }
            
            if ($width > $maxWidth) {
                $newWidth = $maxWidth;
                $newHeight = intval($height * ($maxWidth / $width));
                $resized = imagecreatetruecolor($newWidth, $newHeight);
                imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                imagedestroy($image);
                $image = $resized;
            }
            
            ob_start();
            imagejpeg($image, null, $quality);
            $compressed = ob_get_clean();
        }
    }
    
    imagedestroy($image);
    
    // Final size check
    if (strlen($compressed) > $targetSize) {
        return ['success' => false, 'data' => null, 'extension' => $outputExtension, 'error' => 'Cannot compress image to target size'];
    }
    
    return ['success' => true, 'data' => $compressed, 'extension' => $outputExtension, 'error' => null];
}

/**
 * Process uploaded image (Base64, URL, or file) and return compressed image data
 * @param array $input Input data (base64, url, file)
 * @param string $title Title for naming (product name or article title)
 * @param string $type 'product' or 'article'
 * @param bool $useWhiteBg Whether to add white background
 * @param PDO $pdo Database connection
 * @return array ['success' => bool, 'filename' => string, 'error' => string|null]
 */
function process_uploaded_image(array $input, string $title, string $type, bool $useWhiteBg, PDO $pdo): array {
    $imageData = null;
    $mime = null;
    $originalExtension = 'jpg';
    
    // Determine input type and extract image data
    if (!empty($input['base64'])) {
        // Handle Base64 data
        $result = decode_base64_image($input['base64']);
        if (!$result['success']) {
            return ['success' => false, 'filename' => '', 'error' => $result['error']];
        }
        $imageData = $result['data'];
        $mime = $result['mime'];
        
        // Map MIME to extension
        $mimeToExt = [
            'image/jpeg' => 'jpg',
            'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif'
        ];
        $originalExtension = $mimeToExt[$mime] ?? 'jpg';
        
    } elseif (!empty($input['url'])) {
        // Handle URL
        $url = trim($input['url']);
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return ['success' => false, 'filename' => '', 'error' => 'Invalid image URL'];
        }
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 30,
                'user_agent' => 'AutoGear Ke Image Downloader'
            ]
        ]);
        $imageData = @file_get_contents($url, false, $context);
        if ($imageData === false) {
            return ['success' => false, 'filename' => '', 'error' => 'Failed to download image from URL'];
        }
        
        // Validate MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_buffer($finfo, $imageData);
        finfo_close($finfo);
        
        if (!in_array($mime, ALLOWED_MIME_TYPES)) {
            return ['success' => false, 'filename' => '', 'error' => 'Invalid image type from URL: ' . $mime];
        }
        
        $mimeToExt = [
            'image/jpeg' => 'jpg',
            'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif'
        ];
        $originalExtension = $mimeToExt[$mime] ?? 'jpg';
        
    } elseif (!empty($input['file']) && is_array($input['file'])) {
        // Handle file upload
        $file = $input['file'];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'filename' => '', 'error' => 'File upload error: ' . $file['error']];
        }
        
        if ($file['size'] > 5 * 1024 * 1024) { // 5MB max upload
            return ['success' => false, 'filename' => '', 'error' => 'File size exceeds 5MB limit'];
        }
        
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mime, ALLOWED_MIME_TYPES)) {
            return ['success' => false, 'filename' => '', 'error' => 'Invalid file type: ' . $mime];
        }
        
        $imageData = file_get_contents($file['tmp_name']);
        if ($imageData === false) {
            return ['success' => false, 'filename' => '', 'error' => 'Failed to read uploaded file'];
        }
        
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $mimeToExt = [
            'image/jpeg' => 'jpg',
            'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif'
        ];
        $originalExtension = $mimeToExt[$mime] ?? $extension ?? 'jpg';
        
    } else {
        return ['success' => false, 'filename' => '', 'error' => 'No image data provided'];
    }
    
    // Compress image
    $compressResult = compress_image($imageData, $mime ?? 'image/jpeg', $useWhiteBg);
    if (!$compressResult['success']) {
        return ['success' => false, 'filename' => '', 'error' => $compressResult['error']];
    }
    
    // Generate filename based on title
    $extension = $compressResult['extension'];
    $filename = generate_title_based_filename($title, $type, $extension, $pdo);
    
    return [
        'success' => true,
        'filename' => $filename,
        'data' => $compressResult['data'],
        'error' => null
    ];
}

/**
 * Upload image to database
 * @param PDO $pdo Database connection
 * @param int $itemId Product or article ID
 * @param string $filename Generated filename
 * @param string $imageData Compressed image binary data
 * @param string $altText Alt text for image
 * @param string $type 'product' or 'article'
 * @return array ['success' => bool, 'imageId' => int|null, 'error' => string|null]
 */
function upload_image_to_database(PDO $pdo, int $itemId, string $filename, string $imageData, string $altText, string $type): array {
    $table = $type === 'article' ? 'article_images' : 'product_images';
    
    // Ensure table exists
    try {
        $stmt = $pdo->prepare("SHOW TABLES LIKE '{$table}'");
        $stmt->execute();
        if ($stmt->rowCount() === 0) {
            $createSql = $type === 'article' ? "
                CREATE TABLE {$table} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    article_id INT NOT NULL,
                    image_name VARCHAR(255) NOT NULL,
                    image_data LONGBLOB NOT NULL,
                    alt_text VARCHAR(255) DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_item_id (article_id),
                    INDEX idx_image_name (image_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            " : "
                CREATE TABLE {$table} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    image_name VARCHAR(255) NOT NULL,
                    image_data LONGBLOB NOT NULL,
                    alt_text VARCHAR(255) DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_item_id (product_id),
                    INDEX idx_image_name (image_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ";
            $pdo->exec($createSql);
        }
    } catch (PDOException $e) {
        return ['success' => false, 'imageId' => null, 'error' => 'Failed to ensure table exists: ' . $e->getMessage()];
    }
    
    // Sanitize alt text
    $sanitizedAltText = sanitize_html($altText);
    
    // Insert image
    try {
        // Save to filesystem first
        if (!save_image_to_filesystem($filename, $imageData)) {
            return ['success' => false, 'imageId' => null, 'error' => 'Failed to save image to filesystem'];
        }

        $columnId = $type === 'article' ? 'article_id' : 'product_id';
        
        // Check if image_data column exists and is nullable (or just store placeholder)
        // For now, we store a placeholder to satisfy NOT NULL constraint if it exists
        $placeholderData = "FILE_STORED"; 
        
        $stmt = $pdo->prepare("INSERT INTO {$table} ({$columnId}, image_name, image_data, alt_text) VALUES (?, ?, ?, ?)");
        $stmt->execute([$itemId, $filename, $placeholderData, $sanitizedAltText]);
        $imageId = (int)$pdo->lastInsertId();
        
        // Update featured image for first image
        if ($type === 'article' && $itemId > 0) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM {$table} WHERE {$columnId} = ?");
            $stmt->execute([$itemId]);
            if ($stmt->fetchColumn() === 1) {
                $stmt = $pdo->prepare("UPDATE articles SET featured_image = ? WHERE id = ?");
                $stmt->execute([$filename, $itemId]);
            }
        }
        
        log_security_event('image_uploaded', ucfirst($type) . ' image uploaded', [
            'type' => $type,
            'item_id' => $itemId,
            'filename' => $filename,
            'size' => strlen($imageData)
        ]);
        
        return ['success' => true, 'imageId' => $imageId, 'error' => null];
        
    } catch (PDOException $e) {
        return ['success' => false, 'imageId' => null, 'error' => 'Failed to save image: ' . $e->getMessage()];
    }
}

/**
 * Save image data to filesystem
 */
function save_image_to_filesystem(string $filename, string $data): bool {
    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            error_log("Failed to create upload directory: $uploadDir");
            return false;
        }
    }
    
    $filepath = $uploadDir . $filename;
    if (file_put_contents($filepath, $data) === false) {
        error_log("Failed to write file: $filepath");
        return false;
    }
    
    return true;
}


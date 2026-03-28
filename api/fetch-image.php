<?php
/**
 * Secure Image Fetch Proxy
 * Fetches external images while bypassing CSP restrictions
 * Allows all external domains
 */

header('Content-Type: application/json');

// Load security functions (REQUIRED)
require_once 'security.php';

// Require admin authentication
require_admin_auth();

// Get and validate URL
$imageUrl = $_GET['url'] ?? '';

if (empty($imageUrl)) {
    http_response_code(400);
    echo json_encode(['error' => 'URL parameter is required']);
    exit;
}

if (!filter_var($imageUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid URL format']);
    exit;
}

// Security: Block local/internal URLs (prevent SSRF attacks on internal network)
$urlHost = parse_url($imageUrl, PHP_URL_HOST);
$urlScheme = parse_url($imageUrl, PHP_URL_SCHEME);

// Block non-HTTP schemes
if (!in_array($urlScheme, ['http', 'https'])) {
    log_security_event('image_fetch_blocked', 'Blocked non-HTTP scheme', [
        'url' => $imageUrl,
        'scheme' => $urlScheme
    ]);
    
    http_response_code(403);
    echo json_encode(['error' => 'Only HTTP/HTTPS URLs are allowed']);
    exit;
}

// Block localhost and internal IP ranges
$blockedHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1'
];

// Check if it's an internal IP
if (in_array($urlHost, $blockedHosts) || 
    preg_match('/^10\./', $urlHost) ||           // 10.0.0.0/8
    preg_match('/^172\.(1[6-9]|2[0-9]|3[01])\./', $urlHost) || // 172.16.0.0/12
    preg_match('/^192\.168\./', $urlHost) ||      // 192.168.0.0/16
    preg_match('/^169\.254\./', $urlHost)) {      // 169.254.0.0/16 (link-local)
    
    log_security_event('image_fetch_blocked', 'Blocked internal/localhost URL', [
        'url' => $imageUrl,
        'host' => $urlHost
    ]);
    
    http_response_code(403);
    echo json_encode(['error' => 'Internal/localhost URLs are not allowed']);
    exit;
}

// Fetch the image
try {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'User-Agent: Mozilla/5.0 (compatible; AutoGearKe/1.0)',
            'timeout' => 30,
            'follow_location' => true,
            'max_redirects' => 3
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);
    
    $imageData = @file_get_contents($imageUrl, false, $context);
    
    if ($imageData === false) {
        log_security_event('image_fetch_failed', 'Failed to fetch image', [
            'url' => $imageUrl
        ]);
        
        http_response_code(400);
        echo json_encode(['error' => 'Failed to fetch image from URL']);
        exit;
    }
    
    // Validate it's actually an image
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_buffer($finfo, $imageData);
    finfo_close($finfo);
    
    $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (!in_array($mimeType, $allowedMimeTypes)) {
        log_security_event('image_fetch_invalid', 'Invalid image type', [
            'url' => $imageUrl,
            'mime_type' => $mimeType
        ]);
        
        http_response_code(400);
        echo json_encode(['error' => 'URL does not point to a valid image. Got: ' . $mimeType]);
        exit;
    }
    
    // Check file size (prevent huge files)
    $fileSize = strlen($imageData);
    $maxSize = 10 * 1024 * 1024; // 10MB
    
    if ($fileSize > $maxSize) {
        http_response_code(400);
        echo json_encode(['error' => 'Image too large (max 10MB)']);
        exit;
    }
    
    // Log successful fetch
    log_security_event('image_fetch_success', 'External image fetched', [
        'url' => $imageUrl,
        'host' => $urlHost,
        'size' => $fileSize,
        'mime_type' => $mimeType
    ]);
    
    // Return as base64
    echo json_encode([
        'success' => true,
        'data' => 'data:' . $mimeType . ';base64,' . base64_encode($imageData),
        'mime_type' => $mimeType,
        'size' => $fileSize
    ]);
    
} catch (Exception $e) {
    log_security_event('image_fetch_error', 'Image fetch exception', [
        'url' => $imageUrl,
        'error' => $e->getMessage()
    ]);
    
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
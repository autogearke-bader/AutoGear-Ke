<?php
/**
 * Image Storage Service
 * Handles filesystem-based image storage with security features
 * 
 * Features:
 * - Dated directory structure (uploads/year/month/)
 * - Hash-based filename generation
 * - MIME type validation and file scanning
 * - Base64 conversion for display
 * - Orphaned file cleanup
 * - File metadata storage
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class ImageStorageService
{
    private $pdo;
    private $uploadBaseDir;
    private $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    private $maxFileSize = 5 * 1024 * 1024; // 5MB
    private $maxImageDimension = 3000; // Max width/height

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo;
        $this->uploadBaseDir = __DIR__ . '/../uploads/';
        
        // Ensure upload directory exists
        $this->ensureDirectoryStructure();
    }

    /**
     * Ensure the directory structure exists
     */
    private function ensureDirectoryStructure(): void
    {
        $directories = [
            $this->uploadBaseDir,
            $this->uploadBaseDir . 'products/',
            $this->uploadBaseDir . 'articles/',
            $this->uploadBaseDir . 'cache/',
            $this->uploadBaseDir . 'temp/',
        ];

        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }

    /**
     * Generate a unique filename with hash-based naming
     */
    public function generateFilename(string $originalName, string $type = 'product'): string
    {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        
        // Ensure extension is valid
        if (!in_array($extension, $this->allowedExtensions)) {
            $extension = 'jpg'; // Default extension
        }

        // Generate unique hash
        $hash = bin2hex(random_bytes(8));
        $timestamp = date('YmdHis');
        
        if ($type === 'article') {
            return "article-{$timestamp}-{$hash}.{$extension}";
        }
        return "product-{$timestamp}-{$hash}.{$extension}";
    }

    /**
     * Get the storage directory for a specific type
     */
    public function getStorageDirectory(string $type = 'product'): string
    {
        $year = date('Y');
        $month = date('m');
        $dir = $this->uploadBaseDir . $type . '/' . $year . '/' . $month . '/';
        
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        return $dir;
    }

    /**
     * Validate file before upload
     */
    public function validateFile(array $file): array
    {
        $errors = [];

        // Check for upload errors
        if (isset($file['error']) && $file['error'] !== UPLOAD_ERR_OK) {
            $errors[] = $this->getUploadErrorMessage($file['error']);
            return ['valid' => false, 'errors' => $errors];
        }

        // Check file size
        if (isset($file['size']) && $file['size'] > $this->maxFileSize) {
            $errors[] = "File size exceeds maximum allowed size ({$this->maxFileSize} bytes)";
        }

        // Check if file is uploaded via HTTP POST
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            $errors[] = "File upload validation failed";
        }

        // Validate MIME type
        if (isset($file['tmp_name'])) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            if (!in_array($mimeType, $this->allowedMimeTypes)) {
                $errors[] = "Invalid file type: {$mimeType}";
            }
        }

        // Check for valid image
        if (isset($file['tmp_name'])) {
            $imageInfo = @getimagesize($file['tmp_name']);
            if ($imageInfo === false) {
                $errors[] = "File is not a valid image";
            } elseif ($imageInfo[0] > $this->maxImageDimension || $imageInfo[1] > $this->maxImageDimension) {
                $errors[] = "Image dimensions exceed maximum allowed ({$this->maxImageDimension}px)";
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }

    /**
     * Get human-readable upload error message
     */
    private function getUploadErrorMessage(int $errorCode): string
    {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds server maximum size',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds form maximum size',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension',
        ];
        
        return $messages[$errorCode] ?? 'Unknown upload error';
    }

    /**
     * Save uploaded file to filesystem
     */
    public function saveUploadedFile(array $file, string $filename, string $type = 'product'): array
    {
        $validation = $this->validateFile($file);
        
        if (!$validation['valid']) {
            return [
                'success' => false,
                'error' => implode('; ', $validation['errors'])
            ];
        }

        $targetDir = $this->getStorageDirectory($type);
        $targetPath = $targetDir . $filename;

        // Ensure unique filename
        $counter = 1;
        $baseFilename = $filename;
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        
        while (file_exists($targetPath)) {
            $filename = str_replace('.', '-' . $counter . '.', $baseFilename);
            $targetPath = $targetDir . $filename;
            $counter++;
        }

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            return [
                'success' => false,
                'error' => 'Failed to move uploaded file'
            ];
        }

        // Get file metadata
        $metadata = $this->getFileMetadata($targetPath);

        return [
            'success' => true,
            'filename' => $filename,
            'filepath' => $targetPath,
            'relative_path' => $this->getRelativePath($targetPath),
            'metadata' => $metadata
        ];
    }

    /**
     * Save binary image data to filesystem
     */
    public function saveBinaryData(string $binaryData, string $filename, string $type = 'product'): array
    {
        // Validate binary data is actually an image
        $imageInfo = @getimagesizefromstring($binaryData);
        if ($imageInfo === false) {
            return [
                'success' => false,
                'error' => 'Invalid image data'
            ];
        }

        // Validate MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_buffer($finfo, $binaryData);
        finfo_close($finfo);

        if (!in_array($mimeType, $this->allowedMimeTypes)) {
            return [
                'success' => false,
                'error' => "Invalid image type: {$mimeType}"
            ];
        }

        $targetDir = $this->getStorageDirectory($type);
        $targetPath = $targetDir . $filename;

        // Ensure unique filename
        $counter = 1;
        $baseFilename = $filename;
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        
        while (file_exists($targetPath)) {
            $filename = str_replace('.', '-' . $counter . '.', $baseFilename);
            $targetPath = $targetDir . $filename;
            $counter++;
        }

        // Save file
        if (file_put_contents($targetPath, $binaryData) === false) {
            return [
                'success' => false,
                'error' => 'Failed to write file'
            ];
        }

        $metadata = $this->getFileMetadata($targetPath);

        return [
            'success' => true,
            'filename' => $filename,
            'filepath' => $targetPath,
            'relative_path' => $this->getRelativePath($targetPath),
            'metadata' => $metadata
        ];
    }

    /**
     * Get file metadata
     */
    public function getFileMetadata(string $filePath): array
    {
        if (!file_exists($filePath)) {
            return [];
        }

        $imageInfo = @getimagesize($filePath);
        $mimeType = mime_content_type($filePath);

        return [
            'width' => $imageInfo[0] ?? 0,
            'height' => $imageInfo[1] ?? 0,
            'mime_type' => $mimeType,
            'file_size' => filesize($filePath),
            'file_size_human' => $this->formatFileSize(filesize($filePath)),
            'extension' => strtolower(pathinfo($filePath, PATHINFO_EXTENSION)),
            'created_at' => date('Y-m-d H:i:s', filectime($filePath))
        ];
    }

    /**
     * Format file size for human readability
     */
    private function formatFileSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $unitIndex = 0;
        
        while ($bytes >= 1024 && $unitIndex < count($units) - 1) {
            $bytes /= 1024;
            $unitIndex++;
        }
        
        return round($bytes, 2) . ' ' . $units[$unitIndex];
    }

    /**
     * Get relative path from base directory
     */
    private function getRelativePath(string $absolutePath): string
    {
        return str_replace($this->uploadBaseDir, '', $absolutePath);
    }

    /**
     * Delete file from filesystem
     */
    public function deleteFile(string $filename, string $type = 'product'): bool
    {
        $deleted = false;
        $filePath = null;
        
        // Try to find file in dated directories
        $years = glob($this->uploadBaseDir . $type . '/*');
        foreach ($years as $year) {
            if (is_dir($year)) {
                $months = glob($year . '/*');
                foreach ($months as $month) {
                    $filePath = $month . '/' . $filename;
                    if (file_exists($filePath)) {
                        $deleted = unlink($filePath);
                        if ($deleted) {
                            error_log("[ImageStorageService] Deleted file: {$filePath} (type: {$type})");
                        } else {
                            error_log("[ImageStorageService] Failed to delete file: {$filePath} (type: {$type})");
                        }
                        return $deleted;
                    }
                }
            }
        }
        
        // Try direct path
        $directPath = $this->uploadBaseDir . $type . '/' . $filename;
        if (file_exists($directPath)) {
            $deleted = unlink($directPath);
            if ($deleted) {
                error_log("[ImageStorageService] Deleted file: {$directPath} (type: {$type})");
            } else {
                error_log("[ImageStorageService] Failed to delete file: {$directPath} (type: {$type})");
            }
            return $deleted;
        }
        
        // File not found
        error_log("[ImageStorageService] File not found for deletion: {$filename} (type: {$type})");
        return false;
    }

    /**
     * Convert image to base64 for display
     */
    public function fileToBase64(string $filepath): ?string
    {
        if (!file_exists($filepath) || !is_readable($filepath)) {
            return null;
        }

        $mimeType = mime_content_type($filepath);
        $binaryData = file_get_contents($filepath);
        
        if ($binaryData === false) {
            return null;
        }

        return 'data:' . $mimeType . ';base64,' . base64_encode($binaryData);
    }

    /**
     * Convert image to base64 by filename
     */
    public function filenameToBase64(string $filename, string $type = 'product'): ?string
    {
        $filepath = $this->findFilePath($filename, $type);
        
        if ($filepath === null) {
            return null;
        }
        
        return $this->fileToBase64($filepath);
    }

    /**
     * Find file path by filename
     */
    public function findFilePath(string $filename, string $type = 'product'): ?string
    {
        // Try dated directory structure
        $years = glob($this->uploadBaseDir . $type . '/*');
        foreach ($years as $year) {
            if (is_dir($year)) {
                $months = glob($year . '/*');
                foreach ($months as $month) {
                    $filePath = $month . '/' . $filename;
                    if (file_exists($filePath)) {
                        return $filePath;
                    }
                }
            }
        }
        
        // Try direct path
        $directPath = $this->uploadBaseDir . $type . '/' . $filename;
        if (file_exists($directPath)) {
            return $directPath;
        }
        
        // Try old structure (without date)
        $oldPath = $this->uploadBaseDir . $filename;
        if (file_exists($oldPath)) {
            return $oldPath;
        }
        
        return null;
    }

    /**
     * Check if file exists
     */
    public function fileExists(string $filename, string $type = 'product'): bool
    {
        return $this->findFilePath($filename, $type) !== null;
    }

    /**
     * Get file URL for serving
     */
    public function getFileUrl(string $filename, string $type = 'product'): string
    {
        $baseUrl = $this->getBaseUrl();
        $relativePath = $this->getRelativePath($this->findFilePath($filename, $type) ?? $filename);
        return $baseUrl . 'uploads/' . $relativePath;
    }

    /**
     * Get base URL for the application
     */
    private function getBaseUrl(): string
    {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return $protocol . $host;
    }

    /**
     * Cleanup orphaned files (files without database records)
     */
    public function cleanupOrphanedFiles(string $type = 'product'): array
    {
        if ($this->pdo === null) {
            return ['cleaned' => 0, 'errors' => ['Database connection required']];
        }

        $cleaned = [];
        $errors = [];

        // Get all stored filenames from database
        $table = $type === 'article' ? 'article_images' : 'product_images';
        
        try {
            $stmt = $this->pdo->prepare("SELECT DISTINCT image_name FROM {$table}");
            $stmt->execute();
            $dbFiles = $stmt->fetchAll(PDO::FETCH_COLUMN);
        } catch (PDOException $e) {
            return ['cleaned' => 0, 'errors' => [$e->getMessage()]];
        }

        $dbFileSet = array_flip($dbFiles);

        // Scan upload directories
        $uploadDir = $this->uploadBaseDir . $type . '/';
        
        if (is_dir($uploadDir)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($uploadDir, RecursiveDirectoryIterator::SKIP_DOTS)
            );

            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $filename = $file->getFilename();
                    
                    // Skip files that are in database
                    if (isset($dbFileSet[$filename])) {
                        continue;
                    }

                    // Skip cache and temp directories
                    $relativePath = $file->getPathname();
                    if (strpos($relativePath, '/cache/') !== false || 
                        strpos($relativePath, '/temp/') !== false ||
                        strpos($relativePath, '/temp-') !== false) {
                        continue;
                    }

                    // Delete orphaned file
                    if (@unlink($file->getPathname())) {
                        $cleaned[] = $filename;
                    } else {
                        $errors[] = "Failed to delete: " . $filename;
                    }
                }
            }
        }

        return [
            'cleaned' => count($cleaned),
            'files' => $cleaned,
            'errors' => $errors
        ];
    }

    /**
     * Scan directory and find all files (for migration/cleanup)
     */
    public function scanAllFiles(string $type = 'product'): array
    {
        $files = [];
        $uploadDir = $this->uploadBaseDir . $type . '/';
        
        if (is_dir($uploadDir)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($uploadDir, RecursiveDirectoryIterator::SKIP_DOTS)
            );

            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $files[] = [
                        'pathname' => $file->getPathname(),
                        'filename' => $file->getFilename(),
                        'relative_path' => $this->getRelativePath($file->getPathname()),
                        'size' => $file->getSize(),
                        'mtime' => date('Y-m-d H:i:s', $file->getMTime())
                    ];
                }
            }
        }

        return $files;
    }
}

/**
 * Process uploaded image and save to filesystem
 */
function process_uploaded_image_filesystem(array $input, string $title, string $type = 'product', bool $useWhiteBg = false, ?PDO $pdo = null): array
{
    $storage = new ImageStorageService($pdo);
    $binaryData = null;
    $originalFilename = '';
    $mimeType = '';

    // Get image data from input
    if (!empty($input['base64'])) {
        // Decode base64 image
        $result = decode_base64_image($input['base64']);
        if (!$result['success']) {
            return ['success' => false, 'error' => $result['error']];
        }
        $binaryData = $result['data'];
        $mimeType = $result['mime'];
        
        // Get extension from MIME type
        $extension = str_replace('image/', '', $mimeType);
        if ($extension === 'jpeg') $extension = 'jpg';
        $originalFilename = 'upload.' . $extension;
        
    } elseif (!empty($input['url'])) {
        // Fetch image from URL
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => 'User-Agent: Mozilla/5.0 (compatible; AutoGearKe/1.0)',
                'timeout' => 30
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false
            ]
        ]);
        
        $binaryData = @file_get_contents($input['url'], false, $context);
        
        if ($binaryData === false) {
            return ['success' => false, 'error' => 'Failed to fetch image from URL'];
        }
        
        // Get filename from URL
        $originalFilename = basename(parse_url($input['url'], PHP_URL_PATH));
        if (empty($originalFilename) || strlen($originalFilename) < 3) {
            $originalFilename = 'upload.jpg';
        }
        
        // Get MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_buffer($finfo, $binaryData);
        finfo_close($finfo);
        
    } elseif (!empty($input['file'])) {
        // Handle file upload
        $file = $input['file'];
        
        // Validate uploaded file
        $validation = $storage->validateFile($file);
        if (!$validation['valid']) {
            return ['success' => false, 'error' => implode('; ', $validation['errors'])];
        }
        
        $originalFilename = $file['name'];
        $mimeType = mime_content_type($file['tmp_name']);
        
        // Read binary data
        $binaryData = file_get_contents($file['tmp_name']);
        
    } else {
        return ['success' => false, 'error' => 'No image data provided'];
    }

    // Validate MIME type
    $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!in_array($mimeType, $allowedMimeTypes)) {
        return ['success' => false, 'error' => 'Invalid image type: ' . $mimeType];
    }

    // Compress image if needed
    $compressResult = compress_image($binaryData, $mimeType, $useWhiteBg);
    if ($compressResult['success']) {
        $binaryData = $compressResult['data'];
    }

    // Generate filename
    $extension = str_replace('image/', '', $mimeType);
    if ($extension === 'jpeg') $extension = 'jpg';
    $filename = $storage->generateFilename($title . '.' . $extension, $type);

    // Save to filesystem
    $saveResult = $storage->saveBinaryData($binaryData, $filename, $type);
    
    if (!$saveResult['success']) {
        return ['success' => false, 'error' => $saveResult['error']];
    }

    return [
        'success' => true,
        'filename' => $saveResult['filename'],
        'filepath' => $saveResult['filepath'],
        'data' => $binaryData,
        'metadata' => $saveResult['metadata'],
        'original_filename' => $originalFilename
    ];
}

/**
 * Upload image record to database (stores file reference instead of BLOB)
 */
function upload_image_to_database_filesystem(PDO $pdo, int $itemId, string $imageName, string $altText, string $type = 'product', array $metadata = []): array
{
    $table = $type === 'article' ? 'article_images' : 'product_images';
    $idColumn = $type === 'article' ? 'article_id' : 'product_id';
    
    try {
        // Check if image already exists for this item
        $stmt = $pdo->prepare("SELECT id, image_name FROM {$table} WHERE {$idColumn} = ? AND image_name = ?");
        $stmt->execute([$itemId, $imageName]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // Update existing record with new file reference
            $stmt = $pdo->prepare("
                UPDATE {$table} 
                SET alt_text = ?, 
                    file_path = ?, 
                    file_size = ?, 
                    mime_type = ?, 
                    width = ?, 
                    height = ?,
                    metadata = ?,
                    created_at = NOW()
                WHERE id = ?
            ");
            
            $stmt->execute([
                $altText,
                $imageName,
                $metadata['file_size'] ?? 0,
                $metadata['mime_type'] ?? 'image/jpeg',
                $metadata['width'] ?? 0,
                $metadata['height'] ?? 0,
                json_encode($metadata),
                $existing['id']
            ]);
            
            return [
                'success' => true,
                'imageId' => $existing['id'],
                'action' => 'updated'
            ];
        }
        
        // Insert new record
        $stmt = $pdo->prepare("
            INSERT INTO {$table} 
            ({$idColumn}, image_name, file_path, file_size, mime_type, width, height, alt_text, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $itemId,
            $imageName,
            $imageName, // file_path same as image_name for backward compatibility
            $metadata['file_size'] ?? 0,
            $metadata['mime_type'] ?? 'image/jpeg',
            $metadata['width'] ?? 0,
            $metadata['height'] ?? 0,
            $altText,
            json_encode($metadata)
        ]);
        
        return [
            'success' => true,
            'imageId' => (int)$pdo->lastInsertId(),
            'action' => 'inserted'
        ];
        
    } catch (PDOException $e) {
        error_log("Database error in upload_image_to_database_filesystem: " . $e->getMessage());
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * Delete image record and associated file
 */
function delete_image_filesystem(PDO $pdo, int $imageId, string $type = 'product'): array
{
    $table = $type === 'article' ? 'article_images' : 'product_images';
    
    try {
        // Get image record
        $stmt = $pdo->prepare("SELECT image_name FROM {$table} WHERE id = ?");
        $stmt->execute([$imageId]);
        $image = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$image) {
            return ['success' => false, 'error' => 'Image not found'];
        }
        
        // Delete from database
        $stmt = $pdo->prepare("DELETE FROM {$table} WHERE id = ?");
        $stmt->execute([$imageId]);
        
        // Delete file from filesystem
        $storage = new ImageStorageService($pdo);
        $deleted = $storage->deleteFile($image['image_name'], $type);
        
        return [
            'success' => true,
            'file_deleted' => $deleted,
            'imageId' => $imageId
        ];
        
    } catch (PDOException $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Get base64 representation of an image by ID
 */
function get_image_base64_filesystem(PDO $pdo, int $imageId, string $type = 'product'): array
{
    $table = $type === 'article' ? 'article_images' : 'product_images';
    
    try {
        $stmt = $pdo->prepare("SELECT image_name, alt_text FROM {$table} WHERE id = ?");
        $stmt->execute([$imageId]);
        $image = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$image) {
            return ['success' => false, 'error' => 'Image not found'];
        }
        
        $storage = new ImageStorageService($pdo);
        $base64 = $storage->filenameToBase64($image['image_name'], $type);
        
        if ($base64 === null) {
            return ['success' => false, 'error' => 'Image file not found on disk'];
        }
        
        return [
            'success' => true,
            'base64' => $base64,
            'alt_text' => $image['alt_text'],
            'image_name' => $image['image_name']
        ];
        
    } catch (PDOException $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

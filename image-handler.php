<?php
/**
 * Image Handler - Serves images from filesystem
 * 
 * This handler:
 * 1. Serves images directly from filesystem (preferred)
 * 2. Falls back to database for migrated images
 * 3. Implements caching with ETag support
 * 4. Supports on-demand base64 conversion
 */

require_once 'api/db.php';
require_once 'api/ImageStorageService.php';

// Get image name from query parameter (set by .htaccess)
$imageName = $_GET['image'] ?? '';
$imageType = $_GET['type'] ?? '';

if (empty($imageName)) {
    http_response_code(400);
    exit('Image name required');
}

// Remove any query string from image name
$imageName = strtok($imageName, '?');

// Determine image type
$isProductImage = ($imageType === 'product');
$isArticleImage = ($imageType === 'article');

// Detect type from image name pattern if not specified
if (!$isProductImage && !$isArticleImage) {
    if (preg_match('/^product-/', $imageName)) {
        $isProductImage = true;
    } elseif (preg_match('/^article-/', $imageName)) {
        $isArticleImage = true;
    } elseif (preg_match('/-[a-f0-9]{8,}\./', $imageName)) {
        $isProductImage = true; // Legacy product naming
    } else {
        $isArticleImage = true; // Default to article
    }
}

// Initialize storage service
$storage = new ImageStorageService($pdo);

// Check if base64 conversion is requested
$convertToBase64 = isset($_GET['base64']) && $_GET['base64'] === '1';

// Determine image type for storage
$storageType = $isProductImage ? 'product' : 'article';

// Try to find file on filesystem first
$filePath = $storage->findFilePath($imageName, $storageType);

if ($filePath && file_exists($filePath)) {
    // Serve from filesystem
    serveImage($filePath, $convertToBase64);
    exit;
}

// File not found on filesystem, try database
try {
    $image = null;
    
    if ($isProductImage) {
        $stmt = $pdo->prepare("SELECT pi.* FROM product_images pi WHERE pi.image_name = ?");
        $stmt->execute([$imageName]);
        $image = $stmt->fetch(PDO::FETCH_ASSOC);
    } elseif ($isArticleImage) {
        $stmt = $pdo->prepare("SELECT ai.* FROM article_images ai WHERE ai.image_name = ?");
        $stmt->execute([$imageName]);
        $image = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$image) {
        http_response_code(404);
        error_log("Image not found: $imageName");
        exit('Image not found');
    }
    
    // Check if it's already migrated to filesystem
    if (!empty($image['file_path']) && $image['image_data'] === 'FILE_STORED') {
        // Try to find the file again (might be in different location)
        $filePath = $storage->findFilePath($image['file_path'], $storageType);
        if ($filePath && file_exists($filePath)) {
            serveImage($filePath, $convertToBase64);
            exit;
        }
        http_response_code(404);
        exit('Image file missing from disk');
    }
    
    // Serve from database BLOB (legacy/migrating images)
    if (empty($image['image_data']) || $image['image_data'] === 'FILE_STORED') {
        http_response_code(404);
        exit('Image data not available');
    }
    
    $binaryData = $image['image_data'];
    $mimeType = $image['mime_type'] ?? 'image/jpeg';
    
    // If base64 conversion requested
    if ($convertToBase64) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'image_name' => $imageName,
            'base64' => 'data:' . $mimeType . ';base64,' . base64_encode($binaryData),
            'mime_type' => $mimeType
        ]);
        exit;
    }
    
    // Serve binary image
    $finfo = finfo_open();
    $detectedMime = finfo_buffer($finfo, $binaryData, FILEINFO_MIME_TYPE);
    finfo_close($finfo);
    
    $mimeType = $detectedMime ?: $mimeType;
    
    // Cache headers
    $etag = '"' . md5($binaryData) . '"';
    header('Content-Type: ' . $mimeType);
    header('Cache-Control: public, max-age=31536000');
    header('ETag: ' . $etag);
    
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
        http_response_code(304);
        exit;
    }
    
    echo $binaryData;
    
} catch (PDOException $e) {
    http_response_code(500);
    error_log("Database error: " . $e->getMessage());
    exit('Database error');
}

/**
 * Serve image file with proper headers and caching
 */
function serveImage(string $filePath, bool $convertToBase64 = false): void
{
    if (!file_exists($filePath) || !is_readable($filePath)) {
        http_response_code(404);
        exit('Image file not accessible');
    }
    
    $mimeType = mime_content_type($filePath);
    $fileSize = filesize($filePath);
    $etag = '"' . md5_file($filePath) . '"';
    
    // Cache headers
    header('Cache-Control: public, max-age=31536000');
    header('ETag: ' . $etag);
    header('X-Cached: filesystem');
    
    // Check if client has cached version
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
        http_response_code(304);
        exit;
    }
    
    if ($convertToBase64) {
        // Convert to base64 for API response
        header('Content-Type: application/json');
        $binaryData = file_get_contents($filePath);
        echo json_encode([
            'success' => true,
            'image_name' => basename($filePath),
            'base64' => 'data:' . $mimeType . ';base64,' . base64_encode($binaryData),
            'mime_type' => $mimeType,
            'file_size' => $fileSize
        ]);
        exit;
    }
    
    // Serve binary image
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . $fileSize);
    readfile($filePath);
    exit;
}

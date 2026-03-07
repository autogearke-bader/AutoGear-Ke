<?php
require_once 'api/db.php';

// Get the requested path
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$path = ltrim($path, '/');

// Expected format: product-images/imagename.jpg
if (strpos($path, 'product-images/') !== 0) {
    http_response_code(404);
    exit('Not found');
}

$imageName = substr($path, strlen('product-images/'));

// Cache directory
$cacheDir = __DIR__ . '/cache/';
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

$cacheFile = $cacheDir . $imageName;

// Check if cached
if (file_exists($cacheFile)) {
    $mime = mime_content_type($cacheFile);
    $etag = '"' . md5_file($cacheFile) . '"';
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=31536000'); // 1 year
    header('ETag: ' . $etag);
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
        http_response_code(304);
        exit;
    }
    readfile($cacheFile);
    exit;
}

// Fetch from database
try {
    $stmt = $pdo->prepare("SELECT pi.image_data, pi.alt_text FROM product_images pi WHERE pi.image_name = ?");
    $stmt->execute([$imageName]);
    $image = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$image) {
        http_response_code(404);
        exit('Image not found');
    }

    // Determine MIME type from image data
    $finfo = finfo_open();
    $mime = finfo_buffer($finfo, $image['image_data'], FILEINFO_MIME_TYPE);
    finfo_close($finfo);

    // Save to cache
    file_put_contents($cacheFile, $image['image_data']);

    // Serve
    $etag = '"' . md5($image['image_data']) . '"';
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=31536000'); // 1 year
    header('ETag: ' . $etag);
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
        http_response_code(304);
        exit;
    }
    echo $image['image_data'];

} catch (PDOException $e) {
    http_response_code(500);
    exit('Database error');
}
?>
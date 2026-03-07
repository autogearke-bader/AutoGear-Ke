<?php
require_once 'api/db.php';

// Get image name from URL
$imageName = $_GET['name'] ?? '';
if (empty($imageName)) {
    http_response_code(400);
    exit('Image name required');
}

// Fetch image from database
try {
    $stmt = $pdo->prepare("SELECT image_data, alt_text FROM product_images WHERE image_name = ?");
    $stmt->execute([$imageName]);
    $image = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$image) {
        http_response_code(404);
        exit('Image not found');
    }

    // Determine MIME type from extension
    $extension = strtolower(pathinfo($imageName, PATHINFO_EXTENSION));
    $mimeTypes = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp'
    ];
    $mime = $mimeTypes[$extension] ?? 'image/jpeg';

    // Set headers
    $etag = '"' . md5($image['image_data']) . '"';
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=31536000'); // Cache for 1 year
    header('ETag: ' . $etag);
    header('Content-Length: ' . strlen($image['image_data']));
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
        http_response_code(304);
        exit;
    }

    // Output image data
    echo $image['image_data'];
} catch (PDOException $e) {
    http_response_code(500);
    exit('Database error');
}
?>
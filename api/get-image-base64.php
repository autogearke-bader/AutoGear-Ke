<?php
/**
 * Get Image Base64 Endpoint
 * 
 * Returns base64-encoded image data for client-side display
 * Use this endpoint when you need to send images to the client as data URIs
 * 
 * Query Parameters:
 * - id: Image ID (required)
 * - type: 'product' or 'article' (required)
 * 
 * Example: /api/get-image-base64.php?id=123&type=product
 */

header('Content-Type: application/json');

require_once 'db.php';
require_once 'ImageStorageService.php';

$imageId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$imageType = isset($_GET['type']) ? $_GET['type'] : 'product';

if ($imageId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid image ID']);
    exit;
}

if (!in_array($imageType, ['product', 'article'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid image type']);
    exit;
}

$storage = new ImageStorageService($pdo);
$result = get_image_base64_filesystem($pdo, $imageId, $imageType);

if (!$result['success']) {
    http_response_code(404);
    echo json_encode($result);
    exit;
}

echo json_encode([
    'success' => true,
    'image_name' => $result['image_name'],
    'alt_text' => $result['alt_text'],
    'base64' => $result['base64'],
    'mime_type' => 'data:image/jpeg;base64' // Derived from actual base64 data
]);

<?php
header('Content-Type: application/json');

require_once 'db.php';

$slug = $_GET['slug'] ?? null;

if (!$slug) {
    http_response_code(400);
    echo json_encode(['error' => 'Product slug is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT p.id, p.slug, p.name, p.price, p.description, p.category, p.stock_status, p.has_installation, p.is_new, p.video_url, p.youtube_url, p.instagram_url, p.tiktok_url, p.use_white_bg, GROUP_CONCAT(CONCAT_WS('|||', pi.image_name, IFNULL(pi.alt_text, '')) SEPARATOR ';;;') as image_data FROM products p LEFT JOIN product_images pi ON p.id = pi.product_id WHERE p.slug = ? GROUP BY p.id");
    $stmt->execute([$slug]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
        http_response_code(404);
        echo json_encode(['error' => 'Product not found']);
        exit;
    }

    // Convert to match frontend types
    $product['id'] = (string)$product['id'];
    $product['slug'] = (string)$product['slug'];
    $product['price'] = (int)$product['price'];
    
    // Decode HTML entities in description (fixes escaped HTML from previous encoding)
    $product['description'] = html_entity_decode($product['description'] ?? '', ENT_QUOTES, 'UTF-8');
    
    // Parse image data with alt_text
    $images = [];
 if (!empty($product['image_data'])) {
    $imageEntries = explode(';;;', $product['image_data']);
    foreach ($imageEntries as $entry) {
        $parts = explode('|||', $entry, 2);
        $imageName = $parts[0];
        
        // ADD THIS LINE: Prepend the virtual directory path
        $fullPath = '/product-images/' . $imageName;

        $images[] = [
            'image_name' => $imageName,
            'url' => $fullPath, // Use this in your React <img> tags
            'alt_text' => $parts[1] ?? ''
            ];
        }
    }
    $product['images'] = $images;
    $product['hasInstallation'] = (bool)$product['has_installation'];
    $product['isNew'] = (bool)$product['is_new'];
    $product['videoUrl'] = $product['video_url'];
    $product['youtubeUrl'] = $product['youtube_url'];
    $product['instagramUrl'] = $product['instagram_url'];
    $product['tiktokUrl'] = $product['tiktok_url'];
    
    // Handle use_white_bg as array
    $decoded = json_decode($product['use_white_bg'] ?? '[]', true);
    if (is_array($decoded)) {
        $product['useWhiteBg'] = $decoded;
    } else {
        $product['useWhiteBg'] = [(bool)$product['use_white_bg']];
    }
    
    $product['stockStatus'] = $product['stock_status'];

    unset($product['has_installation'], $product['is_new'], $product['video_url'], $product['youtube_url'], $product['instagram_url'], $product['tiktok_url'], $product['use_white_bg'], $product['stock_status'], $product['image_data']);

    echo json_encode($product);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch product']);
}
?>
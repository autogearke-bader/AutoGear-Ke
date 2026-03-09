<?php
header('Content-Type: application/json');

require_once 'db.php';
require_once 'security.php';
require_once 'ImageStorageService.php';

session_start();
if (!isset($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$featuredImage = $input['featuredImage'] ?? null;

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

error_log('Add product input: ' . json_encode($input));

$name = trim($input['name'] ?? '');
$price = $input['price'] ?? null;
$description = sanitize_content($input['description'] ?? '');
$category = trim($input['category'] ?? '');
$stockStatus = $input['stockStatus'] ?? 'in-stock';
$hasInstallation = $input['hasInstallation'] ?? false;
$isNew = $input['isNew'] ?? false;
$videoUrl = trim($input['videoUrl'] ?? '');
$youtubeUrl = trim($input['youtubeUrl'] ?? '');
$instagramUrl = trim($input['instagramUrl'] ?? '');
$tiktokUrl = trim($input['tiktokUrl'] ?? '');
$useWhiteBg = json_encode($input['useWhiteBg'] ?? []);

if (empty($name) || $price === null || !is_numeric($price) || $price < 0 || empty($category) || !in_array($stockStatus, ['in-stock', 'limited', 'out-of-stock'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input data']);
    exit;
}

// Validate URLs if provided
if (!empty($youtubeUrl) && !filter_var($youtubeUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid YouTube URL']);
    exit;
}
if (!empty($instagramUrl) && !filter_var($instagramUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid Instagram URL']);
    exit;
}
if (!empty($tiktokUrl) && !filter_var($tiktokUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid TikTok URL']);
    exit;
}

// Generate slug
$baseSlug = generateSlug($name);
$slug = generateUniqueSlug($pdo, $baseSlug);

try {
    $stmt = $pdo->prepare("INSERT INTO products (slug, name, price, description, category, stock_status, has_installation, is_new, video_url, youtube_url, instagram_url, tiktok_url, use_white_bg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$slug, $name, $price, $description, $category, $stockStatus, $hasInstallation ? 1 : 0, $isNew ? 1 : 0, $videoUrl, $youtubeUrl, $instagramUrl, $tiktokUrl, $useWhiteBg ? 1 : 0]);
    
    $productId = $pdo->lastInsertId();
    
    // Validate the ID was actually created
    if (!$productId || $productId < 1) {
        error_log('add-product.php ERROR: Invalid ID returned from lastInsertId: ' . var_export($productId, true));
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to create product - invalid ID generated'
        ]);
        exit;
    }
    
    error_log('add-product.php SUCCESS: Created product with ID ' . $productId);
    
    // Process featured image if provided
    $imageFilename = null;
    $imageMetadata = [];
    
    if (!empty($featuredImage)) {
        $imageInput = [
            'base64' => $featuredImage
        ];
        
        $imageResult = process_uploaded_image_filesystem(
            $imageInput,
            $name,
            'product',
            false,
            $pdo
        );
        
        if (!$imageResult['success']) {
            error_log('Product image upload failed: ' . $imageResult['error']);
        } else {
            $imageFilename = $imageResult['filename'];
            $imageMetadata = $imageResult['metadata'] ?? [];
            
            $uploadResult = upload_image_to_database_filesystem(
                $pdo,
                (int)$productId,
                $imageFilename,
                $name,
                'product',
                $imageMetadata
            );
            
            if (!$uploadResult['success']) {
                error_log('Failed to store product image metadata: ' . $uploadResult['error']);
            }
        }
    }
    
    // Send response ONCE
    echo json_encode([
        'success' => true, 
        'id' => (int)$productId,
        'slug' => $slug
    ]);
    
} catch (PDOException $e) {
    error_log('Add product error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to add product: ' . $e->getMessage()]);
}
?>
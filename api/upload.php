<?php
/**
 * Secure Image Upload Endpoint - Filesystem Storage
 * AutoGear Ke - Security Hardened
 * 
 * Features:
 * - Base64, URL, and file upload support
 * - Automatic compression to optimize file size
 * - Stores images on filesystem, not in database
 * - Stores only file references in database
 * - Base64 conversion only for display/transmission to client
 */

header('Content-Type: application/json');

// Load security functions and database
require_once 'security.php';
require_once 'db.php';
require_once 'ImageStorageService.php';

// Require admin authentication
require_admin_auth();

// Require CSRF token validation
require_csrf_validation();

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get POST data
$jsonData = json_decode(file_get_contents('php://input'), true);
$data = [];

// Determine if this is a JSON request or Multipart form request
if ($jsonData) {
    $data = $jsonData;
} elseif (!empty($_POST) || !empty($_FILES)) {
    $data = $_POST;
    if (!empty($_FILES['image'])) {
        $data['image'] = $_FILES['image'];
    }
    if (!empty($_FILES['file'])) {
         $data['image'] = $_FILES['file'];
    }
}

if (empty($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data provided']);
    exit;
}

// Determine upload type: 'product' or 'article'
// Determine upload type: 'product' or 'article'
$uploadType = $data['type'] ?? 'product';

// Initialize storage service
$storage = new ImageStorageService($pdo);

if ($uploadType === 'article') {
    // ========== ARTICLE IMAGE UPLOAD ==========
    $articleId = (int)($data['articleId'] ?? 0);
    $articleTitle = trim($data['productName'] ?? $data['articleTitle'] ?? '');
    $altText = trim($data['altText'] ?? '');
    
    // Debug logging
    error_log('[upload.php] ===== ARTICLE IMAGE UPLOAD START =====');
    error_log('[upload.php] Article ID received: ' . var_export($articleId, true));
    error_log('[upload.php] Article ID type: ' . gettype($articleId));
    error_log('[upload.php] POST data keys: ' . implode(', ', array_keys($data)));
    
    // Validate article ID
    if ($articleId === 0 || $articleId < 1) {
        error_log('[upload.php] ERROR: Invalid article ID: ' . $articleId);
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Valid article ID is required. Received: ' . $articleId
        ]);
        exit;
    }
    
    // Verify article exists in database
    try {
        $stmt = $pdo->prepare("SELECT id FROM articles WHERE id = ?");
        $stmt->execute([$articleId]);
        if (!$stmt->fetch()) {
            error_log('[upload.php] Article ID ' . $articleId . ' does not exist in database');
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => "Article ID {$articleId} not found in database"
            ]);
            exit;
        }
    } catch (PDOException $e) {
        error_log('[upload.php] Database error verifying article: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database error verifying article'
        ]);
        exit;
    }
    
    if (empty($articleTitle)) {
        http_response_code(400);
        echo json_encode(['error' => 'Article title is required for image naming']);
        exit;
    }
    
    if (empty($altText)) {
        $altText = $articleTitle;
    }
    
    $useWhiteBg = false; // Articles don't use white background
    
    // Prepare input for processing
    $input = [];
    if (!empty($data['base64'])) {
        $input['base64'] = $data['base64'];
    } elseif (!empty($data['imageUrl'])) {
        $input['url'] = $data['imageUrl'];
    } elseif (!empty($data['image'])) {
        $input['file'] = $data['image'];
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'No image data provided']);
        exit;
    }
    
    // Process the image
    $result = process_uploaded_image_filesystem($input, $articleTitle, 'article', $useWhiteBg, $pdo);
    
    if (!$result['success']) {
        http_response_code(400);
        echo json_encode(['error' => $result['error']]);
        exit;
    }
    
    // Upload to database
    $dbResult = upload_image_to_database_filesystem($pdo, $articleId, $result['filename'], $altText, 'article', $result['metadata']);
    
    if (!$dbResult['success']) {
        $cleanupSuccess = $storage->deleteFile($result['filename'], 'article');
        
        log_security_event('article_image_cleanup', 'Cleaned up orphaned file after database failure', [
            'article_id' => $articleId,
            'filename' => $result['filename'],
            'cleanup_success' => $cleanupSuccess
        ]);
        
        http_response_code(500);
        echo json_encode(['error' => $dbResult['error']]);
        exit;
    }
    
    log_security_event('article_image_uploaded', 'Article image uploaded', [
        'article_id' => $articleId,
        'filename' => $result['filename'],
        'file_size' => $result['metadata']['file_size'] ?? 0
    ]);
    
    $fileUrl = $storage->getFileUrl($result['filename'], 'article');
    
    echo json_encode([
        'success' => true,
        'image_name' => $result['filename'],
        'imageId' => $dbResult['imageId'],
        'type' => 'article',
        'file_url' => $fileUrl,
        'file_size' => $result['metadata']['file_size'] ?? 0,
        'dimensions' => [
            'width' => $result['metadata']['width'] ?? 0,
            'height' => $result['metadata']['height'] ?? 0
        ]
    ]);
    
} else {
    // ========== PRODUCT IMAGE UPLOAD ==========
    $productId = (int)($data['productId'] ?? 0);
    $productName = trim($data['productName'] ?? '');
    $altText = trim($data['altText'] ?? '');
    $useWhiteBg = isset($data['useWhiteBg']) && $data['useWhiteBg'] === '1';
    
    // Debug logging
    error_log('[upload.php] ===== PRODUCT IMAGE UPLOAD START =====');
    error_log('[upload.php] Product ID received: ' . var_export($productId, true));
    error_log('[upload.php] Product ID type: ' . gettype($productId));
    error_log('[upload.php] POST data keys: ' . implode(', ', array_keys($data)));
    error_log('[upload.php] Full data: ' . json_encode($data));
    
    // Validate product ID
    if ($productId === 0 || $productId < 1) {
        error_log('[upload.php] ERROR: Invalid product ID: ' . $productId);
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Valid product ID is required. Received: ' . $productId
        ]);
        exit;
    }
    
    // Verify product exists in database
    try {
        $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        if (!$stmt->fetch()) {
            error_log('[upload.php] Product ID ' . $productId . ' does not exist in database');
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => "Product ID {$productId} not found in database"
            ]);
            exit;
        }
    } catch (PDOException $e) {
        error_log('[upload.php] Database error verifying product: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database error verifying product'
        ]);
        exit;
    }
    
    if (empty($productName)) {
        http_response_code(400);
        echo json_encode(['error' => 'Product name is required for image naming']);
        exit;
    }
    
    if (empty($altText)) {
        $altText = $productName;
    }
    
    // Prepare input for processing
    $input = [];
    if (!empty($data['base64'])) {
        $input['base64'] = $data['base64'];
    } elseif (!empty($data['imageUrl'])) {
        $input['url'] = $data['imageUrl'];
    } elseif (!empty($data['image'])) {
        $input['file'] = $data['image'];
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'No image data provided']);
        exit;
    }
    
    // Process the image
    $result = process_uploaded_image_filesystem($input, $productName, 'product', $useWhiteBg, $pdo);
    
    if (!$result['success']) {
        http_response_code(400);
        echo json_encode(['error' => $result['error']]);
        exit;
    }
    
    // Upload to database
    $dbResult = upload_image_to_database_filesystem($pdo, $productId, $result['filename'], $altText, 'product', $result['metadata']);
    
    if (!$dbResult['success']) {
        $cleanupSuccess = $storage->deleteFile($result['filename'], 'product');
        
        log_security_event('product_image_cleanup', 'Cleaned up orphaned file after database failure', [
            'product_id' => $productId,
            'filename' => $result['filename'],
            'cleanup_success' => $cleanupSuccess
        ]);
        
        http_response_code(500);
        echo json_encode(['error' => $dbResult['error']]);
        exit;
    }
    
    log_security_event('product_image_uploaded', 'Product image uploaded', [
        'product_id' => $productId,
        'filename' => $result['filename'],
        'file_size' => $result['metadata']['file_size'] ?? 0
    ]);
    
    $fileUrl = $storage->getFileUrl($result['filename'], 'product');
    
    echo json_encode([
        'success' => true,
        'image_name' => $result['filename'],
        'imageId' => $dbResult['imageId'],
        'type' => 'product',
        'file_url' => $fileUrl,
        'file_size' => $result['metadata']['file_size'] ?? 0,
        'dimensions' => [
            'width' => $result['metadata']['width'] ?? 0,
            'height' => $result['metadata']['height'] ?? 0
        ]
    ]);
}
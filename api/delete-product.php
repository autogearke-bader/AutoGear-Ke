<?php
/**
 * Delete Product Endpoint - Secure Version with Filesystem Support
 * AutoGear Ke - Security Hardened
 */

header('Content-Type: application/json');

// Load security functions
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
    echo json_encode(['error' => 'Method not allowed', 'message' => 'Only POST requests are accepted']);
    exit;
}

// Get and validate input
$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON', 'message' => 'Request body must be valid JSON']);
    exit;
}

$id = $input['id'] ?? null;

// Validate ID is numeric
if (!$id || !is_numeric($id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid product ID', 'message' => 'Product ID must be a valid number']);
    exit;
}

// Ensure integer ID for database primary key
$id = (int)$id;

// Initialize storage service
$storage = new ImageStorageService($pdo);

try {
    // Start transaction for atomic operations
    $pdo->beginTransaction();

    // Fetch product images first
    $stmt = $pdo->prepare("SELECT id, image_name, file_path FROM product_images WHERE product_id = ?");
    $stmt->execute([$id]);
    $imageRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch main product record
    $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Product not found', 'message' => 'No product found with the given ID']);
        exit;
    }

    // 1. Delete image files from filesystem
    $filesDeleted = 0;
    foreach ($imageRecords as $image) {
        $filename = !empty($image['file_path']) ? $image['file_path'] : $image['image_name'];
        if ($storage->deleteFile($filename, 'product')) {
            $filesDeleted++;
        }
    }

    // 2. Delete image records from database (CASCADE should handle this, but be explicit)
    $stmt = $pdo->prepare("DELETE FROM product_images WHERE product_id = ?");
    $stmt->execute([$id]);
    $imagesDeleted = $stmt->rowCount();

    // 3. Clean up featured_items table references for this product
    $stmt = $pdo->prepare("DELETE FROM featured_items WHERE type = 'trending' AND item_id = ?");
    $stmt->execute([$id]);
    $featuredItemsCleaned = $stmt->rowCount();

    // 4. Clean up articles that reference this product in related_products
    $stmt = $pdo->prepare("SELECT id, related_products FROM articles WHERE related_products LIKE ?");
    $stmt->execute(['%"' . $id . '"%']);
    $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($articles as $article) {
        if (!empty($article['related_products'])) {
            $relatedProducts = json_decode($article['related_products'], true);
            if (is_array($relatedProducts)) {
                $relatedProducts = array_values(array_filter($relatedProducts, function($pid) use ($id) {
                    return (string)$pid !== (string)$id;
                }));
                
                $stmt = $pdo->prepare("UPDATE articles SET related_products = ? WHERE id = ?");
                $stmt->execute([json_encode($relatedProducts), $article['id']]);
            }
        }
    }

    // 5. Delete the product
    $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $productDeleted = $stmt->rowCount();

    // Commit transaction
    $pdo->commit();

    log_security_event('product_deleted', 'Product deleted successfully', [
        'product_id' => $id,
        'images_deleted' => $imagesDeleted,
        'files_deleted' => $filesDeleted,
        'admin_ip' => get_client_ip()
    ]);

    echo json_encode([
        'success' => true, 
        'message' => 'Product and all associated data deleted successfully',
        'deleted' => [
            'product_id' => $id,
            'product_deleted' => $productDeleted > 0,
            'images_deleted' => $imagesDeleted,
            'files_deleted_from_disk' => $filesDeleted,
            'featured_items_cleaned' => $featuredItemsCleaned,
            'article_references_cleaned' => count($articles)
        ]
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Product delete error: " . $e->getMessage());
    log_security_event('product_delete_error', 'Database error during product deletion', [
        'product_id' => $id,
        'error' => $e->getMessage()
    ]);
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to delete product', 
        'message' => 'Database error occurred while deleting product'
    ]);
}

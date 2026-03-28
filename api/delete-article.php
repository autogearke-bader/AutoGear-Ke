<?php
header('Content-Type: application/json');

require_once 'db.php';

session_start();
if (!isset($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized', 'message' => 'Admin authentication required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed', 'message' => 'Only POST requests are accepted']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON', 'message' => 'Request body must be valid JSON']);
    exit;
}

$id = (int)($data['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid article ID', 'message' => 'Article ID must be a positive number']);
    exit;
}

try {
    // Start transaction for atomic operations
    $pdo->beginTransaction();

    // Fetch article details first for cleanup
    $stmt = $pdo->prepare("SELECT id, slug, title, featured_image FROM articles WHERE id = ?");
    $stmt->execute([$id]);
    $article = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$article) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Article not found', 'message' => 'No article found with the given ID']);
        exit;
    }

    $cleanupDetails = [
        'article_id' => $id,
        'article_slug' => $article['slug'],
        'article_title' => $article['title'],
        'featured_image_deleted' => false,
        'featured_items_cleaned' => 0
    ];

    // 1. Delete featured image file if exists
    if (!empty($article['featured_image'])) {
        $imagePath = __DIR__ . '/../' . ltrim($article['featured_image'], '/');
        if (file_exists($imagePath)) {
            if (@unlink($imagePath)) {
                $cleanupDetails['featured_image_deleted'] = true;
            } else {
                error_log("Failed to delete featured image: " . $imagePath);
            }
        }
    }

    // 2. Clean up featured_items table references for this article
    // Check all featured types for articles
    $stmt = $pdo->prepare("DELETE FROM featured_items WHERE item_id = ? AND type IN ('featured_article', 'featured_car_article', 'featured_mobile_article')");
    $stmt->execute([$id]);
    $cleanupDetails['featured_items_cleaned'] = $stmt->rowCount();

    // 3. Delete the article
    $stmt = $pdo->prepare("DELETE FROM articles WHERE id = ?");
    $stmt->execute([$id]);
    $articleDeleted = $stmt->rowCount();

    if ($articleDeleted === 0) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Article deletion failed', 'message' => 'Could not delete the article']);
        exit;
    }

    // Commit transaction
    $pdo->commit();

    echo json_encode([
        'success' => true, 
        'message' => 'Article and all associated data deleted successfully',
        'deleted' => $cleanupDetails
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Article delete error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to delete article', 
        'message' => 'Database error occurred while deleting article',
        'details' => $e->getMessage()
    ]);
}
?>

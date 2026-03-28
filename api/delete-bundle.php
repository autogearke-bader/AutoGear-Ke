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

$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON', 'message' => 'Request body must be valid JSON']);
    exit;
}

$id = $input['id'] ?? null;
if (!$id || !is_numeric($id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid bundle ID', 'message' => 'Bundle ID must be a valid number']);
    exit;
}

// Ensure integer ID for database primary key
$id = (int)$id;

try {
    // Start transaction for atomic operations
    $pdo->beginTransaction();

    // Verify bundle exists
    $stmt = $pdo->prepare("SELECT id, name FROM bundles WHERE id = ?");
    $stmt->execute([$id]);
    $bundle = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$bundle) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Bundle not found', 'message' => 'No bundle found with the given ID']);
        exit;
    }

    // 1. Clean up featured_items table references for this bundle
    $stmt = $pdo->prepare("DELETE FROM featured_items WHERE type = 'value_bundle' AND item_id = ?");
    $stmt->execute([$id]);
    $featuredCleaned = $stmt->rowCount();

    // 2. Clean up articles that reference this bundle in related_bundles
    $stmt = $pdo->prepare("SELECT id, related_bundles FROM articles WHERE related_bundles LIKE ?");
    $stmt->execute(['%"' . $id . '"%']);
    $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $articlesCleaned = 0;
    
    foreach ($articles as $article) {
        if (!empty($article['related_bundles'])) {
            $relatedBundles = json_decode($article['related_bundles'], true);
            if (is_array($relatedBundles)) {
                // Remove this bundle ID from the array
                $relatedBundles = array_values(array_filter($relatedBundles, function($bid) use ($id) {
                    return (string)$bid !== (string)$id;
                }));
                
                $stmt = $pdo->prepare("UPDATE articles SET related_bundles = ? WHERE id = ?");
                $stmt->execute([json_encode($relatedBundles), $article['id']]);
                $articlesCleaned++;
            }
        }
    }

    // 3. Delete the bundle
    $stmt = $pdo->prepare("DELETE FROM bundles WHERE id = ?");
    $stmt->execute([$id]);
    $bundleDeleted = $stmt->rowCount();

    // Commit transaction
    $pdo->commit();

    echo json_encode([
        'success' => true, 
        'message' => 'Bundle and all associated data deleted successfully',
        'deleted' => [
            'bundle_id' => $id,
            'bundle_name' => $bundle['name'],
            'bundle_deleted' => $bundleDeleted > 0,
            'featured_items_cleaned' => $featuredCleaned,
            'article_references_cleaned' => $articlesCleaned
        ]
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Bundle delete error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to delete bundle', 
        'message' => 'Database error occurred while deleting bundle',
        'details' => $e->getMessage()
    ]);
}
?>

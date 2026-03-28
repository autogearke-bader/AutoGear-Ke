<?php
header('Content-Type: application/json');

require_once 'db.php';

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

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$trending = $input['trending'] ?? [];
$valueBundles = $input['valueBundles'] ?? [];

if (!is_array($trending) || !is_array($valueBundles)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data format']);
    exit;
}

try {
    // Start transaction for atomic operations
    $pdo->beginTransaction();

    // Clear existing featured items (only trending and value_bundle types)
    $stmt = $pdo->prepare("DELETE FROM featured_items WHERE type IN ('trending', 'value_bundle')");
    $stmt->execute();

    // Insert trending products
    if (!empty($trending)) {
        $stmt = $pdo->prepare("INSERT INTO featured_items (type, item_id) VALUES (?, ?)");
        foreach ($trending as $id) {
            // Validate that product exists before inserting
            $checkStmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
            $checkStmt->execute([$id]);
            if ($checkStmt->fetch()) {
                $stmt->execute(['trending', $id]);
            }
        }
    }

    // Insert value bundles
    if (!empty($valueBundles)) {
        $stmt = $pdo->prepare("INSERT INTO featured_items (type, item_id) VALUES (?, ?)");
        foreach ($valueBundles as $id) {
            // Validate that bundle exists before inserting
            $checkStmt = $pdo->prepare("SELECT id FROM bundles WHERE id = ?");
            $checkStmt->execute([$id]);
            if ($checkStmt->fetch()) {
                $stmt->execute(['value_bundle', $id]);
            }
        }
    }

    // Commit transaction
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Featured items updated successfully',
        'updated' => [
            'trending_count' => count($trending),
            'value_bundles_count' => count($valueBundles)
        ]
    ]);
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Update featured error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update featured items']);
}
?>

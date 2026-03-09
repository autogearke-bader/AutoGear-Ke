<?php
header('Content-Type: application/json');

require_once 'db.php';

try {
    $stmt = $pdo->query("SELECT type, item_id FROM featured_items");
    $featured = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $trending = [];
    $valueBundles = [];

    foreach ($featured as $item) {
        if ($item['type'] === 'trending') {
            $trending[] = $item['item_id'];
        } elseif ($item['type'] === 'value_bundle') {
            $valueBundles[] = $item['item_id'];
        }
    }

    echo json_encode([
        'trending' => $trending,
        'valueBundles' => $valueBundles
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch featured items']);
}
?>
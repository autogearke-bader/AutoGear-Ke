<?php
header('Content-Type: application/json');

require_once 'db.php';

try {
    $stmt = $pdo->query("SELECT id, name, products, total_price, original_price, has_installation, category FROM bundles");
    $bundles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Convert to match frontend types
    foreach ($bundles as &$bundle) {
        $bundle['id'] = (string)$bundle['id'];
        $bundle['products'] = json_decode($bundle['products'], true) ?? [];
        $bundle['totalPrice'] = (int)$bundle['total_price'];
        $bundle['originalPrice'] = (int)$bundle['original_price'];
        $bundle['hasInstallation'] = (bool)$bundle['has_installation'];

        unset($bundle['total_price'], $bundle['original_price'], $bundle['has_installation']);
    }

    echo json_encode($bundles);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch bundles']);
}
?>
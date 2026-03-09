<?php
header('Content-Type: application/json');

require_once 'db.php';

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

$id = $input['id'] ?? null;
if (!$id || !is_numeric($id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid bundle ID']);
    exit;
}

$updates = [];
$params = [];

if (isset($input['name'])) {
    $name = trim($input['name']);
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid name']);
        exit;
    }
    $updates[] = 'name = ?';
    $params[] = $name;
}

if (isset($input['products'])) {
    $products = $input['products'];
    if (!is_array($products)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid products']);
        exit;
    }
    $updates[] = 'products = ?';
    $params[] = json_encode($products);
}

if (isset($input['totalPrice'])) {
    $totalPrice = $input['totalPrice'];
    if (!is_numeric($totalPrice) || $totalPrice < 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid total price']);
        exit;
    }
    $updates[] = 'total_price = ?';
    $params[] = $totalPrice;
}

if (isset($input['originalPrice'])) {
    $originalPrice = $input['originalPrice'];
    if (!is_numeric($originalPrice) || $originalPrice < 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid original price']);
        exit;
    }
    $updates[] = 'original_price = ?';
    $params[] = $originalPrice;
}

if (isset($input['hasInstallation'])) {
    $hasInstallation = $input['hasInstallation'];
    $updates[] = 'has_installation = ?';
    $params[] = $hasInstallation ? 1 : 0;
}

if (isset($input['category'])) {
    $category = $input['category'];
    $updates[] = 'category = ?';
    $params[] = $category;
}

if (empty($updates)) {
    http_response_code(400);
    echo json_encode(['error' => 'No fields to update']);
    exit;
}

$params[] = $id;

try {
    $stmt = $pdo->prepare("UPDATE bundles SET " . implode(', ', $updates) . " WHERE id = ?");
    $stmt->execute($params);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update bundle']);
}
?>
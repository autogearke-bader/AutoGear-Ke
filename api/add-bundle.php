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

$name = trim($input['name'] ?? '');
$products = $input['products'] ?? [];
$totalPrice = $input['totalPrice'] ?? null;
$originalPrice = $input['originalPrice'] ?? null;
$hasInstallation = $input['hasInstallation'] ?? false;
$category = $input['category'] ?? null;

if (empty($name) || !is_array($products) || $totalPrice === null || !is_numeric($totalPrice) || $totalPrice < 0 || $originalPrice === null || !is_numeric($originalPrice) || $originalPrice < 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input data']);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO bundles (name, products, total_price, original_price, has_installation, category) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, json_encode($products), $totalPrice, $originalPrice, $hasInstallation ? 1 : 0, $category]);
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to add bundle']);
}
?>
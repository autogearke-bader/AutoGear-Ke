<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

try {
    // Use DISTINCT to prevent duplicate brand entries
    $stmt = $pdo->query("SELECT DISTINCT id, name, slug FROM brands ORDER BY name ASC");
    $brands = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($brands);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch brands']);
}
?>

<?php
header('Content-Type: application/json');
require_once 'db.php';

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 1;

try {
    // We now use the actual column from your screenshot: is_featured_mobile
    $query = "SELECT id, slug, title, featured_image, excerpt, category, brand, published_at 
              FROM articles 
              WHERE is_published > 0 AND is_featured_mobile > 0 
              ORDER BY published_at DESC 
              LIMIT $limit";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($articles ?: []);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
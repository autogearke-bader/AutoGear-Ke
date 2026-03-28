<?php
header('Content-Type: application/json');

require_once 'db.php';

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

try {
    $query = "SELECT id, slug, title, featured_image, excerpt, category, brand, published_at 
              FROM articles 
              WHERE is_published > 0 AND is_featured > 0 
              ORDER BY published_at DESC 
              LIMIT ? OFFSET ?";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$limit, $offset]);
    $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($articles);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch featured articles: ' . $e->getMessage()]);
}
?>

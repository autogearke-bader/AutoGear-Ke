<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 

require_once 'db.php';

// Default to 2 articles for the homepage hero/featured section
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 2;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

try {
    // 1. We use '>' instead of '=' so statuses 1, 2, or 3 all count as "Visible"
    // 2. We specifically target the is_featured_homepage column from your screenshot
    $query = "SELECT id, slug, title, featured_image, excerpt, category, brand, published_at 
              FROM articles 
              WHERE is_published > 0 
              AND is_featured_homepage > 0 
              ORDER BY published_at DESC 
              LIMIT $limit OFFSET $offset";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Always return an array, even if empty, so React doesn't crash
    echo json_encode($articles ?: []);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Homepage fetch failed: ' . $e->getMessage()]);
}
?>
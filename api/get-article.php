<?php
header('Content-Type: application/json');

require_once 'db.php';

// Get article by slug
$slug = $_GET['slug'] ?? '';

if (empty($slug)) {
    http_response_code(400);
    echo json_encode(['error' => 'Article slug is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT a.*, 
            GROUP_CONCAT(CONCAT_WS('|||', ai.image_name, IFNULL(ai.alt_text, '')) SEPARATOR ';;;') as image_data 
        FROM articles a 
        LEFT JOIN article_images ai ON a.id = ai.article_id 
        WHERE a.slug = ? AND a.is_published = 1
        GROUP BY a.id
    ");
    $stmt->execute([$slug]);
    $article = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$article) {
        http_response_code(404);
        echo json_encode(['error' => 'Article not found']);
        exit;
    }
    
    // Decode JSON fields
    $article['related_products'] = !empty($article['related_products']) ? json_decode($article['related_products'], true) : [];
    $article['related_bundles'] = !empty($article['related_bundles']) ? json_decode($article['related_bundles'], true) : [];
    
    // Decode HTML entities in content (fixes escaped HTML from previous encoding)
    $article['content'] = html_entity_decode($article['content'] ?? '', ENT_QUOTES, 'UTF-8');
    
    // Parse article images with full URL paths
    $baseUrl = isset($_SERVER['HTTP_HOST']) ? 'https://' . $_SERVER['HTTP_HOST'] : '';
    $articleImages = [];
    if (!empty($article['image_data'])) {
        $imageEntries = explode(';;;', $article['image_data']);
        foreach ($imageEntries as $entry) {
            $parts = explode('|||', $entry, 2);
            $imageName = trim($parts[0]);
            if (!empty($imageName)) {
                $fullPath = $baseUrl . '/article-images/' . $imageName;
                $articleImages[] = [
                    'image_name' => $imageName,
                    'url' => $fullPath,
                    'alt_text' => trim($parts[1] ?? '')
                ];
            }
        }
    }
    $article['images'] = $articleImages;
    unset($article['image_data']);
    
    echo json_encode($article);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch article: ' . $e->getMessage()]);
}
?>

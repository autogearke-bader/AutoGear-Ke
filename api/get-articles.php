<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

// Get optional filters
$brand = $_GET['brand'] ?? null;
$brands = isset($_GET['brands']) ? explode(',', $_GET['brands']) : null;
$category = $_GET['category'] ?? null;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

try {
    // Base query to get articles with their brands
    $query = "
        SELECT a.*, 
            GROUP_CONCAT(DISTINCT CASE WHEN ab.brand_id IS NOT NULL THEN b.id ELSE NULL END) as brand_ids,
            GROUP_CONCAT(DISTINCT CASE WHEN ab.brand_id IS NOT NULL THEN b.name ELSE NULL END) as brand_names,
            GROUP_CONCAT(DISTINCT CONCAT_WS('|||', ai.image_name, IFNULL(ai.alt_text, '')) SEPARATOR ';;;') as image_data
        FROM articles a
        LEFT JOIN article_brands ab ON a.id = ab.article_id
        LEFT JOIN brands b ON ab.brand_id = b.id
        LEFT JOIN article_images ai ON a.id = ai.article_id
        WHERE 1=1
    ";
    $params = [];
    
    // Filter by single brand (legacy support)
    if (!empty($brand) && $brand !== 'All') {
        $query .= " AND (b.slug = ? OR b.name = ?)";
        $params[] = $brand;
        $params[] = $brand;
    }
    
    // Filter by multiple brands
    if (!empty($brands) && is_array($brands)) {
        $placeholders = [];
        foreach ($brands as $index => $b) {
            if (!empty($b) && $b !== 'All') {
                $placeholders[] = "(b.slug = ? OR b.name = ?)";
                $params[] = $b;
                $params[] = $b;
            }
        }
        if (!empty($placeholders)) {
            $query .= " AND (" . implode(' OR ', $placeholders) . ")";
        }
    }
    
    // Filter by category
    if (!empty($category) && $category !== 'All') {
        $query .= " AND a.category = ?";
        $params[] = $category;
    }
    
    $query .= " GROUP BY a.id ORDER BY a.updated_at DESC LIMIT $limit OFFSET $offset";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Ensure we return an empty array [] instead of null if no articles found
    if (!$articles) {
        echo json_encode([]);
        exit;
    }

    foreach ($articles as &$article) {
        $article['related_products'] = !empty($article['related_products']) ? json_decode($article['related_products'], true) : [];
        $article['related_bundles'] = !empty($article['related_bundles']) ? json_decode($article['related_bundles'], true) : [];
        
        // Decode HTML entities in content (fixes escaped HTML from previous encoding)
        $article['content'] = html_entity_decode($article['content'] ?? '', ENT_QUOTES, 'UTF-8');
        
        // Parse brand_ids and brand_names
        if (!empty($article['brand_ids'])) {
            $article['brand_ids'] = array_filter(array_map('intval', explode(',', $article['brand_ids'])));
        } else {
            $article['brand_ids'] = [];
        }
        
        if (!empty($article['brand_names'])) {
            $article['brand_names'] = array_filter(array_map('trim', explode(',', $article['brand_names'])));
        } else {
            $article['brand_names'] = [];
        }
        
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
    }
    
    echo json_encode($articles);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database Error: ' . $e->getMessage()]);
}
?>

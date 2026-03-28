<?php
/**
 * Update Article Endpoint - Secure Version
 * AutoGear Ke - Security Hardened
 */

header('Content-Type: application/json');

// Load security functions
require_once 'security.php';
require_once 'db.php';

// Require admin authentication
require_admin_auth();

// Require CSRF token validation
require_csrf_validation();

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

$id = (int)($data['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid article ID is required']);
    exit;
}

// Sanitize and validate input
$title = trim($data['title'] ?? '');
$featuredImage = trim($data['featuredImage'] ?? '');
$content = $data['content'] ?? '';
$excerpt = trim($data['excerpt'] ?? '');
$metaDescription = trim($data['metaDescription'] ?? '');
$seoKeywords = trim($data['seoKeywords'] ?? '');
$category = trim($data['category'] ?? '');
$categoryId = null;
$brands = $data['brands'] ?? [];
$brandNames = $data['brandNames'] ?? [];
$relatedProducts = json_encode($data['relatedProducts'] ?? []);
$relatedBundles = json_encode($data['relatedBundles'] ?? []);
$isPublished = isset($data['isPublished']) && $data['isPublished'] ? 1 : 0;
$isFeaturedHomepage = isset($data['isFeaturedHomepage']) && $data['isFeaturedHomepage'] ? 1 : 0;
$isFeaturedCar = isset($data['isFeaturedCar']) && $data['isFeaturedCar'] ? 1 : 0;
$isFeaturedMobile = isset($data['isFeaturedMobile']) && $data['isFeaturedMobile'] ? 1 : 0;

// Validate required fields
if (empty($title)) {
    http_response_code(400);
    echo json_encode(['error' => 'Article title is required']);
    exit;
}

// Sanitize fields using HTML Purifier (for rich content) and basic sanitization
$title = sanitize_html($title);
$featuredImage = htmlspecialchars($featuredImage, ENT_QUOTES | ENT_HTML5, 'UTF-8');
$content = sanitize_content($content);  // Uses HTML Purifier for rich text
$excerpt = sanitize_html($excerpt);
$metaDescription = sanitize_meta_description($metaDescription);  // Plain text only
$seoKeywords = htmlspecialchars($seoKeywords, ENT_QUOTES | ENT_HTML5, 'UTF-8');
$category = htmlspecialchars($category, ENT_QUOTES | ENT_HTML5, 'UTF-8');

// Handle new category
if (!empty($category)) {
    $categorySlug = strtolower(trim($category));
    $categorySlug = preg_replace('/[^a-z0-9\s-]/', '', $categorySlug);
    $categorySlug = preg_replace('/[\s-]+/', '-', $categorySlug);
    $categorySlug = trim($categorySlug, '-');
    
    // Check if category exists
    $stmt = $pdo->prepare("SELECT id FROM categories WHERE slug = ?");
    $stmt->execute([$categorySlug]);
    $existingCategory = $stmt->fetch();
    
    if ($existingCategory) {
        $categoryId = $existingCategory['id'];
    } else {
        // Create new category
        $stmt = $pdo->prepare("INSERT INTO categories (name, slug) VALUES (?, ?)");
        $stmt->execute([$category, $categorySlug]);
        $categoryId = $pdo->lastInsertId();
    }
}

// Handle new brands
$brandIds = [];
if (!empty($brandNames) && is_array($brandNames)) {
    foreach ($brandNames as $brandName) {
        $brandName = trim($brandName);
        if (empty($brandName)) continue;
        
        $brandSlug = strtolower(trim($brandName));
        $brandSlug = preg_replace('/[^a-z0-9\s-]/', '', $brandSlug);
        $brandSlug = preg_replace('/[\s-]+/', '-', $brandSlug);
        $brandSlug = trim($brandSlug, '-');
        
        // Check if brand exists
        $stmt = $pdo->prepare("SELECT id FROM brands WHERE slug = ?");
        $stmt->execute([$brandSlug]);
        $existingBrand = $stmt->fetch();
        
        if ($existingBrand) {
            $brandIds[] = $existingBrand['id'];
        } else {
            // Create new brand
            $sanitizedBrandName = sanitize_html($brandName);
            $stmt = $pdo->prepare("INSERT INTO brands (name, slug) VALUES (?, ?)");
            $stmt->execute([$sanitizedBrandName, $brandSlug]);
            $brandIds[] = $pdo->lastInsertId();
        }
    }
}

// Add existing brand IDs
if (!empty($brands) && is_array($brands)) {
    foreach ($brands as $brandIdFromList) {
        $brandIdFromList = (int)$brandIdFromList;
        if ($brandIdFromList > 0 && !in_array($brandIdFromList, $brandIds)) {
            $brandIds[] = $brandIdFromList;
        }
    }
}

// Check if slug needs to be updated
$currentSlug = $data['slug'] ?? '';
$newSlug = generateSlug($title);
$slug = ($currentSlug && strpos($currentSlug, generateSlug($title)) !== false) ? $currentSlug : generateUniqueArticleSlug($pdo, $newSlug, $id);

try {
    $stmt = $pdo->prepare("
        UPDATE articles SET
            slug = ?,
            title = ?,
            featured_image = ?,
            content = ?,
            excerpt = ?,
            meta_description = ?,
            seo_keywords = ?,
            category = ?,
            brand = ?,
            related_products = ?,
            related_bundles = ?,
            is_published = ?,
            is_featured_homepage = ?,
            is_featured_car = ?,
            is_featured_mobile = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ");
    
    $stmt->execute([
        $slug, $title, $featuredImage, $content, $excerpt,
        $metaDescription, $seoKeywords, $category, '',
        $relatedProducts, $relatedBundles, $isPublished, $isFeaturedHomepage, $isFeaturedCar, $isFeaturedMobile, $id
    ]);
    
    // Update article-brand relationships
    // First, remove all existing relationships
    $stmt = $pdo->prepare("DELETE FROM article_brands WHERE article_id = ?");
    $stmt->execute([$id]);
    
    // Then insert new relationships
    if (!empty($brandIds)) {
        foreach ($brandIds as $bid) {
            $stmt = $pdo->prepare("INSERT IGNORE INTO article_brands (article_id, brand_id) VALUES (?, ?)");
            $stmt->execute([$id, $bid]);
        }
    }
    
    log_security_event('article_updated', 'Article updated successfully', [
        'article_id' => $id,
        'slug' => $slug
    ]);
    
    echo json_encode([
        'success' => true,
        'id' => $id,
        'slug' => $slug,
        'message' => 'Article updated successfully'
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update article: ' . $e->getMessage()]);
}



function generateUniqueArticleSlug($pdo, $baseSlug, $excludeId = null) {
    $slug = $baseSlug;
    $counter = 1;
    $originalSlug = $slug;
    
    while (true) {
        $query = "SELECT COUNT(*) FROM articles WHERE slug = ?";
        $params = [$slug];
        if ($excludeId) {
            $query .= " AND id != ?";
            $params[] = $excludeId;
        }
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        if ($stmt->fetchColumn() == 0) {
            break;
        }
        $slug = $originalSlug . '-' . $counter;
        $counter++;
    }
    return $slug;
}

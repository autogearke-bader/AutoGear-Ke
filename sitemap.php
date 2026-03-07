<?php
ob_start();

require_once 'api/db.php';
ob_clean();

header('Content-Type: application/xml; charset=utf-8');

try {
    // Fetch products with their associated images and category via LEFT JOIN
    $stmt = $pdo->prepare("
        SELECT p.slug, p.updated_at, p.name, p.description, p.category, 
               GROUP_CONCAT(pi.image_name) as image_names 
        FROM products p 
        LEFT JOIN product_images pi ON p.id = pi.product_id 
        GROUP BY p.id 
        ORDER BY p.updated_at DESC
    ");
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch all published articles from the articles table
    $stmtBlogs = $pdo->prepare("SELECT slug, updated_at FROM articles WHERE is_published = 1 ORDER BY updated_at DESC");
    $stmtBlogs->execute();
    $blogs = $stmtBlogs->fetchAll(PDO::FETCH_ASSOC);

    // Log sitemap generation stats for monitoring
    error_log("Sitemap generated: " . count($products) . " products, " . count($blogs) . " blog articles");

    echo '<?xml version="1.0" encoding="UTF-8"?>';
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';

    // Homepage: https://autogearke.com (Priority: 1.0, Changefreq: weekly)
    echo '<url>';
    echo '<loc>' . htmlspecialchars('https://autogearke.com', ENT_XML1) . '</loc>';
    echo '<changefreq>weekly</changefreq>';
    echo '<priority>1.0</priority>';
    echo '</url>';

    // Blog Hub: https://autogearke.com/blogs (Priority: 0.9, Changefreq: daily)
    echo '<url>';
    echo '<loc>' . htmlspecialchars('https://autogearke.com/blogs', ENT_XML1) . '</loc>';
    echo '<changefreq>daily</changefreq>';
    echo '<priority>0.9</priority>';
    echo '</url>';

    // Main Categories: /car-accessories (Priority: 0.8)
    echo '<url>';
    echo '<loc>' . htmlspecialchars('https://autogearke.com/car-accessories', ENT_XML1) . '</loc>';
    echo '<changefreq>weekly</changefreq>';
    echo '<priority>0.8</priority>';
    echo '</url>';

    // Main Categories: /mobile-accessories (Priority: 0.8)
    echo '<url>';
    echo '<loc>' . htmlspecialchars('https://autogearke.com/mobile-accessories', ENT_XML1) . '</loc>';
    echo '<changefreq>weekly</changefreq>';
    echo '<priority>0.8</priority>';
    echo '</url>';

    // Product pages with category-based URLs and image tags (Priority: 0.7)
    foreach ($products as $product) {
        // Generate URL based on category: /car-accessories/{slug} or /mobile-accessories/{slug}
        $categoryPath = ($product['category'] === 'car') ? 'car-accessories' : 'mobile-accessories';
        echo '<url>';
        echo '<loc>' . htmlspecialchars('https://autogearke.com/' . $categoryPath . '/' . $product['slug'], ENT_XML1) . '</loc>';
        echo '<lastmod>' . date('c', strtotime($product['updated_at'])) . '</lastmod>';
        echo '<changefreq>weekly</changefreq>';
        echo '<priority>0.7</priority>';

        // Add image tags for all associated images
        if (!empty($product['image_names'])) {
            $images = explode(',', $product['image_names']);
            $descriptionSnippet = substr($product['description'] ?? '', 0, 50) . (strlen($product['description'] ?? '') > 50 ? '...' : '');
            foreach ($images as $imageName) {
                $imageName = trim($imageName);
                if (!empty($imageName)) {
                    echo '<image:image>';
                    echo '<image:loc>' . htmlspecialchars('https://autogearke.com/product-images/' . $imageName, ENT_XML1) . '</image:loc>';
                    echo '<image:caption>' . htmlspecialchars($product['name'], ENT_XML1) . '</image:caption>';
                    echo '<image:title>' . htmlspecialchars($descriptionSnippet, ENT_XML1) . '</image:title>';
                    echo '</image:image>';
                }
            }
        }

        echo '</url>';
    }

    // Individual Blog Articles: https://autogearke.com/blogs/[slug] (Priority: 0.6, Changefreq: monthly)
    foreach ($blogs as $blog) {
        echo '<url>';
        echo '<loc>' . htmlspecialchars('https://autogearke.com/blogs/' . $blog['slug'], ENT_XML1) . '</loc>';
        echo '<lastmod>' . date('c', strtotime($blog['updated_at'])) . '</lastmod>';
        echo '<changefreq>monthly</changefreq>';
        echo '<priority>0.6</priority>';
        echo '</url>';
    }

    echo '</urlset>';
} catch (PDOException $e) {
    error_log("Sitemap generation error: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'Sitemap generation failed',
        'message' => 'Unable to generate sitemap. Please try again later.',
        'code' => 500
    ], JSON_UNESCAPED_UNICODE);
}

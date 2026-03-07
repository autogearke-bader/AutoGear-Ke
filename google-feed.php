<?php
// 1. Database Connection - Path must be correct relative to this file
require_once 'api/db.php';

// 2. Set Content Type to XML so Google recognizes it as a feed
header('Content-Type: application/xml; charset=utf-8');

echo '<?xml version="1.0" encoding="UTF-8"?>';
echo '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">';
echo '<channel>';
echo '<title>AutoGear Kenya Products</title>';
echo '<link>https://autogearke.com</link>';
echo '<description>Car and Mobile Accessories in Kenya</description>';

try {
    // 3. Query: Fetching essential fields.
    // Grouping by ID to ensure one row per product even with multiple images.
    $stmt = $pdo->prepare("SELECT p.id, p.slug, p.name, p.description, p.price, GROUP_CONCAT(pi.image_name SEPARATOR ',') as image_names, p.video_url
                           FROM products p
                           LEFT JOIN product_images pi ON p.id = pi.product_id
                           GROUP BY p.id");
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($products as $product) {
        // 1. Logic to extract Brand from Title
        $productName = trim($product['name']);
        $nameParts = explode(' ', $productName);
        $brandName = $nameParts[0]; // Grabs "Oraimo", "JBL", etc.

        echo '<item>';
        echo '<g:id>' . $product['id'] . '</g:id>';
        echo '<g:title>' . htmlspecialchars($productName) . '</g:title>';
        echo '<g:description>' . htmlspecialchars(strip_tags($product['description'])) . '</g:description>';
        echo '<g:link>https://autogearke.com/products/' . htmlspecialchars($product['slug']) . '</g:link>';
        // 1. Split the image string into an array
        $images = explode(',', $product['image_names']);
        $mainImage = $images[0]; // The first image is the primary one

        // 2. Output the Main Image
        echo '<g:image_link>https://autogearke.com/product-images/' . htmlspecialchars($mainImage) . '</g:image_link>';

        // 3. Output Additional Images (the remaining 3)
        if (count($images) > 1) {
            for ($i = 1; $i < min(count($images), 4); $i++) {
                echo '<g:additional_image_link>https://autogearke.com/product-images/' . htmlspecialchars($images[$i]) . '</g:additional_image_link>';
            }
        }

        if (!empty($product['video_url'])) {
            echo '<g:video_link>' . htmlspecialchars($product['video_url']) . '</g:video_link>';
        }

        // 2. Brand and Identifier Logic
        echo '<g:brand>' . htmlspecialchars($brandName) . '</g:brand>';

        // IMPORTANT: Tell Google NOT to look for a barcode (GTIN)
        echo '<g:identifier_exists>no</g:identifier_exists>';

        echo '<g:condition>new</g:condition>';
        echo '<g:availability>in_stock</g:availability>';

        // Price formatting
        $cleanPrice = preg_replace('/[^0-9.]/', '', $product['price']);
        echo '<g:price>' . $cleanPrice . ' KES</g:price>';

        echo '</item>';
    }
} catch (Exception $e) {
    // Failure to connect/query results in an empty feed to prevent malformed XML errors
}

echo '</channel></rss>';
<?php
header('Content-Type: application/json');

require_once 'db.php';
require_once 'security.php';

session_start();
if (!isset($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

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

$id = $input['id'] ?? null;
if (!$id || !is_numeric($id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid product ID']);
    exit;
}

$updates = [];
$params = [];

if (isset($input['name'])) {
    $name = trim($input['name']);
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid name']);
        exit;
    }
    $updates[] = 'name = ?';
    $params[] = $name;
    // Also update slug
    $baseSlug = generateSlug($name);
    $slug = generateUniqueSlug($pdo, $baseSlug, $id);
    $updates[] = 'slug = ?';
    $params[] = $slug;
}

if (isset($input['price'])) {
    $price = $input['price'];
    if (!is_numeric($price) || $price < 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid price']);
        exit;
    }
    $updates[] = 'price = ?';
    $params[] = $price;
}

if (isset($input['description'])) {
    $updates[] = 'description = ?';
    $params[] = sanitize_content($input['description']);
}

if (isset($input['category'])) {
    $category = trim($input['category']);
    if (empty($category)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid category']);
        exit;
    }
    $updates[] = 'category = ?';
    $params[] = $category;
}

if (isset($input['stockStatus'])) {
    $stockStatus = $input['stockStatus'];
    if (!in_array($stockStatus, ['in-stock', 'limited', 'out-of-stock'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid stock status']);
        exit;
    }
    $updates[] = 'stock_status = ?';
    $params[] = $stockStatus;
}

if (isset($input['youtubeUrl'])) {
    $youtubeUrl = trim($input['youtubeUrl']);
    if (!empty($youtubeUrl) && !filter_var($youtubeUrl, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid YouTube URL']);
        exit;
    }
    $updates[] = 'youtube_url = ?';
    $params[] = $youtubeUrl;
}

if (isset($input['instagramUrl'])) {
    $instagramUrl = trim($input['instagramUrl']);
    if (!empty($instagramUrl) && !filter_var($instagramUrl, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid Instagram URL']);
        exit;
    }
    $updates[] = 'instagram_url = ?';
    $params[] = $instagramUrl;
}

if (isset($input['tiktokUrl'])) {
    $tiktokUrl = trim($input['tiktokUrl']);
    if (!empty($tiktokUrl) && !filter_var($tiktokUrl, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid TikTok URL']);
        exit;
    }
    $updates[] = 'tiktok_url = ?';
    $params[] = $tiktokUrl;
}

if (isset($input['videoUrl'])) {
    $updates[] = 'video_url = ?';
    $params[] = trim($input['videoUrl']);
}

if (isset($input['hasInstallation'])) {
    $updates[] = 'has_installation = ?';
    $params[] = $input['hasInstallation'] ? 1 : 0;
}

if (isset($input['isNew'])) {
    $updates[] = 'is_new = ?';
    $params[] = $input['isNew'] ? 1 : 0;
}

if (isset($input['useWhiteBg'])) {
    $updates[] = 'use_white_bg = ?';
    $params[] = is_array($input['useWhiteBg']) ? json_encode($input['useWhiteBg']) : ($input['useWhiteBg'] ? 1 : 0);
}

if (!empty($updates)) {
    $params[] = $id;
    try {
        $stmt = $pdo->prepare("UPDATE products SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update product']);
        exit;
    }
}

// Handle images
if (isset($input['images']) && is_array($input['images'])) {
    $newImages = array_filter($input['images'], function($img) { return !empty(trim($img)); });
    // Get current images
    $stmt = $pdo->prepare("SELECT id, image_name, image_data FROM product_images WHERE product_id = ?");
    $stmt->execute([$id]);
    $currentImages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get useWhiteBg array for re-processing
    $useWhiteBgArray = [];
    if (isset($input['useWhiteBg']) && is_array($input['useWhiteBg'])) {
        $useWhiteBgArray = $input['useWhiteBg'];
    }
    
    // Process new images (blob URLs or base64 data) - store to database
    foreach ($newImages as $idx => $img) {
        // Skip if image already exists in database
        $existingImage = null;
        foreach ($currentImages as $currImg) {
            if ($currImg['image_name'] === $img) {
                $existingImage = $currImg;
                break;
            }
        }
        
        if ($existingImage) {
            // Existing image - re-process if useWhiteBg changed
            $useWhiteBg = isset($useWhiteBgArray[$idx]) && $useWhiteBgArray[$idx];
            
            if ($useWhiteBg && !empty($existingImage['image_data'])) {
                $extension = 'webp';
                $reprocessedData = compressImage($existingImage['image_data'], $extension, $useWhiteBg);
                
                if ($reprocessedData !== false) {
                    $stmt = $pdo->prepare("UPDATE product_images SET image_data = ?, image_name = ? WHERE id = ?");
                    $newImageName = preg_replace('/\.[^.]+$/', '.' . $extension, $existingImage['image_name']);
                    $stmt->execute([$reprocessedData, $newImageName, $existingImage['id']]);
                }
            }
        } else {
            // New image - check if it's a blob URL or base64 data
            if (strpos($img, 'blob:') === 0 || strpos($img, 'data:image') === 0) {
                // This is a new image that needs to be uploaded
                // We need to fetch the blob data and store it
                // Since we can't fetch blob URLs due to CSP, we'll skip here
                // The frontend should upload new images via upload.php first
                error_log("New image detected but not processed: " . $img);
            }
        }
    }
    
    // Images to delete
    $currentImageNames = array_column($currentImages, 'image_name');
    $toDelete = array_diff($currentImageNames, $newImages);
    if (!empty($toDelete)) {
        $placeholders = str_repeat('?,', count($toDelete) - 1) . '?';
        $stmt = $pdo->prepare("DELETE FROM product_images WHERE product_id = ? AND image_name IN ($placeholders)");
        $stmt->execute(array_merge([$id], $toDelete));
    }
}

// Handle new image uploads via separate 'newImages' field
if (isset($input['newImages']) && is_array($input['newImages']) && !empty($input['newImages'])) {
    $productName = $input['name'] ?? 'product';
    
    foreach ($input['newImages'] as $idx => $imageData) {
        $useWhiteBg = isset($input['useWhiteBg'][$idx]) && $input['useWhiteBg'][$idx];
        
        // Process the new image
        $inputForProcess = [];
        if (strpos($imageData, 'data:') === 0) {
            $inputForProcess['base64'] = $imageData;
        } elseif (strpos($imageData, 'blob:') === 0) {
            // Blob URLs can't be processed here due to CSP
            // Frontend should upload via upload.php first
            error_log("Blob URL detected in newImages: " . $imageData);
            continue;
        }
        
        if (!empty($inputForProcess)) {
            $result = process_uploaded_image($inputForProcess, $productName . '-' . ($idx + 1), 'product', $useWhiteBg, $pdo);
            
            if ($result['success']) {
                // Store in database
                $stmt = $pdo->prepare("INSERT INTO product_images (product_id, image_name, image_data, alt_text) VALUES (?, ?, ?, ?)");
                $altText = $input['altTexts'][$idx] ?? $productName;
                $stmt->execute([$id, $result['filename'], $result['data'], $altText]);
            }
        }
    }
}


echo json_encode(['success' => true]);

/**
 * Compress image with optional white background
 */
function compressImage($imageData, &$extension, $useWhiteBg = false) {
    $image = imagecreatefromstring($imageData);
    if (!$image) {
        return false;
    }

    $width = imagesx($image);
    $height = imagesy($image);

    // WHITE BACKGROUND LOGIC: If useWhiteBg is true, create a white canvas and overlay the image
    if ($useWhiteBg) {
        $canvas = imagecreatetruecolor($width, $height);
        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefill($canvas, 0, 0, $white);
        
        // Prepare for transparency if the source is PNG/WebP
        imagealphablending($canvas, true);
        
        // Composite the product image onto the white background
        imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
        imagedestroy($image);
        $image = $canvas;
    }

    // Target max size 200KB
    $targetSize = 200 * 1024;

    // Convert to WebP or JPG
    $outputExtension = 'webp';
    $quality = 85;

    // Resize if too large (max 1920px width)
    $maxWidth = 1920;
    if ($width > $maxWidth) {
        $newWidth = $maxWidth;
        $newHeight = intval($height * ($maxWidth / $width));
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($image);
        $image = $resized;
        $width = $newWidth;
        $height = $newHeight;
    }

    // Compress
    ob_start();
    if ($outputExtension === 'webp') {
        imagewebp($image, null, $quality);
    } else {
        imagejpeg($image, null, $quality);
    }
    $compressed = ob_get_clean();
    imagedestroy($image);

    // If still over 200KB, reduce quality
    while (strlen($compressed) > $targetSize && $quality > 10) {
        $quality -= 5;
        $image = imagecreatefromstring($imageData);
        if ($useWhiteBg) {
            $canvas = imagecreatetruecolor($width, $height);
            $white = imagecolorallocate($canvas, 255, 255, 255);
            imagefill($canvas, 0, 0, $white);
            imagealphablending($canvas, true);
            imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
            imagedestroy($image);
            $image = $canvas;
        }
        if ($width > $maxWidth) {
            $newWidth = $maxWidth;
            $newHeight = intval($height * ($maxWidth / $width));
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }
        ob_start();
        if ($outputExtension === 'webp') {
            imagewebp($image, null, $quality);
        } else {
            imagejpeg($image, null, $quality);
        }
        $compressed = ob_get_clean();
        imagedestroy($image);
    }

    // If WebP is too big, fallback to JPG
    if (strlen($compressed) > $targetSize && $outputExtension === 'webp') {
        $outputExtension = 'jpg';
        $quality = 85;
        $image = imagecreatefromstring($imageData);
        if ($useWhiteBg) {
            $canvas = imagecreatetruecolor($width, $height);
            $white = imagecolorallocate($canvas, 255, 255, 255);
            imagefill($canvas, 0, 0, $white);
            imagealphablending($canvas, true);
            imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
            imagedestroy($image);
            $image = $canvas;
        }
        if ($width > $maxWidth) {
            $newWidth = $maxWidth;
            $newHeight = intval($height * ($maxWidth / $width));
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }
        ob_start();
        imagejpeg($image, null, $quality);
        $compressed = ob_get_clean();
        imagedestroy($image);
        while (strlen($compressed) > $targetSize && $quality > 10) {
            $quality -= 5;
            $image = imagecreatefromstring($imageData);
            if ($useWhiteBg) {
                $canvas = imagecreatetruecolor($width, $height);
                $white = imagecolorallocate($canvas, 255, 255, 255);
                imagefill($canvas, 0, 0, $white);
                imagealphablending($canvas, true);
                imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
                imagedestroy($image);
                $image = $canvas;
            }
            if ($width > $maxWidth) {
                $newWidth = $maxWidth;
                $newHeight = intval($height * ($maxWidth / $width));
                $resized = imagecreatetruecolor($newWidth, $newHeight);
                imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                imagedestroy($image);
                $image = $resized;
            }
            ob_start();
            imagejpeg($image, null, $quality);
            $compressed = ob_get_clean();
            imagedestroy($image);
        }
    }

    $extension = $outputExtension;
    return $compressed;
}
?>
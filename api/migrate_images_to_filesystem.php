<?php
/**
 * Database Migration Script - Move Images from BLOB to Filesystem
 * 
 * This script:
 * 1. Adds new columns for file path storage
 * 2. Migrates existing BLOB data to filesystem files
 * 3. Updates database records with file references
 * 4. Removes old BLOB columns (optional)
 * 
 * Run this script ONCE to migrate from BLOB storage to filesystem storage
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ImageStorageService.php';

header('Content-Type: text/plain; charset=utf-8');

echo "=== Image Storage Migration Script ===\n";
echo "Started: " . date('Y-m-d H:i:s') . "\n\n";

$storage = new ImageStorageService($pdo);
$migratedCount = 0;
$errors = [];

// Start transaction
$pdo->beginTransaction();

try {
    // Step 1: Add new columns to product_images table
    echo "Step 1: Adding new columns to product_images table...\n";
    
    $newColumns = [
        'file_path VARCHAR(500) DEFAULT NULL',
        'file_size INT UNSIGNED DEFAULT 0',
        'mime_type VARCHAR(50) DEFAULT "image/jpeg"',
        'width INT UNSIGNED DEFAULT 0',
        'height INT UNSIGNED DEFAULT 0',
        'metadata JSON DEFAULT NULL'
    ];
    
    foreach ($newColumns as $columnDef) {
        $columnName = explode(' ', $columnDef)[0];
        try {
            $pdo->exec("ALTER TABLE product_images ADD COLUMN IF NOT EXISTS {$columnDef}");
            echo "  - Added column: {$columnName}\n";
        } catch (PDOException $e) {
            // Column might already exist
            echo "  - Column {$columnName} already exists or error: " . $e->getMessage() . "\n";
        }
    }
    
    // Step 2: Add new columns to article_images table
    echo "\nStep 2: Adding new columns to article_images table...\n";
    
    foreach ($newColumns as $columnDef) {
        $columnName = explode(' ', $columnDef)[0];
        try {
            $pdo->exec("ALTER TABLE article_images ADD COLUMN IF NOT EXISTS {$columnDef}");
            echo "  - Added column: {$columnName}\n";
        } catch (PDOException $e) {
            echo "  - Column {$columnName} already exists or error: " . $e->getMessage() . "\n";
        }
    }
    
    // Step 3: Migrate product_images
    echo "\nStep 3: Migrating product_images from BLOB to filesystem...\n";
    
    $stmt = $pdo->query("SELECT id, product_id, image_name, image_data, alt_text FROM product_images WHERE image_data IS NOT NULL AND image_data != ''");
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if (empty($row['image_data'])) {
            continue;
        }
        
        // Check if already migrated (file_path exists)
        if (!empty($row['image_name']) && strlen($row['image_data']) < 100) {
            // Might already be migrated (small data)
            continue;
        }
        
        // Save BLOB to filesystem
        $filename = $row['image_name'];
        if (empty($filename)) {
            $filename = 'product-' . $row['id'] . '-' . bin2hex(random_bytes(4)) . '.jpg';
        }
        
        $saveResult = $storage->saveBinaryData($row['image_data'], $filename, 'product');
        
        if ($saveResult['success']) {
            // Update database record
            $updateStmt = $pdo->prepare("
                UPDATE product_images 
                SET file_path = ?, 
                    file_size = ?, 
                    mime_type = ?, 
                    width = ?, 
                    height = ?,
                    metadata = ?,
                    image_data = 'FILE_STORED'
                WHERE id = ?
            ");
            
            $updateStmt->execute([
                $saveResult['filename'],
                $saveResult['metadata']['file_size'] ?? strlen($row['image_data']),
                $saveResult['metadata']['mime_type'] ?? 'image/jpeg',
                $saveResult['metadata']['width'] ?? 0,
                $saveResult['metadata']['height'] ?? 0,
                json_encode($saveResult['metadata']),
                $row['id']
            ]);
            
            $migratedCount++;
            if ($migratedCount % 50 === 0) {
                echo "  - Migrated {$migratedCount} product images...\n";
            }
        } else {
            $errors[] = "Failed to migrate product image ID {$row['id']}: " . $saveResult['error'];
        }
    }
    
    echo "  - Total product images migrated: {$migratedCount}\n";
    
    // Step 4: Migrate article_images
    echo "\nStep 4: Migrating article_images from BLOB to filesystem...\n";
    
    $articleMigratedCount = 0;
    $stmt = $pdo->query("SELECT id, article_id, image_name, image_data, alt_text FROM article_images WHERE image_data IS NOT NULL AND image_data != ''");
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if (empty($row['image_data'])) {
            continue;
        }
        
        // Check if already migrated
        if (!empty($row['image_name']) && strlen($row['image_data']) < 100) {
            continue;
        }
        
        $filename = $row['image_name'];
        if (empty($filename)) {
            $filename = 'article-' . $row['id'] . '-' . bin2hex(random_bytes(4)) . '.jpg';
        }
        
        $saveResult = $storage->saveBinaryData($row['image_data'], $filename, 'article');
        
        if ($saveResult['success']) {
            $updateStmt = $pdo->prepare("
                UPDATE article_images 
                SET file_path = ?, 
                    file_size = ?, 
                    mime_type = ?, 
                    width = ?, 
                    height = ?,
                    metadata = ?,
                    image_data = 'FILE_STORED'
                WHERE id = ?
            ");
            
            $updateStmt->execute([
                $saveResult['filename'],
                $saveResult['metadata']['file_size'] ?? strlen($row['image_data']),
                $saveResult['metadata']['mime_type'] ?? 'image/jpeg',
                $saveResult['metadata']['width'] ?? 0,
                $saveResult['metadata']['height'] ?? 0,
                json_encode($saveResult['metadata']),
                $row['id']
            ]);
            
            $articleMigratedCount++;
            if ($articleMigratedCount % 50 === 0) {
                echo "  - Migrated {$articleMigratedCount} article images...\n";
            }
        } else {
            $errors[] = "Failed to migrate article image ID {$row['id']}: " . $saveResult['error'];
        }
    }
    
    echo "  - Total article images migrated: {$articleMigratedCount}\n";
    
    // Commit transaction
    $pdo->commit();
    
    echo "\n=== Migration Summary ===\n";
    echo "Product images migrated: {$migratedCount}\n";
    echo "Article images migrated: {$articleMigratedCount}\n";
    echo "Total errors: " . count($errors) . "\n";
    
    if (!empty($errors)) {
        echo "\nErrors:\n";
        foreach ($errors as $error) {
            echo "  - {$error}\n";
        }
    }
    
    echo "\nMigration completed: " . date('Y-m-d H:i:s') . "\n";
    echo "\nNOTE: The image_data column has been set to 'FILE_STORED' for migrated images.\n";
    echo "You can optionally run the cleanup script to remove the BLOB data.\n";
    
} catch (Exception $e) {
    $pdo->rollBack();
    echo "\nERROR: Migration failed!\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "\nTransaction rolled back. No changes were saved.\n";
    exit(1);
}

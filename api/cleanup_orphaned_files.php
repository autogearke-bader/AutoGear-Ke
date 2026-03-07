<?php
/**
 * Cleanup Orphaned Files Script
 * 
 * This script:
 * 1. Scans the uploads directory for files not referenced in database
 * 2. Optionally deletes orphaned files
 * 3. Reports statistics
 * 
 * Run this periodically or after major changes to clean up unused files
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ImageStorageService.php';

header('Content-Type: text/plain; charset=utf-8');

$dryRun = isset($_GET['dry_run']) || php_sapi_name() === 'cli';
$cleanupProducts = !isset($_GET['skip_products']);
$cleanupArticles = !isset($_GET['skip_articles']);

echo "=== Orphaned Files Cleanup ===\n";
echo "Mode: " . ($dryRun ? "DRY RUN (no files will be deleted)" : "LIVE (files will be deleted)") . "\n";
echo "Started: " . date('Y-m-d H:i:s') . "\n\n";

$storage = new ImageStorageService($pdo);
$totalCleaned = 0;
$allErrors = [];

if ($cleanupProducts) {
    echo "=== Processing Product Images ===\n";
    $result = $storage->cleanupOrphanedFiles('product');
    $totalCleaned += $result['cleaned'];
    echo "Product files cleaned: {$result['cleaned']}\n";
    if (!empty($result['errors'])) {
        echo "Errors:\n";
        foreach ($result['errors'] as $error) {
            echo "  - {$error}\n";
        }
        $allErrors = array_merge($allErrors, $result['errors']);
    }
    echo "\n";
}

if ($cleanupArticles) {
    echo "=== Processing Article Images ===\n";
    $result = $storage->cleanupOrphanedFiles('article');
    $totalCleaned += $result['cleaned'];
    echo "Article files cleaned: {$result['cleaned']}\n";
    if (!empty($result['errors'])) {
        echo "Errors:\n";
        foreach ($result['errors'] as $error) {
            echo "  - {$error}\n";
        }
        $allErrors = array_merge($allErrors, $result['errors']);
    }
    echo "\n";
}

echo "=== Summary ===\n";
echo "Total files cleaned: {$totalCleaned}\n";
echo "Total errors: " . count($allErrors) . "\n";
echo "Completed: " . date('Y-m-d H:i:s') . "\n";

if (!$dryRun && $totalCleaned > 0) {
    echo "\nWARNING: {$totalCleaned} files have been permanently deleted.\n";
}

exit(0);

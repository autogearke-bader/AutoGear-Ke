<?php
require_once 'db.php';
try {
    // Add images column to articles table
    $pdo->exec("ALTER TABLE articles ADD COLUMN images JSON AFTER featured_image");
    echo json_encode(['success' => true, 'message' => 'Added images column to articles table']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>

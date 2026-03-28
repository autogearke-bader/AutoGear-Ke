<?php
require_once 'db.php';

try {
    // Read the SQL file
    $sql = file_get_contents('database_setup.sql');

    // Execute the SQL
    $pdo->exec($sql);

    echo json_encode(['success' => true, 'message' => 'Database setup completed']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database setup failed: ' . $e->getMessage()]);
}
?>
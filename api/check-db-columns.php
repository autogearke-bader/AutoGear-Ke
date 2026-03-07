<?php
require_once 'db.php';
try {
    $stmt = $pdo->query("DESCRIBE articles");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode(['columns' => $columns]);
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>

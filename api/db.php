<?php
/**
 * Database Connection - Secure Version
 * AutoGear Ke - Security Hardened
 */

require_once __DIR__ . '/config.php';

try {
    $dsn = sprintf(
        "mysql:host=%s;dbname=%s;charset=%s",
        DB_HOST,
        DB_NAME,
        DB_CHARSET
    );
    
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ];
    
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    
    // Create login_attempts table if not exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ip_address VARCHAR(45) NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ip_address (ip_address),
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    
} catch (PDOException $e) {
    error_log('DB connection error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

/**
 * Generate URL-friendly slug from string
 */
function generateSlug($string) {
    // Convert to lowercase
    $slug = strtolower($string);
    // Remove special characters and replace with hyphens
    $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
    // Replace spaces and multiple hyphens with single hyphen
    $slug = preg_replace('/[\s-]+/', '-', $slug);
    // Trim hyphens from start and end
    $slug = trim($slug, '-');
    return $slug;
}

/**
 * Generate unique slug avoiding duplicates
 */
function generateUniqueSlug($pdo, $baseSlug, $excludeId = null) {
    $slug = $baseSlug;
    $counter = 1;
    $originalSlug = $slug;

    while (true) {
        $query = "SELECT COUNT(*) FROM products WHERE slug = ?";
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

<?php
header('Content-Type: application/json');

require_once 'db.php';

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

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

$name = trim($data['name'] ?? '');

if (empty($name)) {
    http_response_code(400);
    echo json_encode(['error' => 'Category name is required']);
    exit;
}

// Generate slug from name
$slug = strtolower(trim($name));
$slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
$slug = preg_replace('/[\s-]+/', '-', $slug);
$slug = trim($slug, '-');

try {
    // Check if category already exists
    $stmt = $pdo->prepare("SELECT id, name, slug FROM categories WHERE slug = ?");
    $stmt->execute([$slug]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        echo json_encode([
            'success' => true,
            'id' => (int)$existing['id'],
            'name' => $existing['name'],
            'slug' => $existing['slug'],
            'message' => 'Category already exists'
        ]);
        exit;
    }
    
    // Insert new category
    $stmt = $pdo->prepare("INSERT INTO categories (name, slug) VALUES (?, ?)");
    $stmt->execute([$name, $slug]);
    
    $categoryId = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'id' => $categoryId,
        'name' => $name,
        'slug' => $slug,
        'message' => 'Category created successfully'
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create category: ' . $e->getMessage()]);
}
?>

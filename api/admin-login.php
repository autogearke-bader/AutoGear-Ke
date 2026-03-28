<?php
/**
 * Admin Login Endpoint - Secure Version
 * AutoGear Ke - Security Hardening
 */

header('Content-Type: application/json');

// TEMP DEBUG: Log request info
error_log("=== ADMIN LOGIN DEBUG ===");
$rawInput = file_get_contents('php://input');
error_log("Raw input: " . $rawInput);

// Load security functions and database
require_once 'security.php';
require_once 'db.php';

// Get client IP for rate limiting
$clientIp = get_client_ip();
error_log("Client IP: " . $clientIp);

// Check for brute force attempts
$loginStatus = check_login_attempts($pdo, $clientIp, 10, 15);
error_log("Login status blocked: " . ($loginStatus['blocked'] ? 'true' : 'false'));

if ($loginStatus['blocked']) {
    $remainingTime = $loginStatus['lockout_expires'] - time();
    http_response_code(429);
    echo json_encode([
        'error' => 'Too many failed attempts',
        'message' => 'Account temporarily locked due to multiple failed login attempts.',
        'retry_after' => $remainingTime
    ]);
    log_security_event('login_blocked', 'Login blocked due to too many attempts', [
        'ip' => $clientIp,
        'lockout_expires' => $loginStatus['lockout_expires']
    ]);
    exit;
}

// Start secure session
secure_session_start();

// Generate CSRF token if not exists
$csrfToken = generate_csrf_token();

// Get input
$input = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("JSON decode error: " . json_last_error_msg());
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$password = $input['password'] ?? '';
error_log("Received password length: " . strlen($password));

// Get admin password directly from .env file (more reliable than getenv)
$envFile = __DIR__ . '/../.env';
$validPassword = '';
error_log("Checking .env file at: " . $envFile);
error_log(".env file exists: " . (file_exists($envFile) ? 'true' : 'false'));

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    error_log("Total lines in .env: " . count($lines));
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, '#') === 0) continue; // Skip comments
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            error_log("Found env var: " . trim($name) . " (value length: " . strlen(trim($value)) . ")");
            if (trim($name) === 'ADMIN_PASSWORD') {
                $validPassword = trim($value);
                error_log("Found ADMIN_PASSWORD in .env, length: " . strlen($validPassword));
                break;
            }
        }
    }
}

// Fallback to constant if defined
if (empty($validPassword) && defined('ADMIN_PASSWORD')) {
    $validPassword = ADMIN_PASSWORD;
    error_log("Using ADMIN_PASSWORD constant, length: " . strlen($validPassword));
}

error_log("Valid password empty: " . (empty($validPassword) ? 'true' : 'false'));
error_log("Passwords match: " . ($validPassword === $password ? 'true' : 'false'));

if (!empty($validPassword) && $validPassword === $password) {
    // Successful login
    regenerate_session(); // Prevent session fixation
    
    $_SESSION['is_admin'] = true;
    $_SESSION['login_time'] = time();
    $_SESSION['ip_address'] = $clientIp;
    
    // Clear failed attempts on success
    clear_login_attempts($pdo, $clientIp);
    
    log_security_event('login_success', 'Admin login successful', ['ip' => $clientIp]);
    
    echo json_encode([
        'success' => true,
        'csrf_token' => $csrfToken
    ]);
} else {
    // Failed login
    record_failed_attempt($pdo, $clientIp, 10, 15);
    
    $attemptsRemaining = check_login_attempts($pdo, $clientIp, 10, 15)['attempts_remaining'];
    
    log_security_event('login_failed', 'Admin login failed', [
        'ip' => $clientIp,
        'attempts_remaining' => $attemptsRemaining
    ]);
    
    http_response_code(401);
    echo json_encode([
        'error' => 'Invalid password',
        'attempts_remaining' => $attemptsRemaining
    ]);
}

<?php
/**
 * Configuration File - Environment-Based Security
 * AutoGear Ke - Security Hardened
 * 
 * IMPORTANT: This file should be protected by .htaccess
 * Database credentials are loaded from environment variables
 */

// Load environment variables from .env file if available
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        // Skip empty lines and comments (lines starting with #)
        if (empty($line) || $line[0] === '#') continue;
        // Find the first equals sign
        $equalsPos = strpos($line, '=');
        if ($equalsPos !== false) {
            $name = substr($line, 0, $equalsPos);
            $value = substr($line, $equalsPos + 1);
            $name = trim($name);
            $value = trim($value);
            // Don't overwrite existing environment variables
            if (!empty($name) && !getenv($name)) {
                putenv("$name=$value");
            }
        }
    }
}

// Database credentials from environment variables
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'u388801963_autogearke');
define('DB_USER', getenv('DB_USER') ?: 'u388801963_autogearke');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// Admin password from environment variable (secure approach)
define('ADMIN_PASSWORD', getenv('ADMIN_PASSWORD') ?: '');

// Session security settings
define('SESSION_LIFETIME', 86400); // 24 hours
define('CSRF_TOKEN_LIFETIME', 3600); // 1 hour

// Upload settings
define('MAX_UPLOAD_SIZE', 3 * 1024 * 1024); // 3MB
define('ALLOWED_MIME_TYPES', serialize(['image/jpeg', 'image/png', 'image/webp']));

// Rate limiting
define('MAX_LOGIN_ATTEMPTS', 10);
define('LOCKOUT_DURATION_MINUTES', 15);

// Error reporting (disable in production)
// error_reporting(E_ALL);
// ini_set('display_errors', 0);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');

# Filesystem Cleanup Implementation

## Overview
This document describes the filesystem cleanup implementation for handling upload failures in the AutoGear Ke image upload system.

## Implementation Details

### Requirements Addressed
- **Requirement 4.4**: When an image upload fails after filesystem storage, the system SHALL delete the uploaded file to prevent orphans
- **Requirement 4.5**: When the database insert fails, the system SHALL clean up the filesystem and return an error

### Changes Made

#### 1. upload.php - Article Upload Cleanup
**Location**: Lines 107-119

When an article image database insert fails:
1. The uploaded file is deleted from the filesystem using `$storage->deleteFile()`
2. A security event is logged with cleanup status
3. An HTTP 500 error is returned with the database error message

```php
if (!$dbResult['success']) {
    // If database insert fails, delete the uploaded file to avoid orphans
    $cleanupSuccess = $storage->deleteFile($result['filename'], 'article');
    
    log_security_event('article_image_cleanup', 'Cleaned up orphaned file after database failure', [
        'article_id' => $articleId,
        'filename' => $result['filename'],
        'cleanup_success' => $cleanupSuccess
    ]);
    
    http_response_code(500);
    echo json_encode(['error' => $dbResult['error']]);
    exit;
}
```

#### 2. upload.php - Product Upload Cleanup
**Location**: Lines 207-219

When a product image database insert fails:
1. The uploaded file is deleted from the filesystem using `$storage->deleteFile()`
2. A security event is logged with cleanup status
3. An HTTP 500 error is returned with the database error message

```php
if (!$dbResult['success']) {
    // If database insert fails, delete the uploaded file to avoid orphans
    $cleanupSuccess = $storage->deleteFile($result['filename'], 'product');
    
    log_security_event('product_image_cleanup', 'Cleaned up orphaned file after database failure', [
        'product_id' => $productId,
        'filename' => $result['filename'],
        'cleanup_success' => $cleanupSuccess
    ]);
    
    http_response_code(500);
    echo json_encode(['error' => $dbResult['error']]);
    exit;
}
```

#### 3. ImageStorageService.php - Enhanced deleteFile Method
**Location**: Lines 320-360

The `deleteFile` method now includes comprehensive logging:

**Logging Events**:
- **Success**: Logs the full file path and type when deletion succeeds
- **Failure**: Logs when file exists but deletion fails
- **Not Found**: Logs when the file cannot be found

**Search Strategy**:
1. Searches dated directory structure (uploads/type/year/month/)
2. Falls back to direct path (uploads/type/)
3. Returns false if file not found

```php
public function deleteFile(string $filename, string $type = 'product'): bool
{
    $deleted = false;
    $filePath = null;
    
    // Try to find file in dated directories
    $years = glob($this->uploadBaseDir . $type . '/*');
    foreach ($years as $year) {
        if (is_dir($year)) {
            $months = glob($year . '/*');
            foreach ($months as $month) {
                $filePath = $month . '/' . $filename;
                if (file_exists($filePath)) {
                    $deleted = unlink($filePath);
                    if ($deleted) {
                        error_log("[ImageStorageService] Deleted file: {$filePath} (type: {$type})");
                    } else {
                        error_log("[ImageStorageService] Failed to delete file: {$filePath} (type: {$type})");
                    }
                    return $deleted;
                }
            }
        }
    }
    
    // Try direct path
    $directPath = $this->uploadBaseDir . $type . '/' . $filename;
    if (file_exists($directPath)) {
        $deleted = unlink($directPath);
        if ($deleted) {
            error_log("[ImageStorageService] Deleted file: {$directPath} (type: {$type})");
        } else {
            error_log("[ImageStorageService] Failed to delete file: {$directPath} (type: {$type})");
        }
        return $deleted;
    }
    
    // File not found
    error_log("[ImageStorageService] File not found for deletion: {$filename} (type: {$type})");
    return false;
}
```

## Logging

### Security Event Logs
The system logs cleanup operations using the `log_security_event()` function:

**Article Cleanup Event**:
- Event Type: `article_image_cleanup`
- Message: "Cleaned up orphaned file after database failure"
- Data: article_id, filename, cleanup_success

**Product Cleanup Event**:
- Event Type: `product_image_cleanup`
- Message: "Cleaned up orphaned file after database failure"
- Data: product_id, filename, cleanup_success

### Error Logs
The ImageStorageService logs all deletion attempts to PHP error log:
- `[ImageStorageService] Deleted file: {path} (type: {type})` - Success
- `[ImageStorageService] Failed to delete file: {path} (type: {type})` - Failure
- `[ImageStorageService] File not found for deletion: {filename} (type: {type})` - Not found

## Testing

### Manual Testing Steps

1. **Test Database Failure Scenario**:
   - Temporarily modify database permissions or connection
   - Attempt to upload an image
   - Verify file is created then deleted
   - Check logs for cleanup event

2. **Test File System Permissions**:
   - Create a file with restricted permissions
   - Attempt cleanup
   - Verify failure is logged

3. **Test Missing File**:
   - Attempt to delete a non-existent file
   - Verify "not found" is logged

### Log Verification

Check the following logs after upload failures:
- PHP error log: `/var/log/php/error.log` or configured location
- Security event log: Check database or configured security log location

Example log entries:
```
[2024-02-14 10:30:45] [ImageStorageService] Deleted file: /path/to/uploads/products/2024/02/product-20240214103045-abc123.jpg (type: product)
[2024-02-14 10:30:45] Security Event: product_image_cleanup - Cleaned up orphaned file after database failure
```

## Error Handling Flow

```
Image Upload Request
    ↓
Process Image → Save to Filesystem
    ↓
Insert Database Record
    ↓
[SUCCESS] → Return image info
    ↓
[FAILURE] → Delete File from Filesystem
    ↓
Log Cleanup Event
    ↓
Return Error Response
```

## Benefits

1. **No Orphaned Files**: Failed uploads don't leave files on disk
2. **Audit Trail**: All cleanup operations are logged
3. **Consistent Behavior**: Both article and product uploads handle failures identically
4. **Debugging Support**: Detailed logs help troubleshoot issues
5. **Resource Management**: Prevents disk space waste from failed uploads

## Future Enhancements

Potential improvements:
- Periodic cleanup job for any orphaned files that slip through
- Metrics tracking for cleanup success/failure rates
- Automated alerts for repeated cleanup failures
- Retry mechanism for transient database failures

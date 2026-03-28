# Image Storage System Documentation

## Overview

This document describes the filesystem-based image storage system implemented for AutoGear Ke. The system stores images as actual files on the filesystem instead of encoding them as base64 strings in the database.

## Key Benefits

- **Reduced Database Size**: Images are stored on disk, keeping the database lightweight
- **Faster Performance**: Filesystem access is more efficient than BLOB retrieval
- **Better Caching**: Images can be cached by web servers and CDNs
- **Scalability**: Easier to scale file storage independently from database

## Directory Structure

```
public_html/
├── uploads/
│   ├── products/
│   │   └── YYYY/
│   │       └── MM/
│   │           ├── product-20240212-abc123.jpg
│   │           └── product-20240212-def456.webp
│   ├── articles/
│   │   └── YYYY/
│   │       └── MM/
│   │           ├── article-20240212-ghi789.png
│   │           └── article-20240212-jkl012.gif
│   ├── cache/
│   │   └── (cached images)
│   └── temp/
│       └── (temporary files during upload)
```

## Database Schema

### New Columns Added to `product_images` and `article_images`:

| Column | Type | Description |
|--------|------|-------------|
| `file_path` | VARCHAR(500) | Relative path to the image file |
| `file_size` | INT | File size in bytes |
| `mime_type` | VARCHAR(50) | MIME type (e.g., image/jpeg) |
| `width` | INT | Image width in pixels |
| `height` | INT | Image height in pixels |
| `metadata` | JSON | Additional metadata |

### Legacy Column:
- `image_data` - Now contains 'FILE_STORED' marker instead of BLOB data (after migration)

## API Endpoints

### Upload Image
**POST** `/api/upload.php`

Request:
```json
{
  "productId": 123,
  "productName": "Car Phone Mount",
  "image": "base64-encoded-image-data...",
  "altText": "Car Phone Mount",
  "useWhiteBg": true
}
```

Response:
```json
{
  "success": true,
  "image_name": "product-20240212-abc123def456.webp",
  "imageId": 456,
  "type": "product",
  "file_url": "/image-handler.php?image=product-20240212-abc123def456.webp&type=product",
  "file_size": 45678,
  "dimensions": {
    "width": 800,
    "height": 600
  }
}
```

### Get Image Base64
**GET** `/api/get-image-base64.php?id=456&type=product`

Response:
```json
{
  "success": true,
  "image_name": "product-20240212-abc123def456.webp",
  "alt_text": "Car Phone Mount",
  "base64": "data:image/webp;base64,/9j/4AAQ..."
}
```

### Delete Image
**POST** `/api/delete-image.php`

Request:
```json
{
  "id": 456,
  "type": "product"
}
```

Response:
```json
{
  "success": true,
  "message": "Image deleted successfully",
  "imageId": 456,
  "file_deleted": true
}
```

### Serve Image
**GET** `/image-handler.php?image=filename.webp&type=product`

Returns the actual image file with proper MIME type and caching headers.

Optional: Convert to base64
**GET** `/image-handler.php?image=filename.webp&type=product&base64=1`

Returns JSON with base64-encoded image.

## Migration

### Running the Migration

1. **Backup your database** before running migration
2. **Backup your uploads directory** (if any images exist there)
3. Run the migration script:

```bash
# Via browser
https://yoursite.com/api/migrate_images_to_filesystem.php

# Or via command line
php public_html/api/migrate_images_to_filesystem.php
```

The migration will:
- Add new columns to the image tables
- Export existing BLOB data to filesystem files
- Update database records with file references
- Set `image_data` to 'FILE_STORED' marker

### After Migration

1. Verify images are served correctly
2. Run cleanup to remove orphaned files (if any)

## Cleanup Operations

### Dry Run (Recommended First)
```bash
/api/cleanup_orphaned_files.php?dry_run=1
```

### Live Cleanup
```bash
/api/cleanup_orphaned_files.php
```

### Skip Specific Types
```bash
/api/cleanup_orphaned_files.php?skip_products=1  # Only clean articles
/api/cleanup_orphaned_files.php?skip_articles=1  # Only clean products
```

## Security Features

1. **MIME Type Validation**: All uploaded files are validated using `finfo_file()`
2. **File Extension Whitelist**: Only allowed extensions (jpg, jpeg, png, webp, gif)
3. **Image Dimension Limits**: Maximum 3000px width/height
4. **File Size Limits**: Maximum 5MB per file
5. **Secure Filename Generation**: Uses random bytes for unique filenames
6. **Upload Error Checking**: Validates upload status before processing

## File Organization

### Dated Directory Structure
Images are stored in `uploads/{type}/{year}/{month}/` to prevent filename conflicts and organize files by upload date.

### Hash-Based Naming
Filename format: `{type}-{timestamp}-{randomhash}.{extension}`

Examples:
- Products: `product-20240212123045-abc123def456.webp`
- Articles: `article-20240212123045-xyz789abc012.png`

## Base64 Conversion

Base64 conversion is only performed when needed for display:
- Use `get-image-base64.php` endpoint for client-side images
- Add `&base64=1` to image-handler.php for on-demand conversion
- The original file is always preserved on disk

## Troubleshooting

### Image Not Found (404)
1. Check the file exists in `uploads/products/` or `uploads/articles/`
2. Verify database record has correct `image_name` value
3. Check file permissions on uploads directory

### Migration Fails
1. Ensure database user has ALTER TABLE permissions
2. Check disk space is sufficient
3. Verify uploads directory is writable

### Orphaned Files
Run the cleanup script to remove files without database references.

## Performance Considerations

- Images are served with 1-year cache headers (ETag supported)
- Large uploads may need PHP memory limit adjustment
- Consider using a CDN for serving uploaded images in production

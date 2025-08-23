# Image Management System

This document describes the comprehensive image management system implemented for item creation and storage in the RentPal application.

## Overview

The image management system provides:
- **Database functions** for atomic image operations
- **Image association** with items during creation
- **Image deletion and cleanup** when items are removed
- **Image reordering** functionality for item galleries
- **Batch operations** for handling multiple image uploads
- **Orphaned image cleanup** for maintenance

## Architecture

### Components

1. **ImageService** (`src/lib/services/imageService.ts`)
   - High-level service for image operations
   - Integrates with storage and database layers
   - Provides batch operations and error handling

2. **Database Functions** (`supabase/image_management_functions.sql`)
   - Atomic SQL operations for consistency
   - Performance-optimized batch operations
   - Built-in validation and error handling

3. **Storage Integration** (`src/lib/storage.ts`)
   - File upload and deletion operations
   - Validation and security checks
   - Progress tracking and error recovery

4. **Enhanced ItemService** (`src/lib/database.ts`)
   - Integration with image management
   - Item deletion with image cleanup
   - User permission validation

## Database Functions

### `batch_insert_item_images()`
Atomically inserts multiple images with proper ordering and primary image handling.

```sql
SELECT * FROM batch_insert_item_images(
  p_item_id := 'item-uuid',
  p_image_urls := ARRAY['url1', 'url2'],
  p_alt_texts := ARRAY['alt1', 'alt2'],
  p_make_first_primary := true
);
```

### `reorder_item_images()`
Reorders images for an item with validation.

```sql
SELECT * FROM reorder_item_images(
  p_item_id := 'item-uuid',
  p_image_ids := ARRAY['img1-uuid', 'img2-uuid']
);
```

### `set_primary_item_image()`
Sets a specific image as primary for an item.

```sql
SELECT * FROM set_primary_item_image(
  p_item_id := 'item-uuid',
  p_image_id := 'image-uuid'
);
```

### `delete_item_images_by_ids()`
Deletes images by IDs and returns URLs for storage cleanup.

```sql
SELECT * FROM delete_item_images_by_ids(
  p_image_ids := ARRAY['img1-uuid', 'img2-uuid']
);
```

### `delete_all_item_images()`
Deletes all images for an item.

```sql
SELECT * FROM delete_all_item_images(
  p_item_id := 'item-uuid'
);
```

### `cleanup_orphaned_images()`
Finds and removes images not associated with any item.

```sql
SELECT * FROM cleanup_orphaned_images();
```

### `get_item_image_stats()`
Returns statistics about images for an item.

```sql
SELECT * FROM get_item_image_stats(
  p_item_id := 'item-uuid'
);
```

## API Usage

### Upload and Associate Images

```typescript
import { imageService } from '@/lib/services/imageService'

const result = await imageService.uploadAndAssociateImages(
  'item-id',
  files, // File[] array
  'user-id',
  {
    altTexts: ['Description 1', 'Description 2'],
    makePrimary: true,
    maxConcurrent: 3
  }
)

if (result.success) {
  console.log('Uploaded images:', result.uploadedImages)
} else {
  console.error('Failed uploads:', result.failedUploads)
  console.error('Errors:', result.errors)
}
```

### Reorder Images

```typescript
const result = await imageService.reorderItemImages(
  'item-id',
  ['image-id-2', 'image-id-1', 'image-id-3']
)

if (result.success) {
  console.log('Reordered images:', result.images)
}
```

### Set Primary Image

```typescript
const result = await imageService.setPrimaryImage(
  'item-id',
  'image-id'
)

if (result.success) {
  console.log('Updated images:', result.images)
}
```

### Delete Images

```typescript
const result = await imageService.deleteImagesByIds([
  'image-id-1',
  'image-id-2'
])

if (result.success) {
  console.log('Deleted count:', result.deletedCount)
} else {
  console.error('Errors:', result.errors)
}
```

### Item Service Integration

```typescript
import { itemService } from '@/lib/database'

// Delete item with automatic image cleanup
const result = await itemService.deleteItem('item-id', 'user-id')

// Reorder item images with permission check
const reorderResult = await itemService.reorderItemImages(
  'item-id',
  ['img1', 'img2'],
  'user-id'
)

// Set primary image with permission check
const primaryResult = await itemService.setPrimaryItemImage(
  'item-id',
  'image-id',
  'user-id'
)
```

## Error Handling

The system provides comprehensive error handling:

### Upload Errors
- File validation failures
- Storage quota exceeded
- Network connectivity issues
- Invalid file types or sizes

### Database Errors
- Constraint violations
- Permission denied
- Item not found
- Image association failures

### Storage Errors
- Bucket not found
- File deletion failures
- URL extraction errors
- Cleanup operation failures

## Performance Considerations

### Database Optimizations
- Atomic operations using database functions
- Proper indexing on frequently queried fields
- Batch operations to reduce round trips
- Efficient cleanup queries

### Storage Optimizations
- Concurrent uploads with configurable limits
- Progress tracking for large batches
- Automatic retry logic for failed operations
- Cleanup of partially uploaded files

### Caching Strategy
- Cache invalidation on image changes
- Memory caching for frequently accessed data
- CDN integration for image delivery
- Browser caching for static images

## Security

### Authentication
- All operations require authenticated users
- User can only modify their own items
- Permission validation before operations

### File Upload Security
- MIME type validation
- File size limits
- Malicious file detection
- Secure file naming

### RLS Policies
- Row-level security on all tables
- Users can only access their own images
- Public read access for displaying images
- Secure storage bucket policies

## Maintenance

### Cleanup Operations

```typescript
// Clean up orphaned images
const cleanupResult = await imageService.cleanupOrphanedImages()
console.log('Cleaned up:', cleanupResult.deletedCount, 'images')

// Get image statistics
const stats = await imageService.getItemImageStats('item-id')
console.log('Total images:', stats.stats?.totalImages)
console.log('Has primary:', stats.stats?.hasPrimary)
```

### Monitoring
- Track image upload success rates
- Monitor storage usage and costs
- Alert on high error rates
- Performance metrics for operations

## Setup Instructions

1. **Apply Database Functions**
   ```bash
   # Run the setup script
   node scripts/setup-image-functions.js
   
   # Or apply manually via Supabase dashboard
   # Copy contents of supabase/image_management_functions.sql
   ```

2. **Configure Storage Buckets**
   ```bash
   # Ensure buckets exist with proper policies
   # item-images: public read, authenticated write
   # avatars: public read, authenticated write
   ```

3. **Update Environment**
   ```bash
   # Ensure Supabase configuration is correct
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   ```

## Testing

Run the comprehensive test suite:

```bash
npm test -- src/lib/services/__tests__/imageService.test.ts --run
```

Tests cover:
- Image association operations
- Reordering functionality
- Primary image setting
- Deletion operations
- Upload and batch operations
- Error scenarios
- Edge cases

## Migration Guide

If upgrading from the previous image system:

1. **Backup existing data**
2. **Apply new database functions**
3. **Update code to use new ImageService**
4. **Test thoroughly in staging**
5. **Monitor after deployment**

## Troubleshooting

### Common Issues

1. **Images not uploading**
   - Check storage bucket configuration
   - Verify file size and type limits
   - Check network connectivity

2. **Permission errors**
   - Verify user authentication
   - Check RLS policies
   - Ensure user owns the item

3. **Database function errors**
   - Verify functions are installed
   - Check function permissions
   - Review error logs

### Debug Commands

```typescript
// Check image statistics
const stats = await imageService.getItemImageStats('item-id')

// Test storage configuration
import { testStorageConfigurationEnhanced } from '@/lib/storage'
const storageTest = await testStorageConfigurationEnhanced()

// Cleanup orphaned images
const cleanup = await imageService.cleanupOrphanedImages()
```

## Future Enhancements

- **Image optimization**: Automatic resizing and compression
- **CDN integration**: Faster image delivery
- **Thumbnail generation**: Multiple image sizes
- **Image metadata**: EXIF data extraction
- **Bulk operations**: Admin tools for batch management
- **Analytics**: Usage tracking and reporting
# Enhanced Image Upload Components

This directory contains enhanced image upload components that provide a robust, user-friendly interface for uploading images to Supabase storage buckets.

## Components

### EnhancedImageUpload

The core reusable component that handles image uploads to specific Supabase buckets.

**Features:**
- Drag and drop file upload
- Multiple file selection
- File validation (type, size)
- Upload progress tracking
- Image preview with thumbnails
- Image reordering (drag and drop)
- Error handling with user-friendly messages
- Responsive design
- Accessibility compliant

**Props:**
```typescript
interface ImageUploadProps {
  bucket: BucketName                    // 'item-images' | 'avatars'
  images: string[]                      // Array of current image URLs
  onImagesChange: (images: string[]) => void  // Callback when images change
  maxImages?: number                    // Maximum number of images (default: bucket config)
  allowMultiple?: boolean               // Allow multiple images (default: true)
  showPreview?: boolean                 // Show image previews (default: true)
  showProgress?: boolean                // Show upload progress (default: true)
  disabled?: boolean                    // Disable the component (default: false)
  className?: string                    // Additional CSS classes
  dragDropText?: string                 // Custom drag/drop text
  buttonText?: string                   // Custom button text
}
```

### EnhancedItemImageUpload

Specialized component for uploading item images with helpful tips and guidance.

**Features:**
- Optimized for rental item photos
- Multiple image support (up to 10 by default)
- Main photo designation (first image)
- Photography tips for better listings
- 5MB file size limit per image

**Props:**
```typescript
interface ItemImageUploadProps {
  images: string[]                      // Array of current image URLs
  onImagesChange: (images: string[]) => void  // Callback when images change
  maxImages?: number                    // Maximum images (default: 10)
  disabled?: boolean                    // Disable the component
  className?: string                    // Additional CSS classes
}
```

### EnhancedProfileImageUpload

Specialized component for uploading profile avatars.

**Features:**
- Single image upload only
- Automatic cleanup of old profile images
- 2MB file size limit
- Profile completion guidance
- Optimized for avatar display

**Props:**
```typescript
interface ProfileImageUploadProps {
  currentImageUrl?: string | null       // Current profile image URL
  onImageChange: (url: string) => void  // Callback when image changes
  disabled?: boolean                    // Disable the component
  className?: string                    // Additional CSS classes
  showLabel?: boolean                   // Show component label (default: true)
}
```

## Storage Utilities

### Key Functions

- `validateFile(file: File, bucket: BucketName)` - Validates file type and size
- `uploadFile(file: File, bucket: BucketName, userId: string)` - Uploads single file
- `uploadFiles(files: File[], bucket: BucketName, userId: string)` - Uploads multiple files
- `deleteFile(filePath: string, bucket: BucketName)` - Deletes file from storage
- `generateFileName(originalName: string, userId: string, options?)` - Generates unique filename

### Bucket Configuration

```typescript
const BUCKET_CONFIG = {
  'item-images': {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    maxFiles: 10
  },
  'avatars': {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    maxFiles: 1
  }
}
```

## Custom Hook

### useImageUpload

A custom hook that provides image upload functionality with state management.

```typescript
const {
  isUploading,
  error,
  uploadProgress,
  uploadImages,
  deleteImage,
  validateFiles,
  clearError
} = useImageUpload({
  bucket: 'item-images',
  maxImages: 10,
  onSuccess: (urls) => console.log('Uploaded:', urls),
  onError: (error) => console.error('Error:', error)
})
```

## Usage Examples

### Basic Item Image Upload

```tsx
import { useState } from 'react'
import EnhancedItemImageUpload from '@/components/items/EnhancedItemImageUpload'

function ItemForm() {
  const [images, setImages] = useState<string[]>([])
  
  return (
    <form>
      <EnhancedItemImageUpload
        images={images}
        onImagesChange={setImages}
        maxImages={5}
      />
    </form>
  )
}
```

### Basic Profile Image Upload

```tsx
import { useState } from 'react'
import EnhancedProfileImageUpload from '@/components/profile/EnhancedProfileImageUpload'

function ProfileForm() {
  const [profileImage, setProfileImage] = useState<string>('')
  
  return (
    <form>
      <EnhancedProfileImageUpload
        currentImageUrl={profileImage}
        onImageChange={setProfileImage}
      />
    </form>
  )
}
```

### Advanced Usage with Custom Hook

```tsx
import { useState } from 'react'
import { useImageUpload } from '@/hooks/useImageUpload'
import EnhancedImageUpload from '@/components/shared/EnhancedImageUpload'

function CustomUploadForm() {
  const [images, setImages] = useState<string[]>([])
  
  const {
    isUploading,
    error,
    uploadProgress,
    clearError
  } = useImageUpload({
    bucket: 'item-images',
    onSuccess: (urls) => setImages(prev => [...prev, ...urls]),
    onError: (error) => console.error('Upload failed:', error)
  })
  
  return (
    <div>
      <EnhancedImageUpload
        bucket="item-images"
        images={images}
        onImagesChange={setImages}
        disabled={isUploading}
      />
      
      {error && (
        <div className="error">
          {error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
    </div>
  )
}
```

## Error Handling

The components provide comprehensive error handling for common scenarios:

- **File Type Validation**: Only allows JPEG, PNG, and WebP images
- **File Size Validation**: Enforces bucket-specific size limits
- **Upload Failures**: Network errors, storage issues, permission problems
- **Bucket Configuration**: Missing buckets or RLS policies
- **Authentication**: Requires authenticated user

## Accessibility

All components are built with accessibility in mind:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast support

## Testing

Comprehensive test suites are included:

- Unit tests for storage utilities
- Component tests for UI interactions
- Integration tests for upload flows
- Error scenario testing

Run tests with:
```bash
npm run test:run src/components/shared/__tests__/
npm run test:run src/lib/__tests__/storage-utils.test.ts
```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **3.1**: Item image upload integration with Supabase storage
- **3.3**: File validation (size, type, naming)
- **3.4**: Error handling for upload failures
- **4.1**: Profile image upload functionality
- **4.4**: Clear error messages for upload failures

## Dependencies

- React 19+
- Next.js 15+
- Supabase JS client
- Tailwind CSS for styling
- TypeScript for type safety
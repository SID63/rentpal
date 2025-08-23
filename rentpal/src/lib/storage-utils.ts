import { supabase } from '@/lib/supabase'
import type {
  BucketName,
  FileValidationResult,
  FileUploadResult,
  BatchUploadResult,
  UploadOptions,
  FileNamingOptions,
  StorageError,
  StorageErrorCode,
  UploadProgress
} from '@/types/storage'

/**
 * Bucket configuration constants
 */
export const BUCKET_CONFIG = {
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
} as const

/**
 * Validate a file against bucket configuration
 */
export function validateFile(file: File, bucket: BucketName): FileValidationResult {
  const config = BUCKET_CONFIG[bucket]
  
  // Check file type
  if (!config.allowedMimeTypes.includes(file.type as any)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Supported formats: ${config.allowedMimeTypes.join(', ')}`
    }
  }
  
  // Check file size
  if (file.size > config.fileSizeLimit) {
    const sizeMB = Math.round(config.fileSizeLimit / (1024 * 1024))
    return {
      valid: false,
      error: `File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds limit of ${sizeMB}MB`
    }
  }
  
  return { valid: true }
}

/**
 * Generate a unique file name
 */
export function generateFileName(
  originalName: string,
  userId: string,
  options: FileNamingOptions = {}
): string {
  const {
    preserveOriginalName = false,
    addTimestamp = true,
    addUserId = false,
    customPrefix = '',
    customSuffix = '',
    sanitize = true
  } = options
  
  const fileExt = originalName.split('.').pop()?.toLowerCase() || ''
  let baseName = preserveOriginalName 
    ? originalName.replace(/\.[^/.]+$/, '') 
    : 'image'
  
  if (sanitize) {
    baseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '-')
  }
  
  const parts = []
  
  if (customPrefix) parts.push(customPrefix)
  if (addUserId) parts.push(userId.substring(0, 8))
  if (addTimestamp) parts.push(Date.now().toString())
  if (baseName) parts.push(baseName)
  if (customSuffix) parts.push(customSuffix)
  
  const fileName = parts.join('-')
  return `${fileName}.${fileExt}`
}

/**
 * Upload a single file to Supabase storage
 */
export async function uploadFile(
  file: File,
  bucket: BucketName,
  userId: string,
  options: UploadOptions = {}
): Promise<FileUploadResult> {
  try {
    // TEMP DEBUG LOGS: begin
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[storage-utils] uploadFile:start', {
        bucket,
        userId,
        fileNameOriginal: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
      })
    }
    // TEMP DEBUG LOGS: end

    const validation = validateFile(file, bucket)
    if (!validation.valid) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[storage-utils] uploadFile:validation_failed', {
          bucket,
          userId,
          error: validation.error,
        })
      }
      return { success: false, error: validation.error }
    }
    const fileName = generateFileName(file.name, userId)
    const filePath = `${userId}/${bucket === 'avatars' ? 'profile' : 'items'}/${fileName}`

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[storage-utils] uploadFile:computed_path', {
        bucket,
        userId,
        fileName,
        filePath,
        options,
      })
    }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, options)
    if (uploadError) {
      let errorMessage = uploadError.message
      if (uploadError.message.includes('Bucket not found')) {
        errorMessage = `Storage bucket '${bucket}' not found. Please set up storage buckets first.`
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error('[storage-utils] uploadFile:upload_error', {
          bucket,
          userId,
          filePath,
          supabaseError: uploadError,
          errorMessage,
        })
      }
      return {
        success: false,
        error: errorMessage,
        metadata: {
          bucket,
          userId,
          originalName: file.name,
          size: file.size,
          type: file.type,
          attemptedPath: filePath,
        },
      }
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[storage-utils] uploadFile:public_url', {
        bucket,
        userId,
        filePath,
        publicUrl: data?.publicUrl,
      })
    }
    return {
      success: true,
      url: data.publicUrl,
      path: filePath,
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        uploadedAt: new Date().toISOString(),
        userId,
        bucket,
        path: filePath
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[storage-utils] uploadFile:exception', {
        bucket,
        userId,
        error,
      })
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    }
  }
}

/**
 * Upload multiple files with progress tracking
 */
export async function uploadFiles(
  files: File[],
  bucket: BucketName,
  userId: string,
  options: UploadOptions & { 
    maxConcurrent?: number
    onProgress?: (progress: { completed: number; total: number; currentFile?: string }) => void
  } = {}
): Promise<BatchUploadResult> {
  const { maxConcurrent = 3, onProgress, ...uploadOptions } = options
  const results: FileUploadResult[] = []
  const errors: string[] = []
  
  // Process files in batches
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent)
    const batchPromises = batch.map(async (file) => {
      onProgress?.({ completed: i, total: files.length, currentFile: file.name })
      return uploadFile(file, bucket, userId, uploadOptions)
    })
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    
    // Collect errors
    batchResults.forEach((result, index) => {
      if (!result.success && result.error) {
        errors.push(`${batch[index].name}: ${result.error}`)
      }
    })
  }
  
  onProgress?.({ completed: files.length, total: files.length })
  
  const successCount = results.filter(r => r.success).length
  const failureCount = results.length - successCount
  
  return {
    success: failureCount === 0,
    results,
    errors,
    successCount,
    failureCount
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  filePath: string,
  bucket: BucketName
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])
    
    if (error) {
      return {
        success: false,
        error: error.message
      }
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown deletion error'
    }
  }
}

/**
 * Extract file path from Supabase public URL
 */
export function extractFilePathFromUrl(url: string, userId: string): string | null {
  try {
    const urlParts = url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    
    // Try to determine if it's an avatar or item image based on URL structure
    if (url.includes('/profile/')) {
      return `${userId}/profile/${fileName}`
    } else if (url.includes('/items/')) {
      return `${userId}/items/${fileName}`
    }
    
    // Fallback: assume it's in the user's folder
    return `${userId}/${fileName}`
  } catch {
    return null
  }
}

/**
 * Get file size display text
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Check if file type is supported image format
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Create a preview URL for a file
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Cleanup preview URLs to prevent memory leaks
 */
export function cleanupPreviewUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}
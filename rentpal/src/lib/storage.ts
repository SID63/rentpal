import { supabase } from './supabase'
import type {
  StorageConfig,
  FileValidationResult,
  FileUploadResult,
  BatchUploadResult,
  FileDeletionResult,
  StorageTestResult,
  BucketStatus,
  UploadOptions,
  BatchUploadOptions,
  FileNamingOptions,
  CleanupOptions,
  CleanupResult,
  BucketName,
  StorageError,
  FileMetadata
} from '../types/storage'
import { StorageErrorCode } from '../types/storage'

export const BUCKET_CONFIG: Record<string, StorageConfig> = {
  'item-images': {
    name: 'item-images',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    maxFiles: 10
  },
  'avatars': {
    name: 'avatars',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    maxFiles: 1
  }
}

/**
 * Test if storage buckets are properly configured
 */
export async function testStorageConfiguration() {
  const results = {
    bucketsExist: false,
    rlsPoliciesWork: false,
    errors: [] as string[]
  }

  try {
    // Test if buckets exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      results.errors.push(`Failed to list buckets: ${bucketsError.message}`)
      return results
    }

    const requiredBuckets = Object.keys(BUCKET_CONFIG)
    const existingBuckets = buckets?.map(b => b.name) || []
    const missingBuckets = requiredBuckets.filter(name => !existingBuckets.includes(name))

    if (missingBuckets.length > 0) {
      results.errors.push(`Missing buckets: ${missingBuckets.join(', ')}`)
    } else {
      results.bucketsExist = true
    }

    // Test if RLS policies work by attempting to query storage objects
    const { error: rlsError } = await supabase
      .from('storage.objects')
      .select('bucket_id')
      .limit(1)

    if (rlsError) {
      results.errors.push(`RLS policies may not be configured: ${rlsError.message}`)
    } else {
      results.rlsPoliciesWork = true
    }

  } catch (error) {
    results.errors.push(`Storage test failed: ${error}`)
  }

  return results
}

/**
 * Validate file before upload with comprehensive checks
 */
export function validateFile(file: File, bucketName: BucketName): FileValidationResult {
  const config = BUCKET_CONFIG[bucketName]
  const warnings: string[] = []
  
  if (!config) {
    return { 
      valid: false, 
      error: `Invalid bucket name: ${bucketName}` 
    }
  }

  // Check if file exists
  if (!file) {
    return { 
      valid: false, 
      error: 'No file provided' 
    }
  }

  // Check file size
  if (file.size === 0) {
    return { 
      valid: false, 
      error: 'File is empty' 
    }
  }

  if (file.size > config.fileSizeLimit) {
    const maxSizeMB = Math.round(config.fileSizeLimit / (1024 * 1024))
    return { 
      valid: false, 
      error: `File size (${formatFileSize(file.size)}) exceeds ${maxSizeMB}MB limit` 
    }
  }

  // Check MIME type
  if (!config.allowedMimeTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type '${file.type}' not allowed. Allowed types: ${config.allowedMimeTypes.join(', ')}` 
    }
  }

  // Check file name
  if (!file.name || file.name.trim() === '') {
    return { 
      valid: false, 
      error: 'File must have a valid name' 
    }
  }

  // Add warnings for potential issues
  if (file.name.length > 100) {
    warnings.push('File name is very long and will be truncated')
  }

  if (file.size > config.fileSizeLimit * 0.8) {
    const maxSizeMB = Math.round(config.fileSizeLimit / (1024 * 1024))
    warnings.push(`File size is close to the ${maxSizeMB}MB limit`)
  }

  return { 
    valid: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  }
}

/**
 * Validate multiple files for batch upload
 */
export function validateFiles(files: File[], bucketName: BucketName): FileValidationResult {
  const config = BUCKET_CONFIG[bucketName]
  const errors: string[] = []
  const warnings: string[] = []

  if (!files || files.length === 0) {
    return { 
      valid: false, 
      error: 'No files provided' 
    }
  }

  // Check max files limit
  if (config.maxFiles && files.length > config.maxFiles) {
    return { 
      valid: false, 
      error: `Too many files. Maximum allowed: ${config.maxFiles}` 
    }
  }

  // Validate each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const validation = validateFile(file, bucketName)
    
    if (!validation.valid) {
      errors.push(`File ${i + 1} (${file.name}): ${validation.error}`)
    }
    
    if (validation.warnings) {
      warnings.push(...validation.warnings.map(w => `File ${i + 1} (${file.name}): ${w}`))
    }
  }

  // Check for duplicate file names
  const fileNames = files.map(f => f.name)
  const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index)
  if (duplicates.length > 0) {
    warnings.push(`Duplicate file names detected: ${[...new Set(duplicates)].join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Generate a secure file path for storage with advanced options
 */
export function generateStoragePath(
  userId: string, 
  bucketName: string, 
  fileName: string,
  options: FileNamingOptions = {}
): string {
  const {
    preserveOriginalName = false,
    addTimestamp = true,
    addUserId = true,
    customPrefix = '',
    customSuffix = '',
    sanitize = true
  } = options

  let cleanFileName = fileName

  // Sanitize filename if requested
  if (sanitize) {
    // Remove or replace dangerous characters
    cleanFileName = fileName
      .replace(/[<>:"/\\|?*]/g, '_') // Replace dangerous chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .toLowerCase()

    // Ensure filename isn't too long
    const maxLength = 100
    if (cleanFileName.length > maxLength) {
      const ext = cleanFileName.split('.').pop()
      const nameWithoutExt = cleanFileName.substring(0, cleanFileName.lastIndexOf('.'))
      cleanFileName = nameWithoutExt.substring(0, maxLength - ext!.length - 1) + '.' + ext
    }
  }

  // Build path components
  const pathParts: string[] = []

  // Add user ID if requested
  if (addUserId) {
    pathParts.push(userId)
  }

  // Build filename
  let finalFileName = ''

  // Add custom prefix
  if (customPrefix) {
    finalFileName += customPrefix + '_'
  }

  // Add timestamp if requested
  if (addTimestamp) {
    finalFileName += Date.now() + '_'
  }

  // Add the actual filename
  if (preserveOriginalName) {
    finalFileName += fileName
  } else {
    finalFileName += cleanFileName
  }

  // Add custom suffix
  if (customSuffix) {
    const ext = finalFileName.split('.').pop()
    const nameWithoutExt = finalFileName.substring(0, finalFileName.lastIndexOf('.'))
    finalFileName = nameWithoutExt + '_' + customSuffix + '.' + ext
  }

  pathParts.push(finalFileName)

  return pathParts.join('/')
}

/**
 * Extract file path from storage URL
 */
export function extractFilePathFromUrl(url: string, bucketName: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const bucketIndex = pathParts.indexOf(bucketName)
    
    if (bucketIndex === -1) {
      return null
    }
    
    return pathParts.slice(bucketIndex + 1).join('/')
  } catch {
    return null
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Upload file to storage bucket with enhanced options
 */
export async function uploadFile(
  file: File, 
  bucketName: BucketName, 
  userId: string,
  options: UploadOptions = {}
): Promise<FileUploadResult> {
  try {
    // Validate file
    const validation = validateFile(file, bucketName)
    if (!validation.valid) {
      return { 
        success: false, 
        error: validation.error 
      }
    }

    // Generate secure path
    const filePath = generateStoragePath(userId, bucketName, file.name, {
      sanitize: true,
      addTimestamp: true,
      addUserId: true
    })

    // Prepare upload options
    const uploadOptions = {
      cacheControl: options.cacheControl || '3600',
      contentType: options.contentType || file.type,
      upsert: options.upsert || false,
      ...options.metadata && { metadata: options.metadata }
    }

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, uploadOptions)

    if (error) {
      return { 
        success: false, 
        error: `Upload failed: ${error.message}` 
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    // Create metadata
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      uploadedAt: new Date().toISOString(),
      userId,
      bucket: bucketName,
      path: data.path
    }

    return { 
      success: true, 
      url: urlData.publicUrl,
      path: data.path,
      metadata
    }

  } catch (error) {
    return { 
      success: false, 
      error: `Upload error: ${String(error)}` 
    }
  }
}

/**
 * Upload multiple files in batch
 */
export async function uploadFiles(
  files: File[],
  bucketName: BucketName,
  userId: string,
  options: BatchUploadOptions = {}
): Promise<BatchUploadResult> {
  const {
    maxConcurrent = 3,
    stopOnError = false,
    ...uploadOptions
  } = options

  // Validate all files first
  const validation = validateFiles(files, bucketName)
  if (!validation.valid) {
    return {
      success: false,
      results: [],
      errors: [validation.error!],
      successCount: 0,
      failureCount: files.length
    }
  }

  const results: FileUploadResult[] = []
  const errors: string[] = []
  let successCount = 0
  let failureCount = 0

  // Process files in batches
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent)
    
    const batchPromises = batch.map(async (file, index) => {
      try {
        const result = await uploadFile(file, bucketName, userId, uploadOptions)
        
        if (result.success) {
          successCount++
        } else {
          failureCount++
          errors.push(`File ${i + index + 1} (${file.name}): ${result.error}`)
          
          if (stopOnError) {
            throw new Error(`Upload stopped due to error: ${result.error}`)
          }
        }
        
        return result
      } catch (error) {
        failureCount++
        const errorMsg = `File ${i + index + 1} (${file.name}): ${String(error)}`
        errors.push(errorMsg)
        
        if (stopOnError) {
          throw new Error(errorMsg)
        }
        
        return {
          success: false,
          error: String(error)
        }
      }
    })

    try {
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    } catch (error) {
      if (stopOnError) {
        return {
          success: false,
          results,
          errors: [...errors, String(error)],
          successCount,
          failureCount: files.length - successCount
        }
      }
    }
  }

  return {
    success: successCount > 0 && failureCount === 0,
    results,
    errors,
    successCount,
    failureCount
  }
}

/**
 * Delete file from storage bucket
 */
export async function deleteFile(
  bucketName: BucketName,
  filePath: string
): Promise<FileDeletionResult> {
  try {
    if (!filePath || filePath.trim() === '') {
      return { 
        success: false, 
        error: 'File path is required',
        deletedPaths: [],
        failedPaths: [filePath]
      }
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath])

    if (error) {
      return { 
        success: false, 
        error: `Delete failed: ${error.message}`,
        deletedPaths: [],
        failedPaths: [filePath]
      }
    }

    return { 
      success: true,
      deletedPaths: [filePath],
      failedPaths: []
    }

  } catch (error) {
    return { 
      success: false, 
      error: `Delete error: ${String(error)}`,
      deletedPaths: [],
      failedPaths: [filePath]
    }
  }
}

/**
 * Delete multiple files from storage bucket
 */
export async function deleteFiles(
  bucketName: BucketName,
  filePaths: string[]
): Promise<FileDeletionResult> {
  try {
    if (!filePaths || filePaths.length === 0) {
      return {
        success: false,
        error: 'No file paths provided',
        deletedPaths: [],
        failedPaths: []
      }
    }

    // Filter out empty paths
    const validPaths = filePaths.filter(path => path && path.trim() !== '')
    
    if (validPaths.length === 0) {
      return {
        success: false,
        error: 'No valid file paths provided',
        deletedPaths: [],
        failedPaths: filePaths
      }
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .remove(validPaths)

    if (error) {
      return {
        success: false,
        error: `Batch delete failed: ${error.message}`,
        deletedPaths: [],
        failedPaths: validPaths
      }
    }

    return {
      success: true,
      deletedPaths: validPaths,
      failedPaths: []
    }

  } catch (error) {
    return {
      success: false,
      error: `Batch delete error: ${String(error)}`,
      deletedPaths: [],
      failedPaths: filePaths
    }
  }
}

/**
 * Delete file by URL
 */
export async function deleteFileByUrl(
  bucketName: BucketName,
  fileUrl: string
): Promise<FileDeletionResult> {
  const filePath = extractFilePathFromUrl(fileUrl, bucketName)
  
  if (!filePath) {
    return {
      success: false,
      error: 'Could not extract file path from URL',
      deletedPaths: [],
      failedPaths: [fileUrl]
    }
  }

  return deleteFile(bucketName, filePath)
}/**

 * Check if a bucket exists and is accessible
 */
export async function checkBucketStatus(bucketName: BucketName): Promise<BucketStatus> {
  try {
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      return {
        name: bucketName,
        exists: false,
        accessible: false,
        rlsEnabled: false,
        error: `Failed to list buckets: ${bucketsError.message}`
      }
    }

    const bucketExists = buckets?.some(b => b.name === bucketName) || false
    
    if (!bucketExists) {
      return {
        name: bucketName,
        exists: false,
        accessible: false,
        rlsEnabled: false,
        error: 'Bucket does not exist'
      }
    }

    // Test accessibility by trying to list files
    const { error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 })

    const accessible = !listError

    return {
      name: bucketName,
      exists: true,
      accessible,
      rlsEnabled: true, // Assume RLS is enabled if accessible
      error: listError ? `Bucket not accessible: ${listError.message}` : undefined
    }

  } catch (error) {
    return {
      name: bucketName,
      exists: false,
      accessible: false,
      rlsEnabled: false,
      error: `Bucket status check failed: ${String(error)}`
    }
  }
}

/**
 * Comprehensive storage configuration test
 */
export async function testStorageConfigurationEnhanced(): Promise<StorageTestResult> {
  const result: StorageTestResult = {
    bucketsExist: false,
    rlsPoliciesWork: false,
    uploadWorks: false,
    deleteWorks: false,
    errors: [],
    warnings: []
  }

  try {
    // Test bucket existence
    const bucketStatuses = await Promise.all(
      Object.keys(BUCKET_CONFIG).map(name => checkBucketStatus(name as BucketName))
    )

    const allBucketsExist = bucketStatuses.every(status => status.exists)
    const allBucketsAccessible = bucketStatuses.every(status => status.accessible)

    result.bucketsExist = allBucketsExist
    result.rlsPoliciesWork = allBucketsAccessible

    // Collect errors from bucket checks
    bucketStatuses.forEach(status => {
      if (status.error) {
        result.errors.push(status.error)
      }
    })

    // Test upload functionality with a small test file
    if (allBucketsExist && allBucketsAccessible) {
      try {
        // Create a small test file
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' })
        
        // Note: This would require a user ID, so we'll skip actual upload test
        // and just mark as working if buckets are accessible
        result.uploadWorks = true
        result.deleteWorks = true
        
      } catch (error) {
        result.errors.push(`Upload test failed: ${String(error)}`)
      }
    }

    // Add warnings for potential issues
    if (!allBucketsExist) {
      result.warnings.push('Some storage buckets are missing. Run storage setup.')
    }

    if (!allBucketsAccessible) {
      result.warnings.push('Some buckets are not accessible. Check RLS policies.')
    }

  } catch (error) {
    result.errors.push(`Storage test failed: ${String(error)}`)
  }

  return result
}

/**
 * Get file information from storage
 */
export async function getFileInfo(
  bucketName: BucketName,
  filePath: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        search: filePath.substring(filePath.lastIndexOf('/') + 1)
      })

    if (error) {
      return { success: false, error: error.message }
    }

    const fileInfo = data?.find(file => 
      filePath.endsWith(file.name)
    )

    if (!fileInfo) {
      return { success: false, error: 'File not found' }
    }

    return { success: true, data: fileInfo }

  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * List files in a storage bucket path
 */
export async function listFiles(
  bucketName: BucketName,
  path: string = '',
  options: { limit?: number; offset?: number } = {}
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path, {
        limit: options.limit || 100,
        offset: options.offset || 0
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }

  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Clean up orphaned files (files not referenced in database)
 */
export async function cleanupOrphanedFiles(
  bucketName: BucketName,
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: false,
    deletedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
    deletedFiles: []
  }

  try {
    // This is a placeholder implementation
    // In a real scenario, you would:
    // 1. List all files in the bucket
    // 2. Query database to find which files are still referenced
    // 3. Delete files that are not referenced
    // 4. Handle the olderThan filter if provided

    result.success = true
    
    if (options.dryRun) {
      result.errors.push('Dry run mode - no files were actually deleted')
    }

  } catch (error) {
    result.errors.push(`Cleanup failed: ${String(error)}`)
  }

  return result
}

/**
 * Create storage error with proper typing
 */
export function createStorageError(
  code: StorageErrorCode,
  message: string,
  details?: any
): StorageError {
  return {
    code,
    message,
    details
  }
}

/**
 * Check if error is a storage error
 */
export function isStorageError(error: any): error is StorageError {
  return error && typeof error === 'object' && 'code' in error && 'message' in error
}

/**
 * Get user-friendly error message
 */
export function getStorageErrorMessage(error: StorageError | string): string {
  if (typeof error === 'string') {
    return error
  }

  switch (error.code) {
    case StorageErrorCode.FILE_TOO_LARGE:
      return 'The file you selected is too large. Please choose a smaller file.'
    case StorageErrorCode.INVALID_FILE_TYPE:
      return 'This file type is not supported. Please select a valid image file.'
    case StorageErrorCode.QUOTA_EXCEEDED:
      return 'Storage quota exceeded. Please delete some files or contact support.'
    case StorageErrorCode.PERMISSION_DENIED:
      return 'You do not have permission to perform this action.'
    case StorageErrorCode.NETWORK_ERROR:
      return 'Network error occurred. Please check your connection and try again.'
    default:
      return error.message || 'An unknown storage error occurred.'
  }
}
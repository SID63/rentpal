// Storage-related TypeScript interfaces and types

/**
 * Storage bucket configuration interface
 */
export interface StorageConfig {
  name: string
  public: boolean
  allowedMimeTypes: string[]
  fileSizeLimit: number
  maxFiles?: number
}

/**
 * File validation result interface
 */
export interface FileValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
}

/**
 * File upload result interface
 */
export interface FileUploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
  metadata?: FileMetadata
}

/**
 * File metadata interface
 */
export interface FileMetadata {
  name: string
  size: number
  type: string
  lastModified: number
  uploadedAt: string
  userId: string
  bucket: string
  path: string
}

/**
 * Batch upload result interface
 */
export interface BatchUploadResult {
  success: boolean
  results: FileUploadResult[]
  errors: string[]
  successCount: number
  failureCount: number
}

/**
 * Storage operation result interface
 */
export interface StorageOperationResult {
  success: boolean
  error?: string
  data?: any
}

/**
 * File deletion result interface
 */
export interface FileDeletionResult {
  success: boolean
  error?: string
  deletedPaths: string[]
  failedPaths: string[]
}

/**
 * Storage bucket status interface
 */
export interface BucketStatus {
  name: string
  exists: boolean
  accessible: boolean
  rlsEnabled: boolean
  error?: string
}

/**
 * Storage configuration test result interface
 */
export interface StorageTestResult {
  bucketsExist: boolean
  rlsPoliciesWork: boolean
  uploadWorks: boolean
  deleteWorks: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Upload progress interface
 */
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  file: string
}

/**
 * Upload options interface
 */
export interface UploadOptions {
  cacheControl?: string
  contentType?: string
  upsert?: boolean
  metadata?: Record<string, any>
  onProgress?: (progress: UploadProgress) => void
}

/**
 * Batch upload options interface
 */
export interface BatchUploadOptions extends UploadOptions {
  maxConcurrent?: number
  stopOnError?: boolean
}

/**
 * File naming options interface
 */
export interface FileNamingOptions {
  preserveOriginalName?: boolean
  addTimestamp?: boolean
  addUserId?: boolean
  customPrefix?: string
  customSuffix?: string
  sanitize?: boolean
}

/**
 * Storage cleanup options interface
 */
export interface CleanupOptions {
  olderThan?: Date
  buckets?: string[]
  dryRun?: boolean
  batchSize?: number
}

/**
 * Storage cleanup result interface
 */
export interface CleanupResult {
  success: boolean
  deletedCount: number
  skippedCount: number
  errorCount: number
  errors: string[]
  deletedFiles: string[]
}

/**
 * Supported bucket names type
 */
export type BucketName = 'item-images' | 'avatars'

/**
 * Supported image formats type
 */
export type SupportedImageFormat = 'image/jpeg' | 'image/png' | 'image/webp'

/**
 * File size limits type
 */
export type FileSizeLimit = {
  bytes: number
  mb: number
  displayText: string
}

/**
 * Storage error codes enum
 */
export enum StorageErrorCode {
  INVALID_BUCKET = 'INVALID_BUCKET',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  BUCKET_NOT_FOUND = 'BUCKET_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

/**
 * Storage error interface
 */
export interface StorageError {
  code: StorageErrorCode
  message: string
  details?: any
  file?: string
  bucket?: string
}
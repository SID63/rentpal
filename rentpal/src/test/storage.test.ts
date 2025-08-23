import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import { 
  validateFile,
  validateFiles,
  generateStoragePath, 
  uploadFile,
  uploadFiles,
  deleteFile,
  deleteFiles,
  deleteFileByUrl,
  testStorageConfiguration,
  testStorageConfigurationEnhanced,
  checkBucketStatus,
  getFileInfo,
  listFiles,
  extractFilePathFromUrl,
  formatFileSize,
  createStorageError,
  isStorageError,
  getStorageErrorMessage,
  BUCKET_CONFIG 
} from '../lib/storage'
import { StorageErrorCode } from '../types/storage'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      listBuckets: vi.fn(),
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(),
        list: vi.fn()
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }
}))

describe('Storage Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateFile', () => {
    it('should validate a correct image file', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const result = validateFile(file, 'item-images')
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject files that are too large', () => {
      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const result = validateFile(largeFile, 'item-images')
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds')
    })

    it('should reject invalid file types', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const result = validateFile(file, 'item-images')
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('should reject invalid bucket names', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const result = validateFile(file, 'invalid-bucket' as any)
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid bucket')
    })

    it('should reject empty files', () => {
      const file = new File([], 'empty.jpg', { type: 'image/jpeg' })
      const result = validateFile(file, 'item-images')
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should add warnings for large files near limit', () => {
      // Create a file close to but under the 5MB limit
      const nearLimitFile = new File(['x'.repeat(4.5 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const result = validateFile(nearLimitFile, 'item-images')
      
      expect(result.valid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings![0]).toContain('close to the')
    })
  })

  describe('validateFiles', () => {
    it('should validate multiple files successfully', () => {
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.png', { type: 'image/png' })
      ]
      const result = validateFiles(files, 'item-images')
      
      expect(result.valid).toBe(true)
    })

    it('should reject when too many files', () => {
      const files = Array.from({ length: 15 }, (_, i) => 
        new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
      )
      const result = validateFiles(files, 'item-images')
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Too many files')
    })

    it('should detect duplicate file names', () => {
      const files = [
        new File(['test1'], 'test.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test.jpg', { type: 'image/jpeg' })
      ]
      const result = validateFiles(files, 'item-images')
      
      expect(result.valid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings![0]).toContain('Duplicate file names')
    })
  })

  describe('generateStoragePath', () => {
    it('should generate a secure path with user ID and timestamp', () => {
      const userId = 'user123'
      const bucketName = 'item-images'
      const fileName = 'test image.jpg'
      
      const path = generateStoragePath(userId, bucketName, fileName)
      
      expect(path).toMatch(/^user123\/\d+_test_image\.jpg$/)
    })

    it('should sanitize dangerous characters', () => {
      const userId = 'user123'
      const bucketName = 'item-images'
      const fileName = 'test<>file.jpg'
      
      const path = generateStoragePath(userId, bucketName, fileName)
      
      expect(path).not.toContain('<')
      expect(path).not.toContain('>')
    })

    it('should handle custom options', () => {
      const userId = 'user123'
      const bucketName = 'item-images'
      const fileName = 'test.jpg'
      
      const path = generateStoragePath(userId, bucketName, fileName, {
        customPrefix: 'prefix',
        customSuffix: 'suffix',
        addTimestamp: false
      })
      
      expect(path).toContain('prefix_')
      expect(path).toContain('_suffix')
    })
  })

  describe('extractFilePathFromUrl', () => {
    it('should extract file path from storage URL', () => {
      const url = 'https://example.supabase.co/storage/v1/object/public/item-images/user123/test.jpg'
      const path = extractFilePathFromUrl(url, 'item-images')
      
      expect(path).toBe('user123/test.jpg')
    })

    it('should return null for invalid URLs', () => {
      const url = 'invalid-url'
      const path = extractFilePathFromUrl(url, 'item-images')
      
      expect(path).toBeNull()
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })

  describe('uploadFile', () => {
    it('should upload a valid file successfully', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'user123/123456_test.jpg' },
        error: null
      })
      
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' }
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl
      } as any)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const result = await uploadFile(file, 'item-images', 'user123')

      expect(result.success).toBe(true)
      expect(result.url).toBe('https://example.com/test.jpg')
      expect(result.metadata).toBeDefined()
      expect(mockUpload).toHaveBeenCalled()
    })

    it('should handle upload errors', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' }
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload
      } as any)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const result = await uploadFile(file, 'item-images', 'user123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Upload failed')
    })
  })

  describe('uploadFiles', () => {
    it('should upload multiple files successfully', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'user123/test.jpg' },
        error: null
      })
      
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' }
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl
      } as any)

      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ]
      
      const result = await uploadFiles(files, 'item-images', 'user123')

      expect(result.success).toBe(true)
      expect(result.successCount).toBe(2)
      expect(result.failureCount).toBe(0)
    })
  })

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      const mockRemove = vi.fn().mockResolvedValue({
        error: null
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove
      } as any)

      const result = await deleteFile('item-images', 'user123/test.jpg')

      expect(result.success).toBe(true)
      expect(result.deletedPaths).toContain('user123/test.jpg')
      expect(mockRemove).toHaveBeenCalledWith(['user123/test.jpg'])
    })

    it('should handle delete errors', async () => {
      const mockRemove = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' }
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove
      } as any)

      const result = await deleteFile('item-images', 'user123/test.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Delete failed')
      expect(result.failedPaths).toContain('user123/test.jpg')
    })
  })

  describe('Storage Error Handling', () => {
    it('should create storage errors correctly', () => {
      const error = createStorageError(
        StorageErrorCode.FILE_TOO_LARGE,
        'File is too large'
      )
      
      expect(error.code).toBe(StorageErrorCode.FILE_TOO_LARGE)
      expect(error.message).toBe('File is too large')
    })

    it('should identify storage errors', () => {
      const storageError = createStorageError(
        StorageErrorCode.INVALID_FILE_TYPE,
        'Invalid file type'
      )
      const regularError = new Error('Regular error')
      
      expect(isStorageError(storageError)).toBe(true)
      expect(isStorageError(regularError)).toBe(false)
    })

    it('should provide user-friendly error messages', () => {
      const error = createStorageError(
        StorageErrorCode.FILE_TOO_LARGE,
        'File too large'
      )
      
      const message = getStorageErrorMessage(error)
      expect(message).toContain('too large')
      expect(message).toContain('smaller file')
    })
  })

  describe('checkBucketStatus', () => {
    it('should check bucket status successfully', async () => {
      const mockListBuckets = vi.fn().mockResolvedValue({
        data: [{ name: 'item-images' }],
        error: null
      })

      const mockList = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      vi.mocked(supabase.storage.listBuckets).mockImplementation(mockListBuckets)
      vi.mocked(supabase.storage.from).mockReturnValue({
        list: mockList
      } as any)

      const result = await checkBucketStatus('item-images')

      expect(result.exists).toBe(true)
      expect(result.accessible).toBe(true)
    })
  })

  describe('testStorageConfiguration', () => {
    it('should test storage configuration successfully', async () => {
      const mockListBuckets = vi.fn().mockResolvedValue({
        data: [
          { name: 'item-images' },
          { name: 'avatars' }
        ],
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      vi.mocked(supabase.storage.listBuckets).mockImplementation(mockListBuckets)
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      const result = await testStorageConfiguration()

      expect(result.bucketsExist).toBe(true)
      expect(result.rlsPoliciesWork).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing buckets', async () => {
      const mockListBuckets = vi.fn().mockResolvedValue({
        data: [
          { name: 'item-images' }
          // Missing 'avatars' bucket
        ],
        error: null
      })

      vi.mocked(supabase.storage.listBuckets).mockImplementation(mockListBuckets)

      const result = await testStorageConfiguration()

      expect(result.bucketsExist).toBe(false)
      expect(result.errors).toContain('Missing buckets: avatars')
    })
  })
})
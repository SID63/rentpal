import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateFile,
  generateFileName,
  uploadFile,
  uploadFiles,
  deleteFile,
  extractFilePathFromUrl,
  formatFileSize,
  isImageFile,
  BUCKET_CONFIG
} from '../storage-utils'
import { supabase } from '../supabase'

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn()
      }))
    }
  }
}))

describe('storage-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateFile', () => {
    it('validates file type correctly', () => {
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      expect(validateFile(validFile, 'item-images')).toEqual({ valid: true })
      expect(validateFile(invalidFile, 'item-images')).toEqual({
        valid: false,
        error: expect.stringContaining('File type text/plain is not allowed')
      })
    })

    it('validates file size correctly', () => {
      const smallFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(smallFile, 'size', { value: 1024 * 1024 }) // 1MB

      const largeFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 }) // 10MB

      expect(validateFile(smallFile, 'item-images')).toEqual({ valid: true })
      expect(validateFile(largeFile, 'item-images')).toEqual({
        valid: false,
        error: expect.stringContaining('exceeds limit of 5MB')
      })
    })

    it('validates avatar files with different limits', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 }) // 3MB

      expect(validateFile(file, 'item-images')).toEqual({ valid: true })
      expect(validateFile(file, 'avatars')).toEqual({
        valid: false,
        error: expect.stringContaining('exceeds limit of 2MB')
      })
    })
  })

  describe('generateFileName', () => {
    const userId = 'user-123'

    it('generates basic filename with timestamp', () => {
      const result = generateFileName('test.jpg', userId)
      expect(result).toMatch(/^\d+-image\.jpg$/)
    })

    it('preserves original name when requested', () => {
      const result = generateFileName('my-photo.jpg', userId, { 
        preserveOriginalName: true 
      })
      expect(result).toMatch(/^\d+-my-photo\.jpg$/)
    })

    it('adds custom prefix and suffix', () => {
      const result = generateFileName('test.jpg', userId, {
        customPrefix: 'item',
        customSuffix: 'main'
      })
      expect(result).toMatch(/^item-\d+-image-main\.jpg$/)
    })

    it('sanitizes filename', () => {
      const result = generateFileName('test file!@#.jpg', userId, {
        preserveOriginalName: true,
        sanitize: true
      })
      expect(result).toMatch(/^\d+-test-file---\.jpg$/)
    })
  })

  describe('uploadFile', () => {
    const mockUpload = vi.fn()
    const mockGetPublicUrl = vi.fn()

    beforeEach(() => {
      const mockStorage = {
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl
      }
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any)
    })

    it('uploads file successfully', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const userId = 'user-123'

      mockUpload.mockResolvedValue({ error: null })
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/image.jpg' }
      })

      const result = await uploadFile(file, 'item-images', userId)

      expect(result.success).toBe(true)
      expect(result.url).toBe('https://example.com/image.jpg')
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-123\/items\/.*\.jpg$/),
        file,
        expect.objectContaining({ cacheControl: '3600', upsert: false })
      )
    })

    it('handles upload errors', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const userId = 'user-123'

      mockUpload.mockResolvedValue({ 
        error: { message: 'Upload failed' } 
      })

      const result = await uploadFile(file, 'item-images', userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload failed')
    })

    it('handles bucket not found error', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const userId = 'user-123'

      mockUpload.mockResolvedValue({ 
        error: { message: 'Bucket not found' } 
      })

      const result = await uploadFile(file, 'item-images', userId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Storage bucket \'item-images\' not found')
    })

    it('validates file before upload', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const userId = 'user-123'

      const result = await uploadFile(file, 'item-images', userId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('File type text/plain is not allowed')
      expect(mockUpload).not.toHaveBeenCalled()
    })
  })

  describe('uploadFiles', () => {
    it('uploads multiple files with progress tracking', async () => {
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ]
      const userId = 'user-123'
      const onProgress = vi.fn()

      const mockUpload = vi.fn().mockResolvedValue({ error: null })
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/image.jpg' }
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl
      } as any)

      const result = await uploadFiles(files, 'item-images', userId, { onProgress })

      expect(result.success).toBe(true)
      expect(result.successCount).toBe(2)
      expect(result.failureCount).toBe(0)
      expect(onProgress).toHaveBeenCalled()
    })
  })

  describe('deleteFile', () => {
    it('deletes file successfully', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove
      } as any)

      const result = await deleteFile('user-123/items/test.jpg', 'item-images')

      expect(result.success).toBe(true)
      expect(mockRemove).toHaveBeenCalledWith(['user-123/items/test.jpg'])
    })

    it('handles deletion errors', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ 
        error: { message: 'File not found' } 
      })
      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove
      } as any)

      const result = await deleteFile('user-123/items/test.jpg', 'item-images')

      expect(result.success).toBe(false)
      expect(result.error).toBe('File not found')
    })
  })

  describe('extractFilePathFromUrl', () => {
    it('extracts path from item image URL', () => {
      const url = 'https://example.com/storage/v1/object/public/item-images/user-123/items/test.jpg'
      const result = extractFilePathFromUrl(url, 'user-123')
      expect(result).toBe('user-123/items/test.jpg')
    })

    it('extracts path from profile image URL', () => {
      const url = 'https://example.com/storage/v1/object/public/avatars/user-123/profile/avatar.jpg'
      const result = extractFilePathFromUrl(url, 'user-123')
      expect(result).toBe('user-123/profile/avatar.jpg')
    })

    it('handles invalid URLs', () => {
      const result = extractFilePathFromUrl('invalid-url', 'user-123')
      expect(result).toBe('user-123/invalid-url')
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })
  })

  describe('isImageFile', () => {
    it('identifies image files correctly', () => {
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      expect(isImageFile(imageFile)).toBe(true)
      expect(isImageFile(textFile)).toBe(false)
    })
  })

  describe('BUCKET_CONFIG', () => {
    it('has correct configuration for item-images', () => {
      const config = BUCKET_CONFIG['item-images']
      expect(config.public).toBe(true)
      expect(config.allowedMimeTypes).toContain('image/jpeg')
      expect(config.fileSizeLimit).toBe(5 * 1024 * 1024)
      expect(config.maxFiles).toBe(10)
    })

    it('has correct configuration for avatars', () => {
      const config = BUCKET_CONFIG['avatars']
      expect(config.public).toBe(true)
      expect(config.allowedMimeTypes).toContain('image/jpeg')
      expect(config.fileSizeLimit).toBe(2 * 1024 * 1024)
      expect(config.maxFiles).toBe(1)
    })
  })
})
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { imageService } from '../imageService'
import { supabase } from '@/lib/supabase'

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(),
            limit: vi.fn()
          }))
        }))
      }))
    }))
  }
}))

// Mock the storage functions
vi.mock('@/lib/storage', () => ({
  uploadFiles: vi.fn(),
  deleteFileByUrl: vi.fn()
}))

describe('ImageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('associateImagesWithItem', () => {
    it('should successfully associate images with an item', async () => {
      const mockImages = [
        {
          id: '1',
          item_id: 'item-1',
          image_url: 'https://example.com/image1.jpg',
          alt_text: 'Image 1',
          sort_order: 0,
          is_primary: true,
          created_at: new Date().toISOString()
        }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockImages,
        error: null
      })

      const result = await imageService.associateImagesWithItem(
        'item-1',
        ['https://example.com/image1.jpg'],
        { altTexts: ['Image 1'], makePrimary: true }
      )

      expect(result.success).toBe(true)
      expect(result.images).toEqual(mockImages)
      expect(supabase.rpc).toHaveBeenCalledWith('batch_insert_item_images', {
        p_item_id: 'item-1',
        p_image_urls: ['https://example.com/image1.jpg'],
        p_alt_texts: ['Image 1'],
        p_make_first_primary: true
      })
    })

    it('should handle empty image URLs', async () => {
      const result = await imageService.associateImagesWithItem('item-1', [])

      expect(result.success).toBe(true)
      expect(result.images).toEqual([])
      expect(supabase.rpc).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      const result = await imageService.associateImagesWithItem(
        'item-1',
        ['https://example.com/image1.jpg']
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error')
    })
  })

  describe('reorderItemImages', () => {
    it('should successfully reorder images', async () => {
      const mockImages = [
        {
          id: '2',
          item_id: 'item-1',
          image_url: 'https://example.com/image2.jpg',
          alt_text: null,
          sort_order: 0,
          is_primary: false,
          created_at: new Date().toISOString()
        },
        {
          id: '1',
          item_id: 'item-1',
          image_url: 'https://example.com/image1.jpg',
          alt_text: null,
          sort_order: 1,
          is_primary: true,
          created_at: new Date().toISOString()
        }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockImages,
        error: null
      })

      const result = await imageService.reorderItemImages('item-1', ['2', '1'])

      expect(result.success).toBe(true)
      expect(result.images).toEqual(mockImages)
      expect(supabase.rpc).toHaveBeenCalledWith('reorder_item_images', {
        p_item_id: 'item-1',
        p_image_ids: ['2', '1']
      })
    })

    it('should handle empty image IDs', async () => {
      const result = await imageService.reorderItemImages('item-1', [])

      expect(result.success).toBe(true)
      expect(result.images).toEqual([])
      expect(supabase.rpc).not.toHaveBeenCalled()
    })
  })

  describe('setPrimaryImage', () => {
    it('should successfully set primary image', async () => {
      const mockImages = [
        {
          id: '1',
          item_id: 'item-1',
          image_url: 'https://example.com/image1.jpg',
          alt_text: null,
          sort_order: 0,
          is_primary: true,
          created_at: new Date().toISOString()
        }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockImages,
        error: null
      })

      const result = await imageService.setPrimaryImage('item-1', '1')

      expect(result.success).toBe(true)
      expect(result.images).toEqual(mockImages)
      expect(supabase.rpc).toHaveBeenCalledWith('set_primary_item_image', {
        p_item_id: 'item-1',
        p_image_id: '1'
      })
    })
  })

  describe('deleteImagesByIds', () => {
    it('should successfully delete images', async () => {
      const mockDeletedUrls = [
        { deleted_image_url: 'https://example.com/image1.jpg' },
        { deleted_image_url: 'https://example.com/image2.jpg' }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockDeletedUrls,
        error: null
      })

      // Mock the deleteImagesByUrls method
      const deleteImagesByUrlsSpy = vi.spyOn(imageService, 'deleteImagesByUrls')
        .mockResolvedValue({
          success: true,
          deletedCount: 2,
          errors: []
        })

      const result = await imageService.deleteImagesByIds(['1', '2'])

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(2)
      expect(supabase.rpc).toHaveBeenCalledWith('delete_item_images_by_ids', {
        p_image_ids: ['1', '2']
      })
      expect(deleteImagesByUrlsSpy).toHaveBeenCalledWith([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ])

      deleteImagesByUrlsSpy.mockRestore()
    })

    it('should handle empty image IDs', async () => {
      const result = await imageService.deleteImagesByIds([])

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(0)
      expect(supabase.rpc).not.toHaveBeenCalled()
    })
  })

  describe('deleteAllItemImages', () => {
    it('should successfully delete all item images', async () => {
      const mockDeletedUrls = [
        { deleted_image_url: 'https://example.com/image1.jpg' }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockDeletedUrls,
        error: null
      })

      // Mock the deleteImagesByUrls method
      const deleteImagesByUrlsSpy = vi.spyOn(imageService, 'deleteImagesByUrls')
        .mockResolvedValue({
          success: true,
          deletedCount: 1,
          errors: []
        })

      const result = await imageService.deleteAllItemImages('item-1')

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(1)
      expect(supabase.rpc).toHaveBeenCalledWith('delete_all_item_images', {
        p_item_id: 'item-1'
      })

      deleteImagesByUrlsSpy.mockRestore()
    })
  })

  describe('uploadAndAssociateImages', () => {
    it('should successfully upload and associate images', async () => {
      const mockFiles = [
        new File(['test'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test'], 'test2.jpg', { type: 'image/jpeg' })
      ]

      const mockUploadResult = {
        success: true,
        results: [
          { success: true, url: 'https://example.com/uploaded1.jpg' },
          { success: true, url: 'https://example.com/uploaded2.jpg' }
        ],
        errors: [],
        successCount: 2,
        failureCount: 0
      }

      const mockImages = [
        {
          id: '1',
          item_id: 'item-1',
          image_url: 'https://example.com/uploaded1.jpg',
          alt_text: null,
          sort_order: 0,
          is_primary: true,
          created_at: new Date().toISOString()
        }
      ]

      // Mock uploadFiles
      const { uploadFiles } = await import('@/lib/storage')
      vi.mocked(uploadFiles).mockResolvedValue(mockUploadResult)

      // Mock associateImagesWithItem
      const associateImagesSpy = vi.spyOn(imageService, 'associateImagesWithItem')
        .mockResolvedValue({
          success: true,
          images: mockImages
        })

      const result = await imageService.uploadAndAssociateImages(
        'item-1',
        mockFiles,
        'user-1',
        { makePrimary: true }
      )

      expect(result.success).toBe(true)
      expect(result.uploadedImages).toEqual(mockImages)
      expect(result.failedUploads).toEqual([])
      expect(uploadFiles).toHaveBeenCalledWith(
        mockFiles,
        'item-images',
        'user-1',
        { maxConcurrent: 3, stopOnError: false }
      )
      expect(associateImagesSpy).toHaveBeenCalledWith(
        'item-1',
        ['https://example.com/uploaded1.jpg', 'https://example.com/uploaded2.jpg'],
        { makePrimary: true }
      )

      associateImagesSpy.mockRestore()
    })

    it('should handle upload failures', async () => {
      const mockFiles = [
        new File(['test'], 'test1.jpg', { type: 'image/jpeg' })
      ]

      const mockUploadResult = {
        success: false,
        results: [
          { success: false, error: 'Upload failed' }
        ],
        errors: ['Upload failed'],
        successCount: 0,
        failureCount: 1
      }

      // Mock uploadFiles
      const { uploadFiles } = await import('@/lib/storage')
      vi.mocked(uploadFiles).mockResolvedValue(mockUploadResult)

      const result = await imageService.uploadAndAssociateImages(
        'item-1',
        mockFiles,
        'user-1'
      )

      expect(result.success).toBe(false)
      expect(result.uploadedImages).toEqual([])
      expect(result.failedUploads).toEqual(['test1.jpg'])
      expect(result.errors).toContain('No images were successfully uploaded')
    })
  })

  describe('cleanupOrphanedImages', () => {
    it('should successfully cleanup orphaned images', async () => {
      const mockOrphanedImages = [
        {
          orphaned_image_id: '1',
          orphaned_image_url: 'https://example.com/orphaned.jpg',
          orphaned_item_id: 'deleted-item'
        }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockOrphanedImages,
        error: null
      })

      // Mock the deleteImagesByUrls method
      const deleteImagesByUrlsSpy = vi.spyOn(imageService, 'deleteImagesByUrls')
        .mockResolvedValue({
          success: true,
          deletedCount: 1,
          errors: []
        })

      const result = await imageService.cleanupOrphanedImages()

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(1)
      expect(supabase.rpc).toHaveBeenCalledWith('cleanup_orphaned_images')

      deleteImagesByUrlsSpy.mockRestore()
    })

    it('should handle no orphaned images', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null
      })

      const result = await imageService.cleanupOrphanedImages()

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(0)
    })
  })

  describe('getItemImageStats', () => {
    it('should successfully get image statistics', async () => {
      const mockStats = [{
        total_images: 3,
        has_primary: true,
        primary_image_url: 'https://example.com/primary.jpg',
        total_size_estimate: 3145728
      }]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockStats,
        error: null
      })

      const result = await imageService.getItemImageStats('item-1')

      expect(result.success).toBe(true)
      expect(result.stats).toEqual({
        totalImages: 3,
        hasPrimary: true,
        primaryImageUrl: 'https://example.com/primary.jpg',
        totalSizeEstimate: 3145728
      })
      expect(supabase.rpc).toHaveBeenCalledWith('get_item_image_stats', {
        p_item_id: 'item-1'
      })
    })

    it('should handle no images', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null
      })

      const result = await imageService.getItemImageStats('item-1')

      expect(result.success).toBe(true)
      expect(result.stats).toEqual({
        totalImages: 0,
        hasPrimary: false,
        totalSizeEstimate: 0
      })
    })
  })
})
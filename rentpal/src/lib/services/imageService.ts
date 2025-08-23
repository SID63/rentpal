import { supabase } from '@/lib/supabase'
import { uploadFiles, deleteFiles, deleteFileByUrl } from '@/lib/storage'
import type { ItemImage, ItemImageInsert, ItemImageUpdate } from '@/types/database'
import type { BucketName } from '@/types/storage'

export interface ImageAssociationResult {
  success: boolean
  images?: ItemImage[]
  error?: string
}

export interface ImageReorderResult {
  success: boolean
  images?: ItemImage[]
  error?: string
}

export interface ImageCleanupResult {
  success: boolean
  deletedCount: number
  errors: string[]
}

export interface BatchImageUploadResult {
  success: boolean
  uploadedImages: ItemImage[]
  failedUploads: string[]
  errors: string[]
}

/**
 * Image Service for managing item images and associations
 */
export const imageService = {
  /**
   * Associate uploaded images with an item using database function
   */
  async associateImagesWithItem(
    itemId: string,
    imageUrls: string[],
    options: {
      altTexts?: string[]
      makePrimary?: boolean
      startingSortOrder?: number
    } = {}
  ): Promise<ImageAssociationResult> {
    try {
      if (!imageUrls || imageUrls.length === 0) {
        return {
          success: true,
          images: []
        }
      }

      const { altTexts = [], makePrimary = false } = options

      // Fallback to direct insert if RPC fails
      try {
        // Use database function for atomic operation
        const { data: insertedImages, error } = await supabase
          .rpc('batch_insert_item_images', {
            p_item_id: itemId,
            p_image_urls: imageUrls,
            p_alt_texts: altTexts.length > 0 ? altTexts : null,
            p_make_first_primary: makePrimary
          })

        if (error) {
          console.warn('RPC batch_insert_item_images failed, falling back to direct insert:', error)
          throw error
        }

        return {
          success: true,
          images: insertedImages || []
        }
      } catch (rpcError) {
        console.warn('RPC failed, using direct insert fallback:', rpcError)
        
        // Direct insert fallback
        const insertPromises = imageUrls.map(async (url, index) => {
          const { data, error } = await supabase
            .from('item_images')
            .insert({
              item_id: itemId,
              image_url: url,
              alt_text: altTexts[index] || null,
              sort_order: (options.startingSortOrder || 0) + index,
              is_primary: makePrimary && index === 0
            })
            .select()
            .single()

          if (error) throw error
          return data
        })

        const insertedImages = await Promise.all(insertPromises)
        
        return {
          success: true,
          images: insertedImages
        }
      }
    } catch (error) {
      console.error('Error in associateImagesWithItem:', error)
      return {
        success: false,
        error: `Failed to associate images: ${String(error)}`
      }
    }
  },

  /**
   * Upload and associate multiple images with an item
   */
  async uploadAndAssociateImages(
    itemId: string,
    files: File[],
    userId: string,
    options: {
      altTexts?: string[]
      makePrimary?: boolean
      maxConcurrent?: number
    } = {}
  ): Promise<BatchImageUploadResult> {
    const result: BatchImageUploadResult = {
      success: false,
      uploadedImages: [],
      failedUploads: [],
      errors: []
    }

    try {
      if (!files || files.length === 0) {
        return {
          ...result,
          success: true
        }
      }

      // Upload files to storage
      const uploadResult = await uploadFiles(
        files,
        'item-images' as BucketName,
        userId,
        {
          maxConcurrent: options.maxConcurrent || 3,
          stopOnError: false
        }
      )

      // Collect successful uploads
      const successfulUploads = uploadResult.results
        .filter(r => r.success && r.url)
        .map(r => r.url!)

      // Collect failed uploads
      const failedUploads = files
        .filter((_, index) => !uploadResult.results[index]?.success)
        .map(f => f.name)

      result.failedUploads = failedUploads
      result.errors = uploadResult.errors

      if (successfulUploads.length === 0) {
        return {
          ...result,
          success: false,
          errors: [...result.errors, 'No images were successfully uploaded']
        }
      }

      // Associate uploaded images with item
      const associationResult = await this.associateImagesWithItem(
        itemId,
        successfulUploads,
        {
          altTexts: options.altTexts,
          makePrimary: options.makePrimary
        }
      )

      if (!associationResult.success) {
        // If association fails, try to clean up uploaded files
        try {
          await this.deleteImagesByUrls(successfulUploads)
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded files after association error:', cleanupError)
        }

        return {
          ...result,
          success: false,
          errors: [...result.errors, associationResult.error || 'Failed to associate images']
        }
      }

      return {
        success: uploadResult.successCount > 0,
        uploadedImages: associationResult.images || [],
        failedUploads,
        errors: result.errors
      }
    } catch (error) {
      console.error('Error in uploadAndAssociateImages:', error)
      return {
        ...result,
        success: false,
        errors: [...result.errors, `Upload and association failed: ${String(error)}`]
      }
    }
  },

  /**
   * Reorder images for an item using database function
   */
  async reorderItemImages(
    itemId: string,
    imageIds: string[]
  ): Promise<ImageReorderResult> {
    try {
      if (!imageIds || imageIds.length === 0) {
        return {
          success: true,
          images: []
        }
      }

      // Use database function for atomic reordering
      const { data: reorderedImages, error } = await supabase
        .rpc('reorder_item_images', {
          p_item_id: itemId,
          p_image_ids: imageIds
        })

      if (error) {
        console.error('Error reordering images:', error)
        return {
          success: false,
          error: `Failed to reorder images: ${error.message}`
        }
      }

      return {
        success: true,
        images: reorderedImages || []
      }
    } catch (error) {
      console.error('Error in reorderItemImages:', error)
      return {
        success: false,
        error: `Failed to reorder images: ${String(error)}`
      }
    }
  },

  /**
   * Set primary image for an item using database function
   */
  async setPrimaryImage(itemId: string, imageId: string): Promise<ImageAssociationResult> {
    try {
      // Use database function for atomic primary image setting
      const { data: updatedImages, error } = await supabase
        .rpc('set_primary_item_image', {
          p_item_id: itemId,
          p_image_id: imageId
        })

      if (error) {
        console.error('Error setting primary image:', error)
        return {
          success: false,
          error: `Failed to set primary image: ${error.message}`
        }
      }

      return {
        success: true,
        images: updatedImages || []
      }
    } catch (error) {
      console.error('Error in setPrimaryImage:', error)
      return {
        success: false,
        error: `Failed to set primary image: ${String(error)}`
      }
    }
  },

  /**
   * Delete images by their database IDs using database function
   */
  async deleteImagesByIds(imageIds: string[]): Promise<ImageCleanupResult> {
    const result: ImageCleanupResult = {
      success: false,
      deletedCount: 0,
      errors: []
    }

    try {
      if (!imageIds || imageIds.length === 0) {
        return {
          ...result,
          success: true
        }
      }

      // Use database function to get URLs and delete records atomically
      const { data: deletedImageUrls, error: deleteError } = await supabase
        .rpc('delete_item_images_by_ids', {
          p_image_ids: imageIds
        })

      if (deleteError) {
        result.errors.push(`Failed to delete image records: ${deleteError.message}`)
        return result
      }

      if (!deletedImageUrls || deletedImageUrls.length === 0) {
        return {
          ...result,
          success: true
        }
      }

      // Delete from storage
      const imageUrls = deletedImageUrls.map((row: any) => row.deleted_image_url)
      const storageResult = await this.deleteImagesByUrls(imageUrls)

      result.success = true
      result.deletedCount = deletedImageUrls.length
      result.errors = storageResult.errors

      return result
    } catch (error) {
      result.errors.push(`Delete operation failed: ${String(error)}`)
      return result
    }
  },

  /**
   * Delete images by their URLs
   */
  async deleteImagesByUrls(imageUrls: string[]): Promise<ImageCleanupResult> {
    const result: ImageCleanupResult = {
      success: false,
      deletedCount: 0,
      errors: []
    }

    try {
      if (!imageUrls || imageUrls.length === 0) {
        return {
          ...result,
          success: true
        }
      }

      // Delete from storage
      const deletePromises = imageUrls.map(async (url) => {
        try {
          const deleteResult = await deleteFileByUrl('item-images' as BucketName, url)
          if (!deleteResult.success) {
            result.errors.push(`Failed to delete ${url}: ${deleteResult.error}`)
          } else {
            result.deletedCount++
          }
        } catch (error) {
          result.errors.push(`Error deleting ${url}: ${String(error)}`)
        }
      })

      await Promise.all(deletePromises)

      result.success = result.deletedCount > 0 || imageUrls.length === 0

      return result
    } catch (error) {
      result.errors.push(`Batch delete failed: ${String(error)}`)
      return result
    }
  },

  /**
   * Delete all images for an item using database function
   */
  async deleteAllItemImages(itemId: string): Promise<ImageCleanupResult> {
    const result: ImageCleanupResult = {
      success: false,
      deletedCount: 0,
      errors: []
    }

    try {
      // Use database function to get URLs and delete records atomically
      const { data: deletedImageUrls, error: deleteError } = await supabase
        .rpc('delete_all_item_images', {
          p_item_id: itemId
        })

      if (deleteError) {
        result.errors.push(`Failed to delete image records: ${deleteError.message}`)
        return result
      }

      if (!deletedImageUrls || deletedImageUrls.length === 0) {
        return {
          ...result,
          success: true
        }
      }

      // Delete from storage
      const imageUrls = deletedImageUrls.map((row: any) => row.deleted_image_url)
      const storageResult = await this.deleteImagesByUrls(imageUrls)

      result.success = true
      result.deletedCount = deletedImageUrls.length
      result.errors = storageResult.errors

      return result
    } catch (error) {
      console.error('Error in deleteAllItemImages:', error)
      result.errors.push(`Failed to delete item images: ${String(error)}`)
      return result
    }
  },

  /**
   * Update image metadata
   */
  async updateImageMetadata(
    imageId: string,
    updates: Pick<ItemImageUpdate, 'alt_text' | 'sort_order' | 'is_primary'>
  ): Promise<{ success: boolean; image?: ItemImage; error?: string }> {
    try {
      const { data: updatedImage, error } = await supabase
        .from('item_images')
        .update(updates)
        .eq('id', imageId)
        .select()
        .single()

      if (error) {
        console.error('Error updating image metadata:', error)
        return {
          success: false,
          error: `Failed to update image: ${error.message}`
        }
      }

      return {
        success: true,
        image: updatedImage
      }
    } catch (error) {
      console.error('Error in updateImageMetadata:', error)
      return {
        success: false,
        error: `Failed to update image metadata: ${String(error)}`
      }
    }
  },

  /**
   * Get images for an item with sorting
   */
  async getItemImages(itemId: string): Promise<{ success: boolean; images?: ItemImage[]; error?: string }> {
    try {
      const { data: images, error } = await supabase
        .from('item_images')
        .select('*')
        .eq('item_id', itemId)
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('Error fetching item images:', error)
        return {
          success: false,
          error: `Failed to fetch images: ${error.message}`
        }
      }

      return {
        success: true,
        images: images || []
      }
    } catch (error) {
      console.error('Error in getItemImages:', error)
      return {
        success: false,
        error: `Failed to get item images: ${String(error)}`
      }
    }
  },

  /**
   * Cleanup orphaned images using database function
   */
  async cleanupOrphanedImages(): Promise<ImageCleanupResult> {
    const result: ImageCleanupResult = {
      success: false,
      deletedCount: 0,
      errors: []
    }

    try {
      // Use database function to find and delete orphaned images
      const { data: orphanedImages, error: cleanupError } = await supabase
        .rpc('cleanup_orphaned_images')

      if (cleanupError) {
        result.errors.push(`Failed to cleanup orphaned images: ${cleanupError.message}`)
        return result
      }

      if (!orphanedImages || orphanedImages.length === 0) {
        return {
          ...result,
          success: true
        }
      }

      // Delete from storage
      const imageUrls = orphanedImages.map((row: any) => row.orphaned_image_url)
      const storageResult = await this.deleteImagesByUrls(imageUrls)

      result.success = true
      result.deletedCount = orphanedImages.length
      result.errors = storageResult.errors

      return result
    } catch (error) {
      result.errors.push(`Orphaned image cleanup failed: ${String(error)}`)
      return result
    }
  },

  /**
   * Get image statistics for an item
   */
  async getItemImageStats(itemId: string): Promise<{
    success: boolean
    stats?: {
      totalImages: number
      hasPrimary: boolean
      primaryImageUrl?: string
      totalSizeEstimate: number
    }
    error?: string
  }> {
    try {
      const { data: stats, error } = await supabase
        .rpc('get_item_image_stats', {
          p_item_id: itemId
        })

      if (error) {
        console.error('Error fetching image stats:', error)
        return {
          success: false,
          error: `Failed to fetch image stats: ${error.message}`
        }
      }

      const statsData = stats?.[0]
      if (!statsData) {
        return {
          success: true,
          stats: {
            totalImages: 0,
            hasPrimary: false,
            totalSizeEstimate: 0
          }
        }
      }

      return {
        success: true,
        stats: {
          totalImages: statsData.total_images,
          hasPrimary: statsData.has_primary,
          primaryImageUrl: statsData.primary_image_url,
          totalSizeEstimate: statsData.total_size_estimate
        }
      }
    } catch (error) {
      console.error('Error in getItemImageStats:', error)
      return {
        success: false,
        error: `Failed to get image stats: ${String(error)}`
      }
    }
  }
}
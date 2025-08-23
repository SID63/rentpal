import { supabase } from '@/lib/supabase'
import { uploadFile, deleteFile, extractFilePathFromUrl } from '@/lib/storage-utils'
import { profileService } from '@/lib/database'
import type { BucketName, FileUploadResult } from '@/types/storage'

/**
 * Profile image service for handling avatar uploads and management
 */
export class ProfileImageService {
  private readonly bucket: BucketName = 'avatars'

  /**
   * Upload a new profile image and update user profile
   */
  async uploadProfileImage(
    file: File,
    userId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Get current profile to check for existing avatar
      const currentProfile = await profileService.getProfile(userId)
      const oldAvatarUrl = currentProfile?.avatar_url

      // Upload new image
      const uploadResult: FileUploadResult = await uploadFile(file, this.bucket, userId, {
        cacheControl: '3600',
        upsert: false
      })

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || 'Failed to upload image'
        }
      }

      // Update profile with new avatar URL
      const updatedProfile = await profileService.updateProfile(userId, {
        avatar_url: uploadResult.url,
        updated_at: new Date().toISOString()
      })

      if (!updatedProfile) {
        // If profile update failed, clean up the uploaded image
        if (uploadResult.path) {
          await deleteFile(uploadResult.path, this.bucket)
        }
        return {
          success: false,
          error: 'Failed to update profile with new image'
        }
      }

      // Clean up old avatar if it exists and upload was successful
      if (oldAvatarUrl) {
        await this.cleanupOldAvatar(oldAvatarUrl, userId)
      }

      return {
        success: true,
        url: uploadResult.url
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Remove profile image and update user profile
   */
  async removeProfileImage(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current profile
      const currentProfile = await profileService.getProfile(userId)
      if (!currentProfile?.avatar_url) {
        return { success: true } // Nothing to remove
      }

      // Update profile to remove avatar URL
      const updatedProfile = await profileService.updateProfile(userId, {
        avatar_url: null,
        updated_at: new Date().toISOString()
      })

      if (!updatedProfile) {
        return {
          success: false,
          error: 'Failed to update profile'
        }
      }

      // Delete the image file
      await this.cleanupOldAvatar(currentProfile.avatar_url, userId)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get default avatar URL or generate one
   */
  getDefaultAvatarUrl(userId: string, fullName?: string): string {
    // Generate a simple avatar based on initials
    if (fullName) {
      const initials = fullName
        .split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
      
      // Use a service like UI Avatars or similar
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=3B82F6&color=ffffff&bold=true`
    }
    
    // Fallback to a generic avatar
    return `https://ui-avatars.com/api/?name=User&size=200&background=6B7280&color=ffffff&bold=true`
  }

  /**
   * Validate profile image file
   */
  validateProfileImage(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not supported. Please use JPEG, PNG, or WebP format.`
      }
    }

    // Check file size (2MB limit for avatars)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds the 2MB limit for profile images.`
      }
    }

    // Check image dimensions (optional - could add minimum/maximum dimensions)
    return { valid: true }
  }

  /**
   * Clean up old avatar file from storage
   */
  private async cleanupOldAvatar(avatarUrl: string, userId: string): Promise<void> {
    try {
      // Skip cleanup for default/external avatars
      if (!avatarUrl.includes(supabase.supabaseUrl)) {
        return
      }

      const filePath = extractFilePathFromUrl(avatarUrl, userId)
      if (filePath) {
        await deleteFile(filePath, this.bucket)
      }
    } catch (error) {
      // Log error but don't throw - cleanup failure shouldn't break the main operation
      console.warn('Failed to cleanup old avatar:', error)
    }
  }

  /**
   * Get profile image URL with fallback to default
   */
  getProfileImageUrl(avatarUrl: string | null, userId: string, fullName?: string): string {
    if (avatarUrl) {
      return avatarUrl
    }
    return this.getDefaultAvatarUrl(userId, fullName)
  }

  /**
   * Batch cleanup orphaned images (for maintenance)
   */
  async cleanupOrphanedImages(userId: string): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = []
    let cleaned = 0

    try {
      // List all files in user's profile folder
      const { data: files, error } = await supabase.storage
        .from(this.bucket)
        .list(`${userId}/profile`)

      if (error) {
        errors.push(`Failed to list files: ${error.message}`)
        return { cleaned, errors }
      }

      if (!files || files.length === 0) {
        return { cleaned, errors }
      }

      // Get current profile
      const profile = await profileService.getProfile(userId)
      const currentAvatarPath = profile?.avatar_url 
        ? extractFilePathFromUrl(profile.avatar_url, userId)
        : null

      // Delete files that are not the current avatar
      for (const file of files) {
        const filePath = `${userId}/profile/${file.name}`
        
        if (filePath !== currentAvatarPath) {
          const result = await deleteFile(filePath, this.bucket)
          if (result.success) {
            cleaned++
          } else {
            errors.push(`Failed to delete ${filePath}: ${result.error}`)
          }
        }
      }
    } catch (error) {
      errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return { cleaned, errors }
  }
}

// Export singleton instance
export const profileImageService = new ProfileImageService()
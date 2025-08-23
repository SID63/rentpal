import { supabase } from '@/lib/supabase'
import { profileImageService } from '@/lib/profile-image-service'
import { profileService } from '@/lib/database'

/**
 * Maintenance utilities for profile image cleanup
 */
export class ProfileImageMaintenance {
  /**
   * Clean up orphaned profile images for all users
   */
  async cleanupAllOrphanedImages(): Promise<{
    totalCleaned: number
    totalErrors: number
    userResults: Array<{
      userId: string
      cleaned: number
      errors: string[]
    }>
  }> {
    const userResults: Array<{
      userId: string
      cleaned: number
      errors: string[]
    }> = []
    
    let totalCleaned = 0
    let totalErrors = 0

    try {
      // Get all user IDs from profiles table
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')

      if (error) {
        throw new Error(`Failed to fetch profiles: ${error.message}`)
      }

      if (!profiles || profiles.length === 0) {
        return { totalCleaned, totalErrors, userResults }
      }

      // Clean up images for each user
      for (const profile of profiles) {
        try {
          const result = await profileImageService.cleanupOrphanedImages(profile.id)
          
          userResults.push({
            userId: profile.id,
            cleaned: result.cleaned,
            errors: result.errors
          })
          
          totalCleaned += result.cleaned
          totalErrors += result.errors.length
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          userResults.push({
            userId: profile.id,
            cleaned: 0,
            errors: [errorMessage]
          })
          totalErrors++
        }
      }
    } catch (error) {
      throw new Error(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return { totalCleaned, totalErrors, userResults }
  }

  /**
   * Find and report users with missing profile images
   */
  async findUsersWithoutProfileImages(): Promise<Array<{
    userId: string
    fullName: string
    email: string
    hasAvatarUrl: boolean
    avatarUrlAccessible: boolean
  }>> {
    const results: Array<{
      userId: string
      fullName: string
      email: string
      hasAvatarUrl: boolean
      avatarUrlAccessible: boolean
    }> = []

    try {
      // Get all profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')

      if (error) {
        throw new Error(`Failed to fetch profiles: ${error.message}`)
      }

      if (!profiles) {
        return results
      }

      // Check each profile
      for (const profile of profiles) {
        const hasAvatarUrl = !!profile.avatar_url
        let avatarUrlAccessible = false

        if (hasAvatarUrl && profile.avatar_url) {
          // Check if the avatar URL is accessible (basic check)
          try {
            const response = await fetch(profile.avatar_url, { method: 'HEAD' })
            avatarUrlAccessible = response.ok
          } catch {
            avatarUrlAccessible = false
          }
        }

        results.push({
          userId: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          hasAvatarUrl,
          avatarUrlAccessible
        })
      }
    } catch (error) {
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return results
  }

  /**
   * Migrate users to default avatars if they don't have profile images
   */
  async migrateUsersToDefaultAvatars(userIds?: string[]): Promise<{
    migrated: number
    errors: string[]
  }> {
    const errors: string[] = []
    let migrated = 0

    try {
      let profilesToMigrate

      if (userIds && userIds.length > 0) {
        // Migrate specific users
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds)

        if (error) {
          throw new Error(`Failed to fetch profiles: ${error.message}`)
        }
        profilesToMigrate = profiles || []
      } else {
        // Migrate all users without avatars
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .is('avatar_url', null)

        if (error) {
          throw new Error(`Failed to fetch profiles: ${error.message}`)
        }
        profilesToMigrate = profiles || []
      }

      // Update each profile with default avatar
      for (const profile of profilesToMigrate) {
        try {
          const defaultAvatarUrl = profileImageService.getDefaultAvatarUrl(
            profile.id,
            profile.full_name
          )

          const updatedProfile = await profileService.updateProfile(profile.id, {
            avatar_url: defaultAvatarUrl,
            updated_at: new Date().toISOString()
          })

          if (updatedProfile) {
            migrated++
          } else {
            errors.push(`Failed to update profile for user ${profile.id}`)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`User ${profile.id}: ${errorMessage}`)
        }
      }
    } catch (error) {
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return { migrated, errors }
  }

  /**
   * Generate storage usage report for profile images
   */
  async generateStorageUsageReport(): Promise<{
    totalFiles: number
    totalSizeBytes: number
    totalSizeMB: number
    userBreakdown: Array<{
      userId: string
      fileCount: number
      sizeBytes: number
      sizeMB: number
    }>
  }> {
    let totalFiles = 0
    let totalSizeBytes = 0
    const userBreakdown: Array<{
      userId: string
      fileCount: number
      sizeBytes: number
      sizeMB: number
    }> = []

    try {
      // Get all user IDs
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')

      if (error) {
        throw new Error(`Failed to fetch profiles: ${error.message}`)
      }

      if (!profiles) {
        return { totalFiles, totalSizeBytes, totalSizeMB: 0, userBreakdown }
      }

      // Check storage for each user
      for (const profile of profiles) {
        try {
          const { data: files, error: listError } = await supabase.storage
            .from('avatars')
            .list(`${profile.id}/profile`)

          if (listError) {
            console.warn(`Failed to list files for user ${profile.id}:`, listError.message)
            continue
          }

          if (!files || files.length === 0) {
            userBreakdown.push({
              userId: profile.id,
              fileCount: 0,
              sizeBytes: 0,
              sizeMB: 0
            })
            continue
          }

          let userSizeBytes = 0
          for (const file of files) {
            userSizeBytes += file.metadata?.size || 0
          }

          userBreakdown.push({
            userId: profile.id,
            fileCount: files.length,
            sizeBytes: userSizeBytes,
            sizeMB: Math.round((userSizeBytes / (1024 * 1024)) * 100) / 100
          })

          totalFiles += files.length
          totalSizeBytes += userSizeBytes
        } catch (error) {
          console.warn(`Error processing user ${profile.id}:`, error)
        }
      }
    } catch (error) {
      throw new Error(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      totalFiles,
      totalSizeBytes,
      totalSizeMB: Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100,
      userBreakdown
    }
  }
}

// Export singleton instance
export const profileImageMaintenance = new ProfileImageMaintenance()
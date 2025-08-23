import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProfileImageService, profileImageService } from '../profile-image-service'
import { profileService } from '../database'
import * as storageUtils from '../storage-utils'

// Mock dependencies
vi.mock('../database', () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn()
  }
}))

vi.mock('../storage-utils', () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  extractFilePathFromUrl: vi.fn()
}))

vi.mock('../supabase', () => ({
  supabase: {
    supabaseUrl: 'https://test.supabase.co',
    storage: {
      from: vi.fn(() => ({
        list: vi.fn(),
        remove: vi.fn()
      }))
    }
  }
}))

describe('ProfileImageService', () => {
  let service: ProfileImageService

  beforeEach(() => {
    service = new ProfileImageService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('uploadProfileImage', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const mockUserId = 'user-123'
    const mockUploadResult = {
      success: true,
      url: 'https://test.supabase.co/storage/v1/object/public/avatars/user-123/profile/image.jpg',
      path: 'user-123/profile/image.jpg'
    }

    it('should upload image and update profile successfully', async () => {
      // Mock current profile
      vi.mocked(profileService.getProfile).mockResolvedValue({
        id: mockUserId,
        avatar_url: null,
        full_name: 'Test User',
        email: 'test@example.com'
      } as any)

      // Mock successful upload
      vi.mocked(storageUtils.uploadFile).mockResolvedValue(mockUploadResult)

      // Mock successful profile update
      vi.mocked(profileService.updateProfile).mockResolvedValue({
        id: mockUserId,
        avatar_url: mockUploadResult.url
      } as any)

      const result = await service.uploadProfileImage(mockFile, mockUserId)

      expect(result.success).toBe(true)
      expect(result.url).toBe(mockUploadResult.url)
      expect(profileService.updateProfile).toHaveBeenCalledWith(mockUserId, {
        avatar_url: mockUploadResult.url,
        updated_at: expect.any(String)
      })
    })

    it('should clean up old avatar when uploading new one', async () => {
      const oldAvatarUrl = 'https://test.supabase.co/storage/v1/object/public/avatars/user-123/profile/old.jpg'
      
      // Mock current profile with existing avatar
      vi.mocked(profileService.getProfile).mockResolvedValue({
        id: mockUserId,
        avatar_url: oldAvatarUrl,
        full_name: 'Test User',
        email: 'test@example.com'
      } as any)

      vi.mocked(storageUtils.uploadFile).mockResolvedValue(mockUploadResult)
      vi.mocked(profileService.updateProfile).mockResolvedValue({
        id: mockUserId,
        avatar_url: mockUploadResult.url
      } as any)
      
      vi.mocked(storageUtils.extractFilePathFromUrl).mockReturnValue('user-123/profile/old.jpg')
      vi.mocked(storageUtils.deleteFile).mockResolvedValue({ success: true })

      const result = await service.uploadProfileImage(mockFile, mockUserId)

      expect(result.success).toBe(true)
      expect(storageUtils.deleteFile).toHaveBeenCalledWith('user-123/profile/old.jpg', 'avatars')
    })

    it('should handle upload failure', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValue({
        id: mockUserId,
        avatar_url: null
      } as any)

      vi.mocked(storageUtils.uploadFile).mockResolvedValue({
        success: false,
        error: 'Upload failed'
      })

      const result = await service.uploadProfileImage(mockFile, mockUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload failed')
      expect(profileService.updateProfile).not.toHaveBeenCalled()
    })

    it('should clean up uploaded file if profile update fails', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValue({
        id: mockUserId,
        avatar_url: null
      } as any)

      vi.mocked(storageUtils.uploadFile).mockResolvedValue(mockUploadResult)
      vi.mocked(profileService.updateProfile).mockResolvedValue(null)
      vi.mocked(storageUtils.deleteFile).mockResolvedValue({ success: true })

      const result = await service.uploadProfileImage(mockFile, mockUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update profile with new image')
      expect(storageUtils.deleteFile).toHaveBeenCalledWith(mockUploadResult.path, 'avatars')
    })
  })

  describe('removeProfileImage', () => {
    const mockUserId = 'user-123'
    const mockAvatarUrl = 'https://test.supabase.co/storage/v1/object/public/avatars/user-123/profile/image.jpg'

    it('should remove profile image successfully', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValue({
        id: mockUserId,
        avatar_url: mockAvatarUrl
      } as any)

      vi.mocked(profileService.updateProfile).mockResolvedValue({
        id: mockUserId,
        avatar_url: null
      } as any)

      vi.mocked(storageUtils.extractFilePathFromUrl).mockReturnValue('user-123/profile/image.jpg')
      vi.mocked(storageUtils.deleteFile).mockResolvedValue({ success: true })

      const result = await service.removeProfileImage(mockUserId)

      expect(result.success).toBe(true)
      expect(profileService.updateProfile).toHaveBeenCalledWith(mockUserId, {
        avatar_url: null,
        updated_at: expect.any(String)
      })
    })

    it('should handle case when no avatar exists', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValue({
        id: mockUserId,
        avatar_url: null
      } as any)

      const result = await service.removeProfileImage(mockUserId)

      expect(result.success).toBe(true)
      expect(profileService.updateProfile).not.toHaveBeenCalled()
    })
  })

  describe('validateProfileImage', () => {
    it('should validate valid image file', () => {
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }) // 1MB

      const result = service.validateProfileImage(validFile)

      expect(result.valid).toBe(true)
    })

    it('should reject invalid file type', () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      const result = service.validateProfileImage(invalidFile)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('not supported')
    })

    it('should reject oversized file', () => {
      const oversizedFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(oversizedFile, 'size', { value: 3 * 1024 * 1024 }) // 3MB

      const result = service.validateProfileImage(oversizedFile)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds the 2MB limit')
    })
  })

  describe('getDefaultAvatarUrl', () => {
    it('should generate avatar URL with initials', () => {
      const url = service.getDefaultAvatarUrl('user-123', 'John Doe')

      expect(url).toContain('ui-avatars.com')
      expect(url).toContain('name=JD')
    })

    it('should generate generic avatar URL without name', () => {
      const url = service.getDefaultAvatarUrl('user-123')

      expect(url).toContain('ui-avatars.com')
      expect(url).toContain('name=User')
    })

    it('should handle single name', () => {
      const url = service.getDefaultAvatarUrl('user-123', 'John')

      expect(url).toContain('name=J')
    })

    it('should handle multiple names', () => {
      const url = service.getDefaultAvatarUrl('user-123', 'John Michael Doe')

      expect(url).toContain('name=JM')
    })
  })

  describe('getProfileImageUrl', () => {
    it('should return avatar URL when provided', () => {
      const avatarUrl = 'https://example.com/avatar.jpg'
      const result = service.getProfileImageUrl(avatarUrl, 'user-123', 'John Doe')

      expect(result).toBe(avatarUrl)
    })

    it('should return default avatar when no URL provided', () => {
      const result = service.getProfileImageUrl(null, 'user-123', 'John Doe')

      expect(result).toContain('ui-avatars.com')
      expect(result).toContain('name=JD')
    })
  })
})

describe('profileImageService singleton', () => {
  it('should export singleton instance', () => {
    expect(profileImageService).toBeInstanceOf(ProfileImageService)
  })
})
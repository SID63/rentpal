'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { profileImageService } from '@/lib/profile-image-service'
import EnhancedImageUpload from '@/components/shared/EnhancedImageUpload'
import Image from 'next/image'

interface ProfileImageUploadProps {
  currentImageUrl?: string | null
  onImageChange: (url: string) => void
  disabled?: boolean
  className?: string
  showLabel?: boolean
  showDefaultFallback?: boolean
}

export default function EnhancedProfileImageUpload({
  currentImageUrl,
  onImageChange,
  disabled = false,
  className = '',
  showLabel = true,
  showDefaultFallback = true
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Get the display URL (with fallback to default avatar if needed)
  const fullName = user?.user_metadata?.full_name || undefined
  const displayUrl = showDefaultFallback && user 
    ? profileImageService.getProfileImageUrl(currentImageUrl, user.id, fullName)
    : currentImageUrl

  // Only pass actual uploaded images to the upload component, not generated avatars
  const isGeneratedAvatar = displayUrl?.includes('ui-avatars.com')
  const images = displayUrl && !isGeneratedAvatar ? [displayUrl] : []
  
  const handleImagesChange = async (newImages: string[]) => {
    if (!user) {
      setError('You must be logged in to upload images')
      return
    }

    setError(null)
    
    // Handle image removal
    if (newImages.length === 0 && currentImageUrl) {
      setIsUploading(true)
      try {
        const result = await profileImageService.removeProfileImage(user.id)
        if (result.success) {
          onImageChange('')
        } else {
          setError(result.error || 'Failed to remove image')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove image')
      } finally {
        setIsUploading(false)
      }
      return
    }

    // For profile images, we only want the first (and only) image
    const newImageUrl = newImages.length > 0 ? newImages[0] : ''
    onImageChange(newImageUrl)
  }

  const handleFileUpload = async (files: File[]) => {
    if (!user || files.length === 0) return

    const file = files[0] // Only handle single file for profile
    setIsUploading(true)
    setError(null)

    try {
      // Validate the file first
      const validation = profileImageService.validateProfileImage(file)
      if (!validation.valid) {
        setError(validation.error || 'Invalid file')
        return
      }

      // Upload the image
      const result = await profileImageService.uploadProfileImage(file, user.id)
      
      if (result.success && result.url) {
        onImageChange(result.url)
      } else {
        setError(result.error || 'Failed to upload image')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Photo
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Upload a clear photo of yourself to help others recognize you.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Custom Upload Interface for Profile Images */}
      <div className="flex items-start space-x-6">
        {/* Avatar Preview */}
        <div className="flex-shrink-0">
          <div className="relative">
            {displayUrl ? (
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-200 shadow-sm">
                <Image
                  src={displayUrl}
                  alt="Profile photo"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  priority={true}
                  onError={() => {
                    // Fallback to default avatar on error
                    if (user && showDefaultFallback) {
                      const defaultUrl = profileImageService.getDefaultAvatarUrl(user.id, user.user_metadata?.full_name)
                      onImageChange(defaultUrl)
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center shadow-sm">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            
            {/* Loading Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Controls */}
        <div className="flex-1 min-w-0">
          <EnhancedImageUpload
            bucket="avatars"
            images={images}
            onImagesChange={handleImagesChange}
            onFileUpload={handleFileUpload}
            maxImages={1}
            allowMultiple={false}
            showPreview={false} // We handle preview ourselves
            showProgress={true}
            disabled={disabled || isUploading}
            dragDropText="Drop your profile photo here or click to browse"
            buttonText={currentImageUrl ? "Change Photo" : "Choose Profile Photo"}
            className="max-w-md"
          />

          {/* File Requirements */}
          <div className="mt-3 text-sm text-gray-500">
            <p>PNG, JPG, WEBP up to 2 MB</p>
            <p>Recommended: Square image, at least 200x200 pixels</p>
          </div>

          {/* Remove Button */}
          {currentImageUrl && !isUploading && (
            <button
              type="button"
              onClick={() => handleImagesChange([])}
              disabled={disabled}
              className="mt-3 text-sm text-red-600 hover:text-red-800 focus:outline-none focus:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove Photo
            </button>
          )}
        </div>
      </div>
      
      {/* Help Text for Empty State */}
      {!currentImageUrl && !showDefaultFallback && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Why add a profile photo?</p>
              <ul className="space-y-1">
                <li>• Build trust with other users</li>
                <li>• Make your profile more recognizable</li>
                <li>• Increase response rates to messages</li>
                <li>• Complete your profile setup</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import Image from 'next/image'
import { useState } from 'react'
import { profileImageService } from '@/lib/profile-image-service'

interface UserAvatarProps {
  userId: string
  avatarUrl?: string | null
  fullName?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  showOnlineStatus?: boolean
  isOnline?: boolean
  alt?: string
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-20 h-20'
}

const statusSizeClasses = {
  xs: 'w-2 h-2',
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
  '2xl': 'w-4 h-4'
}

export default function UserAvatar({
  userId,
  avatarUrl,
  fullName,
  size = 'md',
  className = '',
  showOnlineStatus = false,
  isOnline = false,
  alt
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [currentUrl, setCurrentUrl] = useState(avatarUrl)

  // Get display URL with fallback
  const displayUrl = imageError || !currentUrl 
    ? profileImageService.getDefaultAvatarUrl(userId, fullName)
    : currentUrl

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true)
      setCurrentUrl(profileImageService.getDefaultAvatarUrl(userId, fullName))
    }
  }

  const altText = alt || `${fullName || 'User'}'s profile picture`

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 flex-shrink-0`}>
        <Image
          src={displayUrl}
          alt={altText}
          width={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : size === 'xl' ? 64 : 80}
          height={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : size === 'xl' ? 64 : 80}
          className="w-full h-full object-cover"
          onError={handleImageError}
          unoptimized={displayUrl.includes('ui-avatars.com')} // Don't optimize external avatar service
        />
      </div>
      
      {/* Online Status Indicator */}
      {showOnlineStatus && (
        <div className={`absolute bottom-0 right-0 ${statusSizeClasses[size]} rounded-full border-2 border-white ${
          isOnline ? 'bg-green-400' : 'bg-gray-400'
        }`} />
      )}
    </div>
  )
}
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/hooks/useDatabase'

interface FavoriteButtonProps {
  itemId: string
  initialIsFavorited?: boolean
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
  onToggle?: (isFavorited: boolean) => void
}

export default function FavoriteButton({
  itemId,
  initialIsFavorited = false,
  size = 'md',
  showText = false,
  className = '',
  onToggle
}: FavoriteButtonProps) {
  const { user } = useAuth()
  const { addFavorite, removeFavorite } = useFavorites()
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      // Redirect to login or show login modal
      window.location.href = '/auth/login'
      return
    }

    setIsLoading(true)

    try {
      if (isFavorited) {
        const success = await removeFavorite(itemId)
        if (success) {
          setIsFavorited(false)
          onToggle?.(false)
          
          // Show success feedback
          if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
            navigator.vibrate(50)
          }
        }
      } else {
        const success = await addFavorite(itemId)
        if (success) {
          setIsFavorited(true)
          onToggle?.(true)
          
          // Show success feedback with animation
          if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
            navigator.vibrate([50, 50, 50])
          }
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      // Could show a toast notification here
    } finally {
      setIsLoading(false)
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6 p-1'
      case 'lg':
        return 'w-12 h-12 p-3'
      default:
        return 'w-8 h-8 p-2'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4'
      case 'lg':
        return 'w-6 h-6'
      default:
        return 'w-4 h-4'
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        ${getSizeClasses()}
        rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        ${isFavorited 
          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
          : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isLoading ? (
        <div className={`${getIconSize()} animate-spin`}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      ) : (
        <svg 
          className={getIconSize()} 
          fill={isFavorited ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      )}
      
      {showText && (
        <span className="ml-2 text-sm font-medium">
          {isFavorited ? 'Favorited' : 'Add to Favorites'}
        </span>
      )}
    </button>
  )
}
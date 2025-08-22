'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { logError } from '@/lib/monitoring'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  fill?: boolean
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  objectPosition?: string
  loading?: 'lazy' | 'eager'
  onLoad?: () => void
  onError?: (error: Error) => void
  fallbackSrc?: string
  showLoadingSpinner?: boolean
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  fill = false,
  objectFit = 'cover',
  objectPosition = 'center',
  loading = 'lazy',
  onLoad,
  onError,
  fallbackSrc = '/images/placeholder.jpg',
  showLoadingSpinner = true,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const imgRef = useRef<HTMLImageElement>(null)

  // Generate blur placeholder for better UX
  const generateBlurDataURL = (w: number, h: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, w, h)
    }
    return canvas.toDataURL()
  }

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = (error: any) => {
    setHasError(true)
    setIsLoading(false)
    
    const errorObj = new Error(`Failed to load image: ${currentSrc}`)
    logError(errorObj, {
      imageSrc: currentSrc,
      fallbackSrc,
      alt,
    })
    
    onError?.(errorObj)
    
    // Try fallback image if available and not already using it
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setHasError(false)
    }
  }

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current || priority || loading === 'eager') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Image is in viewport, start loading
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    )

    observer.observe(imgRef.current)

    return () => {
      observer.disconnect()
    }
  }, [priority, loading])

  // Progressive image loading for better perceived performance
  const [lowQualitySrc, setLowQualitySrc] = useState<string>()
  
  useEffect(() => {
    if (src && !priority) {
      // Create low quality version for progressive loading
      const url = new URL(src, window.location.origin)
      url.searchParams.set('q', '10') // Very low quality
      url.searchParams.set('w', '50') // Small width
      setLowQualitySrc(url.toString())
    }
  }, [src, priority])

  const imageProps = {
    src: currentSrc,
    alt,
    quality,
    priority,
    placeholder: blurDataURL ? 'blur' : placeholder,
    blurDataURL: blurDataURL || (width && height ? generateBlurDataURL(width, height) : undefined),
    sizes: sizes || (fill ? '100vw' : undefined),
    onLoad: handleLoad,
    onError: handleError,
    className: `${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`,
    style: {
      objectFit: fill ? objectFit : undefined,
      objectPosition: fill ? objectPosition : undefined,
    },
    ...props,
  }

  if (hasError && currentSrc === fallbackSrc) {
    // Both original and fallback failed, show placeholder
    return (
      <div
        className={`${className} bg-gray-200 flex items-center justify-center`}
        style={{ width, height }}
      >
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Progressive loading: show low quality first */}
      {lowQualitySrc && isLoading && !priority && (
        <Image
          src={lowQualitySrc}
          alt={alt}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          className={`${className} absolute inset-0 blur-sm`}
          priority
        />
      )}
      
      {/* Main image */}
      {fill ? (
        <Image
          ref={imgRef}
          fill
          {...imageProps}
        />
      ) : (
        <Image
          ref={imgRef}
          width={width}
          height={height}
          {...imageProps}
        />
      )}
      
      {/* Loading spinner */}
      {isLoading && showLoadingSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  )
}

/**
 * Image gallery component with optimized loading
 */
interface ImageGalleryProps {
  images: string[]
  alt: string
  className?: string
  thumbnailClassName?: string
  mainImageClassName?: string
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  alt,
  className = '',
  thumbnailClassName = '',
  mainImageClassName = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]))

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index)
    // Preload the selected image if not already loaded
    if (!loadedImages.has(index)) {
      setLoadedImages(prev => new Set([...prev, index]))
    }
  }

  // Preload adjacent images for better UX
  useEffect(() => {
    const preloadAdjacent = () => {
      const toLoad = new Set(loadedImages)
      
      // Preload previous and next images
      if (selectedIndex > 0) toLoad.add(selectedIndex - 1)
      if (selectedIndex < images.length - 1) toLoad.add(selectedIndex + 1)
      
      setLoadedImages(toLoad)
    }

    const timer = setTimeout(preloadAdjacent, 500)
    return () => clearTimeout(timer)
  }, [selectedIndex, images.length, loadedImages])

  if (!images.length) return null

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-lg">
        <OptimizedImage
          src={images[selectedIndex]}
          alt={`${alt} - Image ${selectedIndex + 1}`}
          fill
          priority={selectedIndex === 0}
          className={mainImageClassName}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`
                relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all
                ${selectedIndex === index 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {loadedImages.has(index) ? (
                <OptimizedImage
                  src={image}
                  alt={`${alt} thumbnail ${index + 1}`}
                  fill
                  className={thumbnailClassName}
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Responsive image component that adapts to different screen sizes
 */
interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'width' | 'height' | 'sizes'> {
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape'
  breakpoints?: {
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  aspectRatio = 'landscape',
  breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 },
  className = '',
  ...props
}) => {
  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
  }

  const generateSizes = () => {
    const { sm = 640, md = 768, lg = 1024, xl = 1280 } = breakpoints
    return `(max-width: ${sm}px) 100vw, (max-width: ${md}px) 50vw, (max-width: ${lg}px) 33vw, (max-width: ${xl}px) 25vw, 20vw`
  }

  return (
    <div className={`relative ${aspectRatioClasses[aspectRatio]} ${className}`}>
      <OptimizedImage
        {...props}
        fill
        sizes={generateSizes()}
        className="object-cover"
      />
    </div>
  )
}
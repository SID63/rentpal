'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  uploadFiles,
  deleteFile,
  extractFilePathFromUrl,
  validateFile
} from '@/lib/storage-utils'
import type { BucketName, FileUploadResult, BatchUploadResult } from '@/types/storage'

interface UseImageUploadOptions {
  bucket: BucketName
  maxImages?: number
  onSuccess?: (urls: string[]) => void
  onError?: (error: string) => void
}

interface UseImageUploadReturn {
  isUploading: boolean
  error: string | null
  uploadProgress: { completed: number; total: number; percentage: number } | null
  uploadImages: (files: File[]) => Promise<BatchUploadResult>
  deleteImage: (url: string) => Promise<boolean>
  validateFiles: (files: FileList) => { valid: File[]; errors: string[] }
  clearError: () => void
}

export function useImageUpload({
  bucket,
  maxImages,
  onSuccess,
  onError
}: UseImageUploadOptions): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{
    completed: number
    total: number
    percentage: number
  } | null>(null)
  
  const { user } = useAuth()

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const validateFiles = useCallback((files: FileList): { valid: File[]; errors: string[] } => {
    const valid: File[] = []
    const errors: string[] = []
    
    // Check if user is authenticated
    if (!user) {
      errors.push('You must be logged in to upload images')
      return { valid, errors }
    }
    
    // Check total count if maxImages is specified
    if (maxImages && files.length > maxImages) {
      errors.push(`You can only upload up to ${maxImages} images`)
      return { valid, errors }
    }
    
    // Validate each file
    Array.from(files).forEach(file => {
      const validation = validateFile(file, bucket)
      if (validation.valid) {
        valid.push(file)
      } else {
        errors.push(`${file.name}: ${validation.error}`)
      }
    })
    
    return { valid, errors }
  }, [user, bucket, maxImages])

  const uploadImages = useCallback(async (files: File[]): Promise<BatchUploadResult> => {
    if (!user) {
      const errorMsg = 'You must be logged in to upload images'
      setError(errorMsg)
      onError?.(errorMsg)
      return {
        success: false,
        results: [],
        errors: [errorMsg],
        successCount: 0,
        failureCount: files.length
      }
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress({ completed: 0, total: files.length, percentage: 0 })

    try {
      const result = await uploadFiles(files, bucket, user.id, {
        onProgress: (progress) => {
          const percentage = Math.round((progress.completed / progress.total) * 100)
          setUploadProgress({
            completed: progress.completed,
            total: progress.total,
            percentage
          })
        }
      })

      if (result.success) {
        const successfulUrls = result.results
          .filter(r => r.success && r.url)
          .map(r => r.url!)
        
        onSuccess?.(successfulUrls)
      } else {
        const errorMsg = result.errors.join('; ')
        setError(errorMsg)
        onError?.(errorMsg)
      }

      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMsg)
      onError?.(errorMsg)
      
      return {
        success: false,
        results: [],
        errors: [errorMsg],
        successCount: 0,
        failureCount: files.length
      }
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }, [user, bucket, onSuccess, onError])

  const deleteImage = useCallback(async (url: string): Promise<boolean> => {
    if (!user) {
      const errorMsg = 'You must be logged in to delete images'
      setError(errorMsg)
      onError?.(errorMsg)
      return false
    }

    try {
      const filePath = extractFilePathFromUrl(url, user.id)
      if (!filePath) {
        const errorMsg = 'Could not determine file path from URL'
        setError(errorMsg)
        onError?.(errorMsg)
        return false
      }

      const result = await deleteFile(filePath, bucket)
      
      if (!result.success) {
        setError(result.error || 'Failed to delete image')
        onError?.(result.error || 'Failed to delete image')
        return false
      }

      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete image'
      setError(errorMsg)
      onError?.(errorMsg)
      return false
    }
  }, [user, bucket, onError])

  return {
    isUploading,
    error,
    uploadProgress,
    uploadImages,
    deleteImage,
    validateFiles,
    clearError
  }
}
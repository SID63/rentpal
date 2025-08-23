'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import {
  uploadFiles,
  deleteFile,
  validateFile,
  extractFilePathFromUrl,
  formatFileSize,
  createPreviewUrl,
  cleanupPreviewUrl,
  BUCKET_CONFIG
} from '@/lib/storage-utils'
import type { BucketName, FileUploadResult } from '@/types/storage'

interface ImageUploadProps {
  bucket: BucketName
  images: string[]
  onImagesChange: (images: string[]) => void
  onFileUpload?: (files: File[]) => Promise<void> | void
  maxImages?: number
  allowMultiple?: boolean
  showPreview?: boolean
  showProgress?: boolean
  disabled?: boolean
  className?: string
  dragDropText?: string
  buttonText?: string
}

interface FileWithPreview {
  file: File
  preview: string
  id: string
}

interface UploadProgress {
  completed: number
  total: number
  currentFile?: string
  percentage: number
}

export default function EnhancedImageUpload({
  bucket,
  images,
  onImagesChange,
  onFileUpload,
  maxImages,
  allowMultiple = true,
  showPreview = true,
  showProgress = true,
  disabled = false,
  className = '',
  dragDropText,
  buttonText
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [pendingFiles, setPendingFiles] = useState<FileWithPreview[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  
  const config = BUCKET_CONFIG[bucket]
  const effectiveMaxImages = maxImages || config.maxFiles || (allowMultiple ? 10 : 1)
  
  // Default text based on bucket type
  const defaultDragDropText = dragDropText || (
    bucket === 'avatars' 
      ? 'Drop your profile photo here or click to browse'
      : 'Drop your images here or click to browse'
  )
  
  const defaultButtonText = buttonText || (
    bucket === 'avatars' 
      ? 'Choose Profile Photo'
      : 'Choose Images'
  )

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach(file => cleanupPreviewUrl(file.preview))
    }
  }, [pendingFiles])

  const validateFiles = useCallback((files: FileList): { valid: File[]; errors: string[] } => {
    const valid: File[] = []
    const errors: string[] = []
    
    // Check total count
    const totalAfterUpload = images.length + files.length
    if (totalAfterUpload > effectiveMaxImages) {
      errors.push(`You can only upload up to ${effectiveMaxImages} ${bucket === 'avatars' ? 'photo' : 'images'}`)
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
  }, [images.length, effectiveMaxImages, bucket])

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || !user || disabled) return

    const { valid, errors } = validateFiles(files)
    
    if (errors.length > 0) {
      setError(errors.join('; '))
      return
    }
    
    if (valid.length === 0) return

    // Create preview files
    const filesWithPreview: FileWithPreview[] = valid.map(file => ({
      file,
      preview: createPreviewUrl(file),
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`
    }))
    
    setPendingFiles(prev => [...prev, ...filesWithPreview])
    setIsUploading(true)
    setError(null)

    try {
      // If custom upload handler is provided, use it instead
      if (onFileUpload) {
        await onFileUpload(valid)
        
        // Clean up preview URLs
        filesWithPreview.forEach(file => cleanupPreviewUrl(file.preview))
        setPendingFiles([])
      } else {
        // Default upload behavior
        const result = await uploadFiles(valid, bucket, user.id, {
          onProgress: (progress) => {
            const percentage = Math.round((progress.completed / progress.total) * 100)
            setUploadProgress({
              ...progress,
              percentage
            })
          }
        })

        if (result.success) {
          const successfulUrls = result.results
            .filter(r => r.success && r.url)
            .map(r => r.url!)
          
          onImagesChange([...images, ...successfulUrls])
          
          // Clean up preview URLs for successful uploads
          filesWithPreview.forEach(file => cleanupPreviewUrl(file.preview))
          setPendingFiles([])
        } else {
          setError(result.errors.join('; '))
          // Keep pending files for retry
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }, [user, disabled, validateFiles, bucket, images, onImagesChange])

  const handleRemoveImage = useCallback(async (imageUrl: string, index: number) => {
    if (!user) return

    try {
      const filePath = extractFilePathFromUrl(imageUrl, user.id)
      if (filePath) {
        await deleteFile(filePath, bucket)
      }

      const newImages = images.filter((_, i) => i !== index)
      onImagesChange(newImages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove image')
    }
  }, [user, bucket, images, onImagesChange])

  const handleRemovePendingFile = useCallback((fileId: string) => {
    setPendingFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId)
      // Clean up the preview URL
      const removed = prev.find(f => f.id === fileId)
      if (removed) {
        cleanupPreviewUrl(removed.preview)
      }
      return updated
    })
  }, [])

  const moveImage = useCallback((fromIndex: number, toIndex: number) => {
    if (!allowMultiple) return
    
    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    onImagesChange(newImages)
  }, [images, onImagesChange, allowMultiple])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [disabled, handleFileSelect])

  const canUploadMore = images.length + pendingFiles.length < effectiveMaxImages

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {canUploadMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 cursor-pointer'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={config.allowedMimeTypes.join(',')}
            multiple={allowMultiple}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={disabled}
          />

          <div className="space-y-2">
            <svg
              className={`mx-auto h-12 w-12 ${disabled ? 'text-gray-300' : 'text-gray-400'}`}
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className={disabled ? 'text-gray-400' : 'text-gray-600'}>
              <span className={`font-medium ${disabled ? 'text-gray-400' : 'text-blue-600 hover:text-blue-500'}`}>
                {defaultButtonText}
              </span>
              <span> or drag and drop</span>
            </div>
            <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
              {config.allowedMimeTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} up to {formatFileSize(config.fileSizeLimit)} each
              {allowMultiple && ` (max ${effectiveMaxImages} ${bucket === 'avatars' ? 'photo' : 'images'})`}
            </p>
          </div>

          {/* Upload Progress */}
          {isUploading && showProgress && uploadProgress && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Uploading {uploadProgress.currentFile || ''}... ({uploadProgress.completed}/{uploadProgress.total})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Pending Files Preview */}
      {pendingFiles.length > 0 && showPreview && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Uploading...</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pendingFiles.map((fileWithPreview) => (
              <div
                key={fileWithPreview.id}
                className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
              >
                <Image
                  src={fileWithPreview.preview}
                  alt={fileWithPreview.file.name}
                  fill
                  className="object-cover opacity-50"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                
                {/* Loading Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemovePendingFile(fileWithPreview.id)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Images Preview */}
      {images.length > 0 && showPreview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {bucket === 'avatars' ? 'Profile Photo' : `Uploaded Images (${images.length}/${effectiveMaxImages})`}
            </h4>
            {allowMultiple && images.length > 1 && (
              <p className="text-sm text-gray-500">
                Drag to reorder • First image will be the main photo
              </p>
            )}
          </div>

          <div className={`grid gap-4 ${
            bucket === 'avatars' 
              ? 'grid-cols-1 max-w-xs' 
              : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}>
            {images.map((imageUrl, index) => (
              <div
                key={imageUrl}
                className={`relative group bg-gray-100 rounded-lg overflow-hidden ${
                  bucket === 'avatars' ? 'aspect-square' : 'aspect-square'
                }`}
                draggable={allowMultiple && !disabled}
                onDragStart={(e) => {
                  if (allowMultiple) {
                    e.dataTransfer.setData('text/plain', index.toString())
                  }
                }}
                onDragOver={(e) => allowMultiple && e.preventDefault()}
                onDrop={(e) => {
                  if (allowMultiple) {
                    e.preventDefault()
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
                    if (fromIndex !== index) {
                      moveImage(fromIndex, index)
                    }
                  }
                }}
              >
                <Image
                  src={imageUrl}
                  alt={`${bucket === 'avatars' ? 'Profile photo' : `Upload ${index + 1}`}`}
                  fill
                  className={`object-cover ${allowMultiple && !disabled ? 'cursor-move' : ''}`}
                  sizes={bucket === 'avatars' ? '200px' : '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'}
                />

                {/* Main Photo Badge */}
                {allowMultiple && index === 0 && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Main Photo
                  </div>
                )}

                {/* Remove Button */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(imageUrl, index)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {/* Drag Handle */}
                {allowMultiple && !disabled && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload More Button */}
      {images.length > 0 && canUploadMore && !isUploading && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add More {bucket === 'avatars' ? 'Photos' : 'Images'} ({effectiveMaxImages - images.length} remaining)
        </button>
      )}
    </div>
  )
}
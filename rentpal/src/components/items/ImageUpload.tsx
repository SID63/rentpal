'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  maxSizeMB?: number
}

export default function ImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
  maxSizeMB = 5
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !user) return

    if (images.length + files.length > maxImages) {
      setError(`You can only upload up to ${maxImages} images`)
      return
    }

    setIsUploading(true)
    setError(null)

    const newImages: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} is not an image file`)
          continue
        }

        // Validate file size
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`${file.name} is larger than ${maxSizeMB}MB`)
          continue
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${user.id}/items/${fileName}`

        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          if (uploadError.message.includes('Bucket not found')) {
            setError(`Storage bucket not found. Please set up storage buckets first. Go to /setup-storage`)
          } else {
            setError(`Failed to upload ${file.name}: ${uploadError.message}`)
          }
          continue
        }

        // Get public URL
        const { data } = supabase.storage
          .from('item-images')
          .getPublicUrl(filePath)

        if (data.publicUrl) {
          newImages.push(data.publicUrl)
        }
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages])
      }
    } catch {
      setError('Failed to upload images')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = async (imageUrl: string, index: number) => {
    try {
      // Extract the file path from the URL
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${user?.id}/items/${fileName}`

      // Delete from Supabase Storage
      await supabase.storage
        .from('item-images')
        .remove([filePath])

      // Remove from local state
      const newImages = images.filter((_, i) => i !== index)
      onImagesChange(newImages)
    } catch {
      setError('Failed to remove image')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    onImagesChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <div className="text-gray-600">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Click to upload
            </button>
            <span> or drag and drop</span>
          </div>
          <p className="text-sm text-gray-500">
            PNG, JPG, GIF up to {maxSizeMB}MB each (max {maxImages} images)
          </p>
        </div>

        {isUploading && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Uploading images...</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Uploaded Images ({images.length}/{maxImages})
            </h4>
            <p className="text-sm text-gray-500">
              Drag to reorder • First image will be the main photo
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((imageUrl, index) => (
              <div
                key={imageUrl}
                className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', index.toString())
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
                  if (fromIndex !== index) {
                    moveImage(fromIndex, index)
                  }
                }}
              >
                <Image
                  src={imageUrl}
                  alt={`Upload ${index + 1}`}
                  fill
                  className="object-cover cursor-move"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />

                {/* Main Photo Badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Main Photo
                  </div>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(imageUrl, index)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Drag Handle */}
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload More Button */}
      {images.length > 0 && images.length < maxImages && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add More Images ({maxImages - images.length} remaining)
        </button>
      )}
    </div>
  )
}
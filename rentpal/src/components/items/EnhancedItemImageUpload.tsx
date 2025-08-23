'use client'

import EnhancedImageUpload from '@/components/shared/EnhancedImageUpload'

interface ItemImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  disabled?: boolean
  className?: string
}

export default function EnhancedItemImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false,
  className = ''
}: ItemImageUploadProps) {
  return (
    <div className={className}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Item Images
        </label>
        <p className="text-sm text-gray-500 mb-4">
          Upload high-quality images of your item. The first image will be used as the main photo.
        </p>
      </div>
      
      <EnhancedImageUpload
        bucket="item-images"
        images={images}
        onImagesChange={onImagesChange}
        maxImages={maxImages}
        allowMultiple={true}
        showPreview={true}
        showProgress={true}
        disabled={disabled}
        dragDropText="Drop your item images here or click to browse"
        buttonText="Choose Item Images"
      />
      
      {images.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Tips for better listings:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Use natural lighting for clearer photos</li>
                <li>Show the item from multiple angles</li>
                <li>Include any accessories or parts</li>
                <li>Highlight any wear or damage honestly</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
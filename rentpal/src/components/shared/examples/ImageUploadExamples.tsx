'use client'

import { useState } from 'react'
import EnhancedItemImageUpload from '@/components/items/EnhancedItemImageUpload'
import EnhancedProfileImageUpload from '@/components/profile/EnhancedProfileImageUpload'

/**
 * Example usage of the enhanced image upload components
 */
export default function ImageUploadExamples() {
  const [itemImages, setItemImages] = useState<string[]>([])
  const [profileImage, setProfileImage] = useState<string>('')

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Enhanced Image Upload Components
        </h1>
      </div>

      {/* Item Image Upload Example */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Item Image Upload
        </h2>
        <p className="text-gray-600 mb-6">
          Upload multiple images for rental items with drag-and-drop support, 
          progress tracking, and image reordering.
        </p>
        
        <EnhancedItemImageUpload
          images={itemImages}
          onImagesChange={setItemImages}
          maxImages={5}
        />
        
        {itemImages.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Current Images:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              {itemImages.map((url, index) => (
                <li key={index} className="truncate">
                  {index + 1}. {url}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Profile Image Upload Example */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Profile Image Upload
        </h2>
        <p className="text-gray-600 mb-6">
          Upload a single profile photo with automatic cleanup of old images.
        </p>
        
        <EnhancedProfileImageUpload
          currentImageUrl={profileImage}
          onImageChange={setProfileImage}
        />
        
        {profileImage && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Current Profile Image:</h3>
            <p className="text-sm text-gray-600 truncate">{profileImage}</p>
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">
          Usage Instructions
        </h2>
        <div className="space-y-4 text-blue-700">
          <div>
            <h3 className="font-medium mb-2">For Item Images:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Supports multiple image uploads (up to 10 by default)</li>
              <li>Drag and drop functionality</li>
              <li>Image reordering by dragging</li>
              <li>Progress tracking during upload</li>
              <li>File validation (type, size)</li>
              <li>Preview with remove buttons</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">For Profile Images:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Single image upload only</li>
              <li>Automatic cleanup of old profile images</li>
              <li>Smaller file size limits (2MB vs 5MB)</li>
              <li>Optimized for avatar display</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Common Features:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Supports JPEG, PNG, and WebP formats</li>
              <li>Client-side file validation</li>
              <li>Error handling with user-friendly messages</li>
              <li>Loading states and progress indicators</li>
              <li>Responsive design</li>
              <li>Accessibility compliant</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Code Examples
        </h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Item Image Upload:</h3>
            <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`import EnhancedItemImageUpload from '@/components/items/EnhancedItemImageUpload'

function ItemForm() {
  const [images, setImages] = useState<string[]>([])
  
  return (
    <EnhancedItemImageUpload
      images={images}
      onImagesChange={setImages}
      maxImages={10}
      disabled={false}
    />
  )
}`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Profile Image Upload:</h3>
            <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`import EnhancedProfileImageUpload from '@/components/profile/EnhancedProfileImageUpload'

function ProfileForm() {
  const [profileImage, setProfileImage] = useState<string>('')
  
  return (
    <EnhancedProfileImageUpload
      currentImageUrl={profileImage}
      onImageChange={setProfileImage}
      disabled={false}
      showLabel={true}
    />
  )
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { validateProfileForItemCreation, analyzeProfileCompleteness, generateProfileErrorMessage } from '@/lib/profile-validation'
import ProfileValidationAlert from '@/components/profile/ProfileValidationAlert'
import ProfileCompletionBanner from '@/components/profile/ProfileCompletionBanner'
import { Profile } from '@/types/database'

const completeProfile: Profile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg',
  phone: '555-123-4567',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94102',
  latitude: 37.7749,
  longitude: -122.4194,
  bio: 'I love sharing my stuff with the community!',
  verification_status: 'verified',
  rating: 4.8,
  total_reviews: 15,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const incompleteProfile: Profile = {
  ...completeProfile,
  full_name: '',
  address: '',
  city: '',
  state: '',
  zip_code: ''
}

const partialProfile: Profile = {
  ...completeProfile,
  phone: null,
  bio: null,
  avatar_url: null
}

export default function TestProfileValidationPage() {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(completeProfile)

  const validation = validateProfileForItemCreation(selectedProfile)
  const completeness = analyzeProfileCompleteness(selectedProfile)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Profile Validation Test Page
          </h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Test Different Profile States</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setSelectedProfile(completeProfile)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedProfile === completeProfile
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Complete Profile
              </button>
              <button
                onClick={() => setSelectedProfile(partialProfile)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedProfile === partialProfile
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Partial Profile
              </button>
              <button
                onClick={() => setSelectedProfile(incompleteProfile)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedProfile === incompleteProfile
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Incomplete Profile
              </button>
              <button
                onClick={() => setSelectedProfile(null)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedProfile === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                No Profile
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Profile Validation Alert</h3>
              <ProfileValidationAlert validation={validation} />
              {validation.valid && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  ✅ Profile is valid for item creation!
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Profile Completeness</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Completion</span>
                  <span className="text-sm font-medium text-gray-900">
                    {completeness.completionPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completeness.completionPercentage}%` }}
                  ></div>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <p><strong>Complete:</strong> {completeness.isComplete ? 'Yes' : 'No'}</p>
                  <p><strong>Missing Required:</strong> {completeness.missingRequiredFields.join(', ') || 'None'}</p>
                  <p><strong>Missing Optional:</strong> {completeness.missingOptionalFields.join(', ') || 'None'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Profile Data</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(selectedProfile, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Validation Result</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(validation, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Completion Banner Demo</h2>
          <p className="text-gray-600 mb-4">
            This banner would normally only show for incomplete profiles, but here it's shown for demonstration.
          </p>
          <ProfileCompletionBanner showOnlyIfIncomplete={false} />
        </div>
      </div>
    </div>
  )
}
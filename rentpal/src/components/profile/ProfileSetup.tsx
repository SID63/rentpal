'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import EnhancedProfileImageUpload from './EnhancedProfileImageUpload'

const profileSetupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  address: z.string().min(5, 'Please enter a valid address'),
  city: z.string().min(2, 'Please enter a valid city'),
  state: z.string().min(2, 'Please enter a valid state'),
  zipCode: z.string().min(5, 'Please enter a valid ZIP code'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional()
})

type ProfileSetupData = z.infer<typeof profileSetupSchema>

export default function ProfileSetup() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ProfileSetupData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      fullName: user?.user_metadata?.full_name || ''
    }
  })

  const onSubmit = async (data: ProfileSetupData) => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // Create profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: data.fullName,
          phone: data.phone || null,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          bio: data.bio || null,
          avatar_url: avatarUrl,
          verification_status: 'pending',
          rating: 0,
          total_reviews: 0
        })

      if (profileError) {
        setError(profileError.message)
        return
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName,
          profile_complete: true
        }
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url)
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
        <p className="text-gray-600 mt-2">
          Help others get to know you by completing your profile information.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Image Upload */}
        <div>
          <EnhancedProfileImageUpload
            currentImageUrl={avatarUrl}
            onImageChange={handleAvatarChange}
            disabled={isLoading}
            showLabel={true}
            showDefaultFallback={false}
            className="mb-6"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              {...register('fullName')}
              type="text"
              id="fullName"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
            {errors.fullName && (
              <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              {...register('phone')}
              type="tel"
              id="phone"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(555) 123-4567"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Street Address *
          </label>
          <input
            {...register('address')}
            type="text"
            id="address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="123 Main Street"
          />
          {errors.address && (
            <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              {...register('city')}
              type="text"
              id="city"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="City"
            />
            {errors.city && (
              <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State *
            </label>
            <input
              {...register('state')}
              type="text"
              id="state"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="State"
            />
            {errors.state && (
              <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code *
            </label>
            <input
              {...register('zipCode')}
              type="text"
              id="zipCode"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="12345"
            />
            {errors.zipCode && (
              <p className="text-red-500 text-sm mt-1">{errors.zipCode.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            {...register('bio')}
            id="bio"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tell others about yourself..."
          />
          {errors.bio && (
            <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>
          )}
          <p className="text-gray-500 text-sm mt-1">
            This helps build trust with other users in the community.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving Profile...' : 'Complete Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
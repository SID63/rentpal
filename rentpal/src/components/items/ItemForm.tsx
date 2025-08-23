'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { itemService } from '@/lib/database'
import { Item, ItemInsert, ItemUpdate, Category } from '@/types/database'
import CategorySelector from '@/components/categories/CategorySelector'
import ImageUpload from '@/components/items/ImageUpload'
import AvailabilityCalendar from '@/components/items/AvailabilityCalendar'
import ProfileValidationAlert from '@/components/profile/ProfileValidationAlert'
import { useProfileValidation } from '@/hooks/useProfileValidation'
import { useRouter } from 'next/navigation'

const itemFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000, 'Description must be less than 1000 characters'),
  categoryId: z.string().min(1, 'Please select a category'),
  dailyRate: z.number().min(1, 'Daily rate must be at least $1').max(10000, 'Daily rate must be less than $10,000'),
  hourlyRate: z.number().optional(),
  securityDeposit: z.number().min(0, 'Security deposit cannot be negative').max(5000, 'Security deposit must be less than $5,000'),
  minRentalDuration: z.number().min(1, 'Minimum rental duration must be at least 1 hour').max(168, 'Maximum duration is 168 hours (1 week)'),
  maxRentalDuration: z.number().optional(),
  locationAddress: z.string().min(5, 'Please enter a valid address'),
  locationCity: z.string().min(2, 'Please enter a valid city'),
  locationState: z.string().min(2, 'Please enter a valid state'),
  locationZip: z.string().min(5, 'Please enter a valid ZIP code'),
  pickupInstructions: z.string().optional(),
  deliveryAvailable: z.boolean(),
  deliveryFee: z.number().min(0, 'Delivery fee cannot be negative'),
  deliveryRadius: z.number().min(0, 'Delivery radius cannot be negative')
})

type ItemFormData = z.infer<typeof itemFormSchema>

interface ItemFormProps {
  item?: Item
  onSuccess?: (item: Item) => void
  onCancel?: () => void
}

export default function ItemForm({ item, onSuccess, onCancel }: ItemFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(item?.category_id || '')
  const { user } = useAuth()
  const { validation: profileValidation, isLoading: isLoadingProfile } = useProfileValidation()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      title: item?.title || '',
      description: item?.description || '',
      categoryId: item?.category_id || '',
      dailyRate: item?.daily_rate || 1,
      hourlyRate: item?.hourly_rate || undefined,
      securityDeposit: item?.security_deposit || 0,
      minRentalDuration: item?.min_rental_duration || 24,
      maxRentalDuration: item?.max_rental_duration || undefined,
      locationAddress: item?.location_address || '',
      locationCity: item?.location_city || '',
      locationState: item?.location_state || '',
      locationZip: item?.location_zip || '',
      pickupInstructions: item?.pickup_instructions || undefined,
      deliveryAvailable: item?.delivery_available || false,
      deliveryFee: item?.delivery_fee || 0,
      deliveryRadius: item?.delivery_radius || 0
    }
  })

  const deliveryAvailable = watch('deliveryAvailable')

  useEffect(() => {
    if (item) {
      setSelectedCategoryId(item.category_id)
      // Load existing images if editing
      // This would be implemented when we have the image loading functionality
    }
  }, [item])



  const onSubmit = async (data: ItemFormData) => {
    if (!user) {
      setError('You must be logged in to create a listing')
      return
    }

    // Validate profile before proceeding
    if (!profileValidation.valid) {
      setError(profileValidation.error || 'Please complete your profile before creating items.')
      return
    }

    // Additional client-side validation
    if (!data.categoryId) {
      setError('Please select a category for your item.')
      return
    }

    if (data.dailyRate <= 0) {
      setError('Please enter a valid daily rate greater than $0.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const itemData: ItemInsert | ItemUpdate = {
        title: data.title,
        description: data.description,
        category_id: data.categoryId,
        daily_rate: data.dailyRate,
        hourly_rate: data.hourlyRate || null,
        security_deposit: data.securityDeposit,
        min_rental_duration: data.minRentalDuration,
        max_rental_duration: data.maxRentalDuration || null,
        location_address: data.locationAddress,
        location_city: data.locationCity,
        location_state: data.locationState,
        location_zip: data.locationZip,
        pickup_instructions: data.pickupInstructions || null,
        delivery_available: data.deliveryAvailable,
        delivery_fee: data.deliveryFee,
        delivery_radius: data.deliveryRadius,
        status: 'active'
      }

      let result: any = null

      if (item) {
        // Update existing item
        if (images.length > 0) {
          // Use updateItemWithImages if there are images
          const updateResult = await itemService.updateItemWithImages(item.id, itemData as ItemUpdate, images as any)
          if (updateResult.success) {
            result = updateResult.data
            // Show warning if there was a partial success (item updated but images failed)
            if (updateResult.error) {
              setError(updateResult.error)
            }
          } else {
            // Provide more specific error messages for updates
            const errorMessage = updateResult.error || 'Failed to update item. Please try again.'
            if (errorMessage.includes('image')) {
              setError('There was an issue updating your images. The item details were saved, but please try uploading images again.')
            } else {
              setError(errorMessage)
            }
            return
          }
        } else {
          // Use regular updateItem if no images
          result = await itemService.updateItem(item.id, itemData as ItemUpdate)
          if (!result) {
            setError('Failed to update item. Please try again.')
            return
          }
        }
      } else {
        // Create new item using enhanced itemService interface
        const createResult = await itemService.createItem({
          itemData: {
            ...itemData,
            owner_id: user.id
          } as ItemInsert,
          images: images.length > 0 ? images as any : undefined
        })

        if (createResult.success) {
          result = createResult.data
          // Show warning if there was a partial success (item created but images failed)
          if (createResult.error) {
            setError(createResult.error)
            // Don't return here - we still want to redirect/callback since item was created
          }
        } else {
          // Provide more specific error messages based on the error content
          const errorMessage = createResult.error || 'Failed to create item. Please try again.'
          if (errorMessage.includes('profile')) {
            setError('Please complete your profile before creating a listing. You can do this in your account settings.')
          } else if (errorMessage.includes('image')) {
            setError('There was an issue uploading your images. Please try again or create the listing without images first.')
          } else {
            setError(errorMessage)
          }
          return
        }
      }

      if (!result) {
        setError('Failed to save item. Please try again.')
        return
      }

      // Success! Clear any previous errors and proceed
      setError(null)
      
      if (onSuccess) {
        onSuccess(result)
      } else {
        router.push(`/items/${result.id}`)
      }
    } catch (error) {
      console.error('Form submission error:', error)
      // Provide user-friendly error message based on error type
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.')
        } else if (error.message.includes('unauthorized') || error.message.includes('auth')) {
          setError('Authentication error. Please log in again and try again.')
        } else {
          setError(`Error: ${error.message}`)
        }
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCategorySelect = (categoryId: string, category: Category) => {
    setSelectedCategoryId(categoryId)
    setValue('categoryId', categoryId)
  }

  const handleImagesChange = (newImages: string[]) => {
    setImages(newImages)
  }

  // Show loading state while checking profile
  if (isLoadingProfile) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-600">Loading profile information...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {item ? 'Edit Listing' : 'Create New Listing'}
        </h2>
        <p className="text-gray-600 mt-2">
          {item ? 'Update your item details' : 'List your item for rent in the community'}
        </p>
      </div>

      {/* Profile validation alert */}
      {!profileValidation.valid && (
        <ProfileValidationAlert 
          validation={profileValidation}
          showDismiss={false}
        />
      )}

      {error && (
        <div className={`border px-4 py-3 rounded mb-6 ${
          error.includes('successfully') || error.includes('saved') 
            ? 'bg-yellow-50 border-yellow-200 text-yellow-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Item Title *
            </label>
            <input
              {...register('title')}
              type="text"
              id="title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Professional DSLR Camera with Lenses"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your item, its condition, what's included, and any special instructions..."
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <CategorySelector
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={handleCategorySelect}
            showSubcategories={true}
          />
          {errors.categoryId && (
            <p className="text-red-500 text-sm">{errors.categoryId.message}</p>
          )}
        </div>

        {/* Images */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Photos</h3>
          <ImageUpload
            images={images}
            onImagesChange={handleImagesChange}
            maxImages={10}
          />
        </div>

        {/* Pricing */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Pricing</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="dailyRate" className="block text-sm font-medium text-gray-700 mb-1">
                Daily Rate ($) *
              </label>
              <input
                {...register('dailyRate', { valueAsNumber: true })}
                type="number"
                id="dailyRate"
                min="1"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="25.00"
              />
              {errors.dailyRate && (
                <p className="text-red-500 text-sm mt-1">{errors.dailyRate.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Rate ($) <span className="text-gray-500">(optional)</span>
              </label>
              <input
                {...register('hourlyRate', { valueAsNumber: true })}
                type="number"
                id="hourlyRate"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5.00"
              />
              {errors.hourlyRate && (
                <p className="text-red-500 text-sm mt-1">{errors.hourlyRate.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-700 mb-1">
                Security Deposit ($)
              </label>
              <input
                {...register('securityDeposit', { valueAsNumber: true })}
                type="number"
                id="securityDeposit"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="50.00"
              />
              {errors.securityDeposit && (
                <p className="text-red-500 text-sm mt-1">{errors.securityDeposit.message}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Refundable deposit to protect against damage
              </p>
            </div>
          </div>
        </div>

        {/* Rental Duration */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Rental Duration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="minRentalDuration" className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Rental (hours) *
              </label>
              <input
                {...register('minRentalDuration', { valueAsNumber: true })}
                type="number"
                id="minRentalDuration"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="24"
              />
              {errors.minRentalDuration && (
                <p className="text-red-500 text-sm mt-1">{errors.minRentalDuration.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="maxRentalDuration" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Rental (hours) <span className="text-gray-500">(optional)</span>
              </label>
              <input
                {...register('maxRentalDuration', { valueAsNumber: true })}
                type="number"
                id="maxRentalDuration"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="168"
              />
              {errors.maxRentalDuration && (
                <p className="text-red-500 text-sm mt-1">{errors.maxRentalDuration.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Location</h3>
          
          <div>
            <label htmlFor="locationAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address *
            </label>
            <input
              {...register('locationAddress')}
              type="text"
              id="locationAddress"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123 Main Street"
            />
            {errors.locationAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.locationAddress.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="locationCity" className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                {...register('locationCity')}
                type="text"
                id="locationCity"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="San Francisco"
              />
              {errors.locationCity && (
                <p className="text-red-500 text-sm mt-1">{errors.locationCity.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="locationState" className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <input
                {...register('locationState')}
                type="text"
                id="locationState"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="CA"
              />
              {errors.locationState && (
                <p className="text-red-500 text-sm mt-1">{errors.locationState.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="locationZip" className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code *
              </label>
              <input
                {...register('locationZip')}
                type="text"
                id="locationZip"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="94102"
              />
              {errors.locationZip && (
                <p className="text-red-500 text-sm mt-1">{errors.locationZip.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pickup & Delivery */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Pickup & Delivery</h3>
          
          <div>
            <label htmlFor="pickupInstructions" className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Instructions
            </label>
            <textarea
              {...register('pickupInstructions')}
              id="pickupInstructions"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Ring doorbell, available weekdays 9-5, parking instructions..."
            />
            {errors.pickupInstructions && (
              <p className="text-red-500 text-sm mt-1">{errors.pickupInstructions.message}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              {...register('deliveryAvailable')}
              type="checkbox"
              id="deliveryAvailable"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="deliveryAvailable" className="ml-2 block text-sm text-gray-700">
              I offer delivery service
            </label>
          </div>

          {deliveryAvailable && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-6">
              <div>
                <label htmlFor="deliveryFee" className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Fee ($)
                </label>
                <input
                  {...register('deliveryFee', { valueAsNumber: true })}
                  type="number"
                  id="deliveryFee"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10.00"
                />
                {errors.deliveryFee && (
                  <p className="text-red-500 text-sm mt-1">{errors.deliveryFee.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="deliveryRadius" className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Radius (miles)
                </label>
                <input
                  {...register('deliveryRadius', { valueAsNumber: true })}
                  type="number"
                  id="deliveryRadius"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10"
                />
                {errors.deliveryRadius && (
                  <p className="text-red-500 text-sm mt-1">{errors.deliveryRadius.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Availability Calendar */}
        {item && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Availability</h3>
            <AvailabilityCalendar itemId={item.id} />
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !profileValidation.valid}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? (item ? 'Updating Listing...' : 'Creating Listing...') : (item ? 'Update Listing' : 'Create Listing')}
          </button>
        </div>
      </form>
    </div>
  )
}
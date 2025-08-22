'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ItemWithDetails, BookingInsert } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { bookingService } from '@/lib/database'
import { useRouter } from 'next/navigation'
import BookingCalendar from './BookingCalendar'

const bookingFormSchema = z.object({
  startDate: z.string().min(1, 'Please select a start date'),
  endDate: z.string().min(1, 'Please select an end date'),
  startTime: z.string().default('09:00'),
  endTime: z.string().default('17:00'),
  pickupLocation: z.string().optional(),
  returnLocation: z.string().optional(),
  specialInstructions: z.string().optional(),
  needsDelivery: z.boolean().default(false),
  deliveryAddress: z.string().optional()
}).refine((data) => {
  const start = new Date(`${data.startDate}T${data.startTime}`)
  const end = new Date(`${data.endDate}T${data.endTime}`)
  return end > start
}, {
  message: "End date and time must be after start date and time",
  path: ["endDate"]
})

type BookingFormData = z.infer<typeof bookingFormSchema>

interface BookingFormProps {
  item: ItemWithDetails
  onBookingComplete?: (bookingId: string) => void
  onCancel?: () => void
  className?: string
}

export default function BookingForm({ 
  item, 
  onBookingComplete, 
  onCancel,
  className = "" 
}: BookingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [pricing, setPricing] = useState({
    totalHours: 0,
    subtotal: 0,
    serviceFee: 0,
    deliveryFee: 0,
    securityDeposit: item.security_deposit,
    totalAmount: 0
  })
  const { user } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      startTime: '09:00',
      endTime: '17:00',
      needsDelivery: false
    }
  })

  const watchedValues = watch()

  // Calculate pricing when dates/times change
  useEffect(() => {
    calculatePricing()
  }, [watchedValues.startDate, watchedValues.endDate, watchedValues.startTime, watchedValues.endTime, watchedValues.needsDelivery])

  const handleCalendarDateSelect = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      setValue('startDate', startDate)
      setValue('endDate', endDate)
      setShowCalendar(false)
    }
  }

  const calculatePricing = () => {
    if (!watchedValues.startDate || !watchedValues.endDate) {
      setPricing(prev => ({ ...prev, totalHours: 0, subtotal: 0, totalAmount: 0 }))
      return
    }

    const startDateTime = new Date(`${watchedValues.startDate}T${watchedValues.startTime}`)
    const endDateTime = new Date(`${watchedValues.endDate}T${watchedValues.endTime}`)
    
    if (endDateTime <= startDateTime) {
      setPricing(prev => ({ ...prev, totalHours: 0, subtotal: 0, totalAmount: 0 }))
      return
    }

    const totalHours = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60))
    
    // Check minimum rental duration
    if (totalHours < item.min_rental_duration) {
      setPricing(prev => ({ ...prev, totalHours, subtotal: 0, totalAmount: 0 }))
      return
    }

    // Check maximum rental duration
    if (item.max_rental_duration && totalHours > item.max_rental_duration) {
      setPricing(prev => ({ ...prev, totalHours, subtotal: 0, totalAmount: 0 }))
      return
    }

    // Calculate subtotal based on daily/hourly rates
    let subtotal = 0
    if (item.hourly_rate && totalHours < 24) {
      // Use hourly rate for short rentals
      subtotal = totalHours * item.hourly_rate
    } else {
      // Use daily rate for longer rentals
      const days = Math.ceil(totalHours / 24)
      subtotal = days * item.daily_rate
    }

    // Calculate service fee (10% of subtotal)
    const serviceFee = Math.round(subtotal * 0.1 * 100) / 100

    // Calculate delivery fee
    const deliveryFee = watchedValues.needsDelivery ? item.delivery_fee : 0

    // Calculate total
    const totalAmount = subtotal + serviceFee + deliveryFee + item.security_deposit

    setPricing({
      totalHours,
      subtotal,
      serviceFee,
      deliveryFee,
      securityDeposit: item.security_deposit,
      totalAmount
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    }
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) {
      return `${days} day${days !== 1 ? 's' : ''}`
    }
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
  }

  const onSubmit = async (data: BookingFormData) => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (pricing.totalAmount === 0) {
      setError('Please select valid dates and times')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`)
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`)

      const bookingData: BookingInsert = {
        item_id: item.id,
        renter_id: user.id,
        owner_id: item.owner_id,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        total_hours: pricing.totalHours,
        daily_rate: item.daily_rate,
        hourly_rate: item.hourly_rate || null,
        subtotal: pricing.subtotal,
        service_fee: pricing.serviceFee,
        security_deposit: pricing.securityDeposit,
        total_amount: pricing.totalAmount,
        pickup_location: data.pickupLocation || null,
        return_location: data.returnLocation || null,
        special_instructions: data.specialInstructions || null,
        status: 'pending'
      }

      const booking = await bookingService.createBooking(bookingData)

      if (!booking) {
        setError('Failed to create booking. Please try again.')
        return
      }

      if (onBookingComplete) {
        onBookingComplete(booking.id)
      } else {
        router.push(`/bookings/${booking.id}`)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isValidDuration = pricing.totalHours >= item.min_rental_duration && 
    (!item.max_rental_duration || pricing.totalHours <= item.max_rental_duration)

  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Book This Item</h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="font-medium">{item.title}</span>
          <span>•</span>
          <span>{formatPrice(item.daily_rate)} / day</span>
          {item.hourly_rate && (
            <>
              <span>•</span>
              <span>{formatPrice(item.hourly_rate)} / hour</span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Date Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Rental Dates *
            </label>
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
            </button>
          </div>

          {showCalendar && (
            <BookingCalendar
              itemId={item.id}
              selectedStartDate={watchedValues.startDate}
              selectedEndDate={watchedValues.endDate}
              onDateSelect={handleCalendarDateSelect}
              minRentalDuration={item.min_rental_duration}
              maxRentalDuration={item.max_rental_duration}
              className="mb-4"
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                {...register('startDate')}
                type="date"
                id="startDate"
                min={minDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                {...register('endDate')}
                type="date"
                id="endDate"
                min={watchedValues.startDate || minDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.endDate && (
                <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Time Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              {...register('startTime')}
              type="time"
              id="startTime"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              {...register('endTime')}
              type="time"
              id="endTime"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Duration and Validation */}
        {pricing.totalHours > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Rental Duration:</span>
              <span className="text-sm text-gray-900">{formatDuration(pricing.totalHours)}</span>
            </div>
            
            {!isValidDuration && (
              <div className="text-red-600 text-sm">
                {pricing.totalHours < item.min_rental_duration && (
                  <p>Minimum rental duration is {formatDuration(item.min_rental_duration)}</p>
                )}
                {item.max_rental_duration && pricing.totalHours > item.max_rental_duration && (
                  <p>Maximum rental duration is {formatDuration(item.max_rental_duration)}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Delivery Option */}
        {item.delivery_available && (
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                {...register('needsDelivery')}
                type="checkbox"
                id="needsDelivery"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="needsDelivery" className="ml-2 block text-sm text-gray-700">
                I need delivery ({formatPrice(item.delivery_fee)} within {item.delivery_radius} miles)
              </label>
            </div>

            {watchedValues.needsDelivery && (
              <div>
                <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address
                </label>
                <input
                  {...register('deliveryAddress')}
                  type="text"
                  id="deliveryAddress"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter delivery address"
                />
              </div>
            )}
          </div>
        )}

        {/* Pickup/Return Locations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pickupLocation" className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Location
            </label>
            <input
              {...register('pickupLocation')}
              type="text"
              id="pickupLocation"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Leave blank for default location"
            />
          </div>

          <div>
            <label htmlFor="returnLocation" className="block text-sm font-medium text-gray-700 mb-1">
              Return Location
            </label>
            <input
              {...register('returnLocation')}
              type="text"
              id="returnLocation"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Leave blank for same as pickup"
            />
          </div>
        </div>

        {/* Special Instructions */}
        <div>
          <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions
          </label>
          <textarea
            {...register('specialInstructions')}
            id="specialInstructions"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any special requests or instructions..."
          />
        </div>

        {/* Pricing Summary */}
        {pricing.totalAmount > 0 && isValidDuration && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-3">Pricing Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-800">
                  {item.hourly_rate && pricing.totalHours < 24 
                    ? `${pricing.totalHours} hours × ${formatPrice(item.hourly_rate)}`
                    : `${Math.ceil(pricing.totalHours / 24)} days × ${formatPrice(item.daily_rate)}`
                  }
                </span>
                <span className="text-blue-900">{formatPrice(pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-800">Service fee</span>
                <span className="text-blue-900">{formatPrice(pricing.serviceFee)}</span>
              </div>
              {pricing.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-800">Delivery fee</span>
                  <span className="text-blue-900">{formatPrice(pricing.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-blue-800">Security deposit (refundable)</span>
                <span className="text-blue-900">{formatPrice(pricing.securityDeposit)}</span>
              </div>
              <div className="border-t border-blue-200 pt-2 flex justify-between font-medium">
                <span className="text-blue-900">Total</span>
                <span className="text-blue-900">{formatPrice(pricing.totalAmount)}</span>
              </div>
            </div>
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
            disabled={isLoading || !isValidDuration || pricing.totalAmount === 0}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Booking...' : `Book for ${formatPrice(pricing.totalAmount)}`}
          </button>
        </div>
      </form>
    </div>
  )
}
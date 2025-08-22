'use client'

import { useState } from 'react'
import { ItemWithDetails, BookingWithDetails } from '@/types/database'
import BookingForm from './BookingForm'
import BookingConfirmation from './BookingConfirmation'

interface BookingWorkflowProps {
  item: ItemWithDetails
  onComplete?: () => void
  className?: string
}

type WorkflowStep = 'form' | 'confirmation'

export default function BookingWorkflow({ 
  item, 
  onComplete,
  className = "" 
}: BookingWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('form')
  const [completedBooking, setCompletedBooking] = useState<BookingWithDetails | null>(null)

  const handleBookingComplete = async (bookingId: string) => {
    // In a real app, you would fetch the complete booking details here
    // For now, we'll create a mock booking object
    const mockBooking: BookingWithDetails = {
      id: bookingId,
      item_id: item.id,
      renter_id: 'current-user-id',
      owner_id: item.owner_id,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      total_hours: 24,
      daily_rate: item.daily_rate,
      hourly_rate: item.hourly_rate,
      subtotal: item.daily_rate,
      service_fee: item.daily_rate * 0.1,
      security_deposit: item.security_deposit,
      total_amount: item.daily_rate + (item.daily_rate * 0.1) + item.security_deposit,
      status: 'pending',
      pickup_location: null,
      return_location: null,
      special_instructions: null,
      stripe_payment_intent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      item: item,
      renter: {
        id: 'current-user-id',
        email: 'user@example.com',
        full_name: 'Current User',
        avatar_url: null,
        phone: null,
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip_code: '12345',
        latitude: null,
        longitude: null,
        bio: null,
        verification_status: 'pending',
        rating: 0,
        total_reviews: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      owner: item.owner
    }

    setCompletedBooking(mockBooking)
    setCurrentStep('confirmation')
  }

  const handleWorkflowComplete = () => {
    if (onComplete) {
      onComplete()
    }
  }

  const handleBackToForm = () => {
    setCurrentStep('form')
    setCompletedBooking(null)
  }

  return (
    <div className={className}>
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className={`flex items-center ${currentStep === 'form' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'form' 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-green-100 text-green-600'
            }`}>
              {currentStep === 'form' ? '1' : '✓'}
            </div>
            <span className="ml-2 text-sm font-medium">Booking Details</span>
          </div>
          
          <div className={`flex-1 h-0.5 mx-4 ${
            currentStep === 'confirmation' ? 'bg-green-200' : 'bg-gray-200'
          }`}></div>
          
          <div className={`flex items-center ${
            currentStep === 'confirmation' ? 'text-blue-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'confirmation' 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Confirmation</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'form' && (
        <BookingForm
          item={item}
          onBookingComplete={handleBookingComplete}
          onCancel={onComplete}
        />
      )}

      {currentStep === 'confirmation' && completedBooking && (
        <BookingConfirmation
          booking={completedBooking}
          onClose={handleWorkflowComplete}
        />
      )}

      {/* Debug/Development Actions */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Development Actions</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentStep('form')}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Show Form
            </button>
            <button
              onClick={() => {
                handleBookingComplete('dev-booking-id')
              }}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Show Confirmation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
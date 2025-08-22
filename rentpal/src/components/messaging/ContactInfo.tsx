'use client'

import { useState } from 'react'
import { BookingWithDetails } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

interface ContactInfoProps {
  booking: BookingWithDetails
  className?: string
}

export default function ContactInfo({ booking, className = "" }: ContactInfoProps) {
  const [showContact, setShowContact] = useState(false)
  const { user } = useAuth()

  const isRenter = user?.id === booking.renter_id
  const isOwner = user?.id === booking.owner_id
  const isActiveBooking = booking.status === 'active' || booking.status === 'confirmed'

  // Only show contact info for confirmed/active bookings and to participants
  if (!isActiveBooking || (!isRenter && !isOwner)) {
    return null
  }

  const contactPerson = isRenter ? booking.owner : booking.renter
  const contactRole = isRenter ? 'Item Owner' : 'Renter'

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-medium text-blue-900 mb-1">
            Contact Information Available
          </h4>
          <p className="text-sm text-blue-800 mb-3">
            Since your booking is {booking.status}, you can now contact the {contactRole.toLowerCase()} directly for coordination.
          </p>
          
          {!showContact ? (
            <button
              onClick={() => setShowContact(true)}
              className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Show Contact Details
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center space-x-3 mb-3">
                  {contactPerson.avatar_url ? (
                    <img
                      src={contactPerson.avatar_url}
                      alt={contactPerson.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {contactPerson.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h5 className="font-medium text-gray-900">{contactPerson.full_name}</h5>
                    <p className="text-sm text-gray-600">{contactRole}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {contactPerson.phone && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-gray-700">{contactPerson.phone}</span>
                      <a
                        href={`tel:${contactPerson.phone}`}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Call
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700">{contactPerson.email}</span>
                    <a
                      href={`mailto:${contactPerson.email}`}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Email
                    </a>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="text-gray-700">
                      <div>{contactPerson.address}</div>
                      <div>{contactPerson.city}, {contactPerson.state} {contactPerson.zip_code}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowContact(false)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Hide contact details
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Important Notice */}
      <div className="mt-4 pt-3 border-t border-blue-200">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">Privacy & Safety</p>
            <p>
              Contact information is only shared for confirmed bookings. Please use this information responsibly and only for rental coordination. Report any misuse to our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
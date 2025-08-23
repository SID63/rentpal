'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProfileValidationResult, generateProfileErrorMessage } from '@/lib/profile-validation'

interface ProfileValidationAlertProps {
  validation: ProfileValidationResult
  onDismiss?: () => void
  showDismiss?: boolean
}

export default function ProfileValidationAlert({ 
  validation, 
  onDismiss, 
  showDismiss = false 
}: ProfileValidationAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (validation.valid || isDismissed) {
    return null
  }

  const errorInfo = generateProfileErrorMessage(validation)

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg 
            className="h-5 w-5 text-amber-400" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            {errorInfo.title}
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>{errorInfo.message}</p>
            
            {validation.suggestions && validation.suggestions.length > 0 && (
              <ul className="mt-2 list-disc list-inside space-y-1">
                {validation.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 flex items-center space-x-3">
            <Link
              href={errorInfo.actionUrl}
              className="bg-amber-100 text-amber-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
            >
              {errorInfo.actionText}
            </Link>
            {showDismiss && (
              <button
                type="button"
                onClick={handleDismiss}
                className="text-amber-700 text-sm hover:text-amber-600 focus:outline-none focus:underline"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        {!showDismiss && (
          <div className="ml-auto pl-3">
            <div className="flex">
              <button
                type="button"
                onClick={handleDismiss}
                className="bg-amber-50 rounded-md p-1.5 text-amber-500 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:ring-offset-amber-50"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
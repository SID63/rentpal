'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { profileService } from '@/lib/database'
import { analyzeProfileCompleteness, getProfileCompletionTips, ProfileCompleteness } from '@/lib/profile-validation'
import { Profile } from '@/types/database'

interface ProfileCompletionBannerProps {
  showOnlyIfIncomplete?: boolean
  minimumCompletionThreshold?: number
  className?: string
}

export default function ProfileCompletionBanner({ 
  showOnlyIfIncomplete = true,
  minimumCompletionThreshold = 80,
  className = ''
}: ProfileCompletionBannerProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    async function loadProfileCompleteness() {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const userProfile = await profileService.getProfile(user.id)
        setProfile(userProfile)
        
        const profileCompleteness = analyzeProfileCompleteness(userProfile)
        setCompleteness(profileCompleteness)
      } catch (error) {
        console.error('Error loading profile completeness:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfileCompleteness()
  }, [user])

  // Don't show if loading, dismissed, or user not logged in
  if (isLoading || isDismissed || !user || !completeness) {
    return null
  }

  // Don't show if profile is complete enough and we only show for incomplete profiles
  if (showOnlyIfIncomplete && completeness.completionPercentage >= minimumCompletionThreshold) {
    return null
  }

  const tips = getProfileCompletionTips(completeness)
  const isProfileComplete = completeness.isComplete

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="relative">
            <svg 
              className="h-8 w-8 text-blue-600" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
            {!isProfileComplete && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-amber-400 rounded-full border-2 border-white"></div>
            )}
          </div>
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-blue-900">
              {isProfileComplete ? 'Profile Complete!' : 'Complete Your Profile'}
            </h3>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-blue-700 font-medium">
                {completeness.completionPercentage}% complete
              </div>
              <div className="w-16 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completeness.completionPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="mt-2 text-sm text-blue-800">
            {isProfileComplete ? (
              <p>Your profile is complete and ready to build trust with the community!</p>
            ) : (
              <div>
                <p className="mb-2">
                  A complete profile helps build trust and increases your success on the platform.
                </p>
                {tips.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {tips.slice(0, 2).map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-3 flex items-center space-x-3">
            <Link
              href="/profile/edit"
              className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {isProfileComplete ? 'View Profile' : 'Complete Profile'}
            </Link>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-blue-700 text-xs hover:text-blue-600 focus:outline-none focus:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
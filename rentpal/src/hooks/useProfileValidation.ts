import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { profileService } from '@/lib/database'
import { validateProfileForItemCreation, analyzeProfileCompleteness, ProfileValidationResult, ProfileCompleteness } from '@/lib/profile-validation'
import { Profile } from '@/types/database'

export interface UseProfileValidationReturn {
  profile: Profile | null
  validation: ProfileValidationResult
  completeness: ProfileCompleteness | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to validate user profile for various purposes
 */
export function useProfileValidation(): UseProfileValidationReturn {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [validation, setValidation] = useState<ProfileValidationResult>({ valid: true })
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchProfileData = async () => {
    if (!user) {
      setProfile(null)
      setValidation({ valid: false, error: 'User not authenticated' })
      setCompleteness(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const userProfile = await profileService.getProfile(user.id)
      setProfile(userProfile)

      // Validate profile for item creation
      const profileValidation = validateProfileForItemCreation(userProfile)
      setValidation(profileValidation)

      // Analyze profile completeness
      const profileCompleteness = analyzeProfileCompleteness(userProfile)
      setCompleteness(profileCompleteness)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile'
      setError(errorMessage)
      setValidation({
        valid: false,
        error: 'Unable to validate profile. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfileData()
  }, [user])

  return {
    profile,
    validation,
    completeness,
    isLoading,
    error,
    refetch: fetchProfileData
  }
}
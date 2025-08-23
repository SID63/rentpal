// Profile validation utilities for item creation
import { Profile } from '@/types/database'

export interface ProfileValidationResult {
  valid: boolean
  error?: string
  missingFields?: string[]
  suggestions?: string[]
}

export interface ProfileCompleteness {
  isComplete: boolean
  completionPercentage: number
  missingRequiredFields: string[]
  missingOptionalFields: string[]
}

// Required fields for item creation
const REQUIRED_FIELDS_FOR_ITEM_CREATION = [
  'full_name',
  'address', 
  'city',
  'state',
  'zip_code'
] as const

// Optional but recommended fields
const RECOMMENDED_FIELDS = [
  'phone',
  'bio',
  'avatar_url'
] as const

// Field display names for user-friendly messages
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  full_name: 'Full Name',
  address: 'Street Address',
  city: 'City',
  state: 'State',
  zip_code: 'ZIP Code',
  phone: 'Phone Number',
  bio: 'Bio',
  avatar_url: 'Profile Picture'
}

/**
 * Validates if a user profile is complete enough for item creation
 */
export function validateProfileForItemCreation(profile: Profile | null): ProfileValidationResult {
  if (!profile) {
    return {
      valid: false,
      error: 'Profile not found. Please complete your profile setup before creating items.',
      suggestions: [
        'Click "Complete Profile" to set up your profile',
        'Fill in your basic information including name and address',
        'Add a profile picture to build trust with renters'
      ]
    }
  }

  // Check required fields
  const missingFields = REQUIRED_FIELDS_FOR_ITEM_CREATION.filter(field => {
    const value = profile[field as keyof Profile]
    return !value || (typeof value === 'string' && value.trim() === '')
  })

  if (missingFields.length > 0) {
    const missingFieldNames = missingFields.map(field => FIELD_DISPLAY_NAMES[field] || field)
    
    return {
      valid: false,
      error: `Please complete your profile before creating items. Missing required information: ${missingFieldNames.join(', ')}.`,
      missingFields: missingFields,
      suggestions: [
        'Go to Profile Settings to complete your information',
        'All required fields must be filled to create listings',
        'This helps build trust and credibility with renters'
      ]
    }
  }

  return { valid: true }
}

/**
 * Analyzes profile completeness for general purposes
 */
export function analyzeProfileCompleteness(profile: Profile | null): ProfileCompleteness {
  if (!profile) {
    return {
      isComplete: false,
      completionPercentage: 0,
      missingRequiredFields: [...REQUIRED_FIELDS_FOR_ITEM_CREATION],
      missingOptionalFields: [...RECOMMENDED_FIELDS]
    }
  }

  // Check required fields
  const missingRequiredFields = REQUIRED_FIELDS_FOR_ITEM_CREATION.filter(field => {
    const value = profile[field as keyof Profile]
    return !value || (typeof value === 'string' && value.trim() === '')
  })

  // Check optional fields
  const missingOptionalFields = RECOMMENDED_FIELDS.filter(field => {
    const value = profile[field as keyof Profile]
    return !value || (typeof value === 'string' && value.trim() === '')
  })

  const totalFields = REQUIRED_FIELDS_FOR_ITEM_CREATION.length + RECOMMENDED_FIELDS.length
  const completedFields = totalFields - missingRequiredFields.length - missingOptionalFields.length
  const completionPercentage = Math.round((completedFields / totalFields) * 100)

  return {
    isComplete: missingRequiredFields.length === 0,
    completionPercentage,
    missingRequiredFields,
    missingOptionalFields
  }
}

/**
 * Generates user-friendly error messages with actionable guidance
 */
export function generateProfileErrorMessage(validation: ProfileValidationResult): {
  title: string
  message: string
  actionText: string
  actionUrl: string
} {
  if (!validation.missingFields || validation.missingFields.length === 0) {
    return {
      title: 'Profile Setup Required',
      message: 'Please complete your profile to start creating listings.',
      actionText: 'Complete Profile',
      actionUrl: '/profile/setup'
    }
  }

  const missingFieldNames = validation.missingFields.map(field => FIELD_DISPLAY_NAMES[field] || field)
  
  if (validation.missingFields.length === 1) {
    return {
      title: 'Profile Information Missing',
      message: `Please add your ${missingFieldNames[0]} to your profile before creating listings.`,
      actionText: 'Update Profile',
      actionUrl: '/profile/edit'
    }
  }

  return {
    title: 'Profile Information Incomplete',
    message: `Please complete the following profile information: ${missingFieldNames.join(', ')}.`,
    actionText: 'Complete Profile',
    actionUrl: '/profile/edit'
  }
}

/**
 * Checks if a profile exists and has basic information
 */
export function hasBasicProfile(profile: Profile | null): boolean {
  if (!profile) return false
  
  // At minimum, user should have a name
  return !!(profile.full_name && profile.full_name.trim())
}

/**
 * Gets profile completion tips for users
 */
export function getProfileCompletionTips(completeness: ProfileCompleteness): string[] {
  const tips: string[] = []

  if (completeness.missingRequiredFields.includes('full_name')) {
    tips.push('Add your full name so renters know who they\'re dealing with')
  }

  if (completeness.missingRequiredFields.some(field => ['address', 'city', 'state', 'zip_code'].includes(field))) {
    tips.push('Complete your address information for accurate item location and delivery options')
  }

  if (completeness.missingOptionalFields.includes('phone')) {
    tips.push('Add a phone number for easier communication with renters')
  }

  if (completeness.missingOptionalFields.includes('bio')) {
    tips.push('Write a brief bio to help build trust with the community')
  }

  if (completeness.missingOptionalFields.includes('avatar_url')) {
    tips.push('Upload a profile picture to make your listings more trustworthy')
  }

  if (tips.length === 0) {
    tips.push('Your profile looks great! You\'re ready to create listings.')
  }

  return tips
}
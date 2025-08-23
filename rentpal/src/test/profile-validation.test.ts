import { describe, it, expect } from 'vitest'
import { 
  validateProfileForItemCreation, 
  analyzeProfileCompleteness,
  generateProfileErrorMessage,
  hasBasicProfile,
  getProfileCompletionTips
} from '@/lib/profile-validation'
import { Profile } from '@/types/database'

// Mock profile data
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
  zip_code: '',
  phone: null,
  bio: null,
  avatar_url: null
}

const partialProfile: Profile = {
  ...completeProfile,
  phone: null,
  bio: null,
  avatar_url: null
}

describe('Profile Validation', () => {
  describe('validateProfileForItemCreation', () => {
    it('should validate complete profile as valid', () => {
      const result = validateProfileForItemCreation(completeProfile)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
      expect(result.missingFields).toBeUndefined()
    })

    it('should reject null profile', () => {
      const result = validateProfileForItemCreation(null)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Profile not found')
      expect(result.suggestions).toBeDefined()
    })

    it('should identify missing required fields', () => {
      const result = validateProfileForItemCreation(incompleteProfile)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing required information')
      expect(result.missingFields).toEqual(['full_name', 'address', 'city', 'state', 'zip_code'])
    })

    it('should validate profile with only required fields', () => {
      const result = validateProfileForItemCreation(partialProfile)
      expect(result.valid).toBe(true)
    })

    it('should handle empty string fields as missing', () => {
      const profileWithEmptyStrings: Profile = {
        ...completeProfile,
        full_name: '   ', // whitespace only
        address: '',
        city: '  '
      }
      
      const result = validateProfileForItemCreation(profileWithEmptyStrings)
      expect(result.valid).toBe(false)
      expect(result.missingFields).toContain('full_name')
      expect(result.missingFields).toContain('address')
      expect(result.missingFields).toContain('city')
    })
  })

  describe('analyzeProfileCompleteness', () => {
    it('should analyze complete profile correctly', () => {
      const result = analyzeProfileCompleteness(completeProfile)
      expect(result.isComplete).toBe(true)
      expect(result.completionPercentage).toBe(100)
      expect(result.missingRequiredFields).toHaveLength(0)
      expect(result.missingOptionalFields).toHaveLength(0)
    })

    it('should analyze incomplete profile correctly', () => {
      const result = analyzeProfileCompleteness(incompleteProfile)
      expect(result.isComplete).toBe(false)
      expect(result.completionPercentage).toBe(0)
      expect(result.missingRequiredFields).toHaveLength(5)
      expect(result.missingOptionalFields).toHaveLength(3)
    })

    it('should analyze partial profile correctly', () => {
      const result = analyzeProfileCompleteness(partialProfile)
      expect(result.isComplete).toBe(true)
      expect(result.completionPercentage).toBe(63) // 5/8 fields complete (rounded)
      expect(result.missingRequiredFields).toHaveLength(0)
      expect(result.missingOptionalFields).toHaveLength(3)
    })

    it('should handle null profile', () => {
      const result = analyzeProfileCompleteness(null)
      expect(result.isComplete).toBe(false)
      expect(result.completionPercentage).toBe(0)
      expect(result.missingRequiredFields).toHaveLength(5)
      expect(result.missingOptionalFields).toHaveLength(3)
    })
  })

  describe('generateProfileErrorMessage', () => {
    it('should generate appropriate message for missing profile', () => {
      const validation = validateProfileForItemCreation(null)
      const result = generateProfileErrorMessage(validation)
      
      expect(result.title).toBe('Profile Setup Required')
      expect(result.actionText).toBe('Complete Profile')
      expect(result.actionUrl).toBe('/profile/setup')
    })

    it('should generate appropriate message for single missing field', () => {
      const profileMissingName: Profile = {
        ...completeProfile,
        full_name: ''
      }
      
      const validation = validateProfileForItemCreation(profileMissingName)
      const result = generateProfileErrorMessage(validation)
      
      expect(result.title).toBe('Profile Information Missing')
      expect(result.message).toContain('Full Name')
      expect(result.actionText).toBe('Update Profile')
      expect(result.actionUrl).toBe('/profile/edit')
    })

    it('should generate appropriate message for multiple missing fields', () => {
      const validation = validateProfileForItemCreation(incompleteProfile)
      const result = generateProfileErrorMessage(validation)
      
      expect(result.title).toBe('Profile Information Incomplete')
      expect(result.message).toContain('Full Name, Street Address, City, State, ZIP Code')
      expect(result.actionText).toBe('Complete Profile')
      expect(result.actionUrl).toBe('/profile/edit')
    })
  })

  describe('hasBasicProfile', () => {
    it('should return true for profile with name', () => {
      expect(hasBasicProfile(completeProfile)).toBe(true)
    })

    it('should return false for null profile', () => {
      expect(hasBasicProfile(null)).toBe(false)
    })

    it('should return false for profile without name', () => {
      const profileWithoutName: Profile = {
        ...completeProfile,
        full_name: ''
      }
      expect(hasBasicProfile(profileWithoutName)).toBe(false)
    })

    it('should return false for profile with only whitespace name', () => {
      const profileWithWhitespaceName: Profile = {
        ...completeProfile,
        full_name: '   '
      }
      expect(hasBasicProfile(profileWithWhitespaceName)).toBe(false)
    })
  })

  describe('getProfileCompletionTips', () => {
    it('should provide relevant tips for incomplete profile', () => {
      const completeness = analyzeProfileCompleteness(incompleteProfile)
      const tips = getProfileCompletionTips(completeness)
      
      expect(tips).toContain('Add your full name so renters know who they\'re dealing with')
      expect(tips).toContain('Complete your address information for accurate item location and delivery options')
      expect(tips).toContain('Add a phone number for easier communication with renters')
      expect(tips).toContain('Write a brief bio to help build trust with the community')
      expect(tips).toContain('Upload a profile picture to make your listings more trustworthy')
    })

    it('should provide congratulatory message for complete profile', () => {
      const completeness = analyzeProfileCompleteness(completeProfile)
      const tips = getProfileCompletionTips(completeness)
      
      expect(tips).toContain('Your profile looks great! You\'re ready to create listings.')
    })

    it('should provide specific tips for partially complete profile', () => {
      const completeness = analyzeProfileCompleteness(partialProfile)
      const tips = getProfileCompletionTips(completeness)
      
      expect(tips).toContain('Add a phone number for easier communication with renters')
      expect(tips).toContain('Write a brief bio to help build trust with the community')
      expect(tips).toContain('Upload a profile picture to make your listings more trustworthy')
      expect(tips).not.toContain('Add your full name')
    })
  })
})
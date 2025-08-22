import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  createProfile, 
  updateProfile, 
  getProfile,
  createItemListing,
  updateItemListing,
  getItemListings,
  createBooking,
  getBookings,
  calculateBookingCost
} from '../database'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

describe('Database utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      single: mockSingle,
    })
    
    mockSelect.mockReturnThis()
    mockInsert.mockReturnThis()
    mockUpdate.mockReturnThis()
    mockEq.mockReturnThis()
  })

  describe('Profile operations', () => {
    it('creates a new profile', async () => {
      const profileData = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345'
      }

      mockInsert.mockResolvedValue({ data: profileData, error: null })

      const result = await createProfile(profileData)

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockInsert).toHaveBeenCalledWith(profileData)
      expect(result.data).toEqual(profileData)
    })

    it('updates an existing profile', async () => {
      const updates = { full_name: 'Updated Name' }
      const userId = 'user-123'

      mockUpdate.mockResolvedValue({ data: { ...updates, id: userId }, error: null })

      const result = await updateProfile(userId, updates)

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockUpdate).toHaveBeenCalledWith(updates)
      expect(mockEq).toHaveBeenCalledWith('id', userId)
      expect(result.data).toEqual({ ...updates, id: userId })
    })

    it('gets a profile by ID', async () => {
      const userId = 'user-123'
      const profileData = { id: userId, full_name: 'Test User' }

      mockSingle.mockResolvedValue({ data: profileData, error: null })

      const result = await getProfile(userId)

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', userId)
      expect(mockSingle).toHaveBeenCalled()
      expect(result.data).toEqual(profileData)
    })
  })

  describe('Item listing operations', () => {
    it('creates a new item listing', async () => {
      const itemData = {
        owner_id: 'user-123',
        title: 'Test Item',
        description: 'Test description',
        category: 'tools',
        daily_rate: 25,
        condition: 'good'
      }

      mockInsert.mockResolvedValue({ data: { ...itemData, id: 'item-123' }, error: null })

      const result = await createItemListing(itemData)

      expect(mockFrom).toHaveBeenCalledWith('item_listings')
      expect(mockInsert).toHaveBeenCalledWith(itemData)
      expect(result.data).toEqual({ ...itemData, id: 'item-123' })
    })

    it('updates an item listing', async () => {
      const itemId = 'item-123'
      const updates = { title: 'Updated Title', daily_rate: 30 }

      mockUpdate.mockResolvedValue({ data: { ...updates, id: itemId }, error: null })

      const result = await updateItemListing(itemId, updates)

      expect(mockFrom).toHaveBeenCalledWith('item_listings')
      expect(mockUpdate).toHaveBeenCalledWith(updates)
      expect(mockEq).toHaveBeenCalledWith('id', itemId)
      expect(result.data).toEqual({ ...updates, id: itemId })
    })

    it('gets item listings with filters', async () => {
      const filters = { category: 'tools', city: 'Test City' }
      const mockItems = [
        { id: 'item-1', title: 'Item 1' },
        { id: 'item-2', title: 'Item 2' }
      ]

      mockFrom.mockReturnValue({ data: mockItems, error: null })

      const result = await getItemListings(filters)

      expect(mockFrom).toHaveBeenCalledWith('item_listings')
      expect(result.data).toEqual(mockItems)
    })
  })

  describe('Booking operations', () => {
    it('creates a new booking', async () => {
      const bookingData = {
        item_id: 'item-123',
        renter_id: 'user-456',
        owner_id: 'user-123',
        start_date: '2024-02-01T10:00:00Z',
        end_date: '2024-02-02T10:00:00Z',
        total_hours: 24,
        pricing: {
          base_cost: 25,
          service_fee: 5,
          total_amount: 30
        }
      }

      mockInsert.mockResolvedValue({ data: { ...bookingData, id: 'booking-123' }, error: null })

      const result = await createBooking(bookingData)

      expect(mockFrom).toHaveBeenCalledWith('bookings')
      expect(mockInsert).toHaveBeenCalledWith(bookingData)
      expect(result.data).toEqual({ ...bookingData, id: 'booking-123' })
    })

    it('gets bookings for a user', async () => {
      const userId = 'user-123'
      const mockBookings = [
        { id: 'booking-1', renter_id: userId },
        { id: 'booking-2', owner_id: userId }
      ]

      mockFrom.mockReturnValue({ data: mockBookings, error: null })

      const result = await getBookings(userId)

      expect(mockFrom).toHaveBeenCalledWith('bookings')
      expect(result.data).toEqual(mockBookings)
    })
  })

  describe('Booking cost calculation', () => {
    it('calculates daily rental cost correctly', () => {
      const item = {
        daily_rate: 25,
        hourly_rate: 5,
        security_deposit: 50
      }
      
      const startDate = new Date('2024-02-01T10:00:00Z')
      const endDate = new Date('2024-02-03T10:00:00Z') // 2 days
      
      const cost = calculateBookingCost(item, startDate, endDate)
      
      expect(cost.base_cost).toBe(50) // 2 days * $25
      expect(cost.security_deposit).toBe(50)
      expect(cost.service_fee).toBe(5) // 10% of base cost
      expect(cost.total_amount).toBe(105) // base + deposit + service fee
    })

    it('calculates hourly rental cost for short periods', () => {
      const item = {
        daily_rate: 25,
        hourly_rate: 5,
        security_deposit: 50
      }
      
      const startDate = new Date('2024-02-01T10:00:00Z')
      const endDate = new Date('2024-02-01T14:00:00Z') // 4 hours
      
      const cost = calculateBookingCost(item, startDate, endDate)
      
      expect(cost.base_cost).toBe(20) // 4 hours * $5
      expect(cost.security_deposit).toBe(50)
      expect(cost.service_fee).toBe(2) // 10% of base cost
      expect(cost.total_amount).toBe(72)
    })

    it('includes delivery fee when specified', () => {
      const item = {
        daily_rate: 25,
        hourly_rate: 5,
        security_deposit: 50
      }
      
      const startDate = new Date('2024-02-01T10:00:00Z')
      const endDate = new Date('2024-02-02T10:00:00Z')
      const deliveryFee = 15
      
      const cost = calculateBookingCost(item, startDate, endDate, deliveryFee)
      
      expect(cost.base_cost).toBe(25)
      expect(cost.delivery_fee).toBe(15)
      expect(cost.total_amount).toBe(92.5) // base + deposit + service fee + delivery
    })

    it('handles edge case of same start and end time', () => {
      const item = {
        daily_rate: 25,
        hourly_rate: 5,
        security_deposit: 50
      }
      
      const startDate = new Date('2024-02-01T10:00:00Z')
      const endDate = new Date('2024-02-01T10:00:00Z')
      
      const cost = calculateBookingCost(item, startDate, endDate)
      
      expect(cost.base_cost).toBe(5) // Minimum 1 hour
      expect(cost.total_amount).toBe(55.5) // base + deposit + service fee
    })
  })
})
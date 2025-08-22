import { faker } from '@faker-js/faker'

// Type imports
import type { UserProfile, ItemListing, Booking, Review, Message, Category } from '@/types'

/**
 * Generate mock user profile data
 */
export const generateMockUser = (overrides: Partial<UserProfile> = {}): UserProfile => {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    full_name: faker.person.fullName(),
    avatar_url: faker.image.avatar(),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zip_code: faker.location.zipCode(),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    bio: faker.lorem.paragraph(),
    verification_status: faker.helpers.arrayElement(['pending', 'verified', 'rejected']),
    rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
    total_reviews: faker.number.int({ min: 0, max: 100 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

/**
 * Generate mock item listing data
 */
export const generateMockItem = (overrides: Partial<ItemListing> = {}): ItemListing => {
  const categories = ['tools', 'electronics', 'sports', 'vehicles', 'home', 'outdoor']
  const conditions = ['new', 'like_new', 'good', 'fair', 'poor'] as const
  const cancellationPolicies = ['flexible', 'moderate', 'strict'] as const
  const pickupDeliveryOptions = ['pickup_only', 'delivery_available', 'both'] as const
  const statuses = ['active', 'inactive', 'rented', 'maintenance'] as const

  return {
    id: faker.string.uuid(),
    owner_id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    category: faker.helpers.arrayElement(categories),
    subcategory: faker.commerce.department(),
    condition: faker.helpers.arrayElement(conditions),
    daily_rate: faker.number.float({ min: 5, max: 200, fractionDigits: 2 }),
    hourly_rate: faker.number.float({ min: 1, max: 50, fractionDigits: 2 }),
    security_deposit: faker.number.float({ min: 0, max: 500, fractionDigits: 2 }),
    images: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => 
      faker.image.url({ width: 800, height: 600 })
    ),
    location: {
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode(),
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
    },
    availability: {
      available_from: faker.date.future().toISOString().split('T')[0],
      available_until: faker.date.future({ years: 1 }).toISOString().split('T')[0],
      blocked_dates: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () =>
        faker.date.future().toISOString().split('T')[0]
      ),
      minimum_rental_period: faker.number.int({ min: 1, max: 24 }),
      maximum_rental_period: faker.number.int({ min: 24, max: 720 }),
    },
    policies: {
      cancellation_policy: faker.helpers.arrayElement(cancellationPolicies),
      pickup_delivery: faker.helpers.arrayElement(pickupDeliveryOptions),
      delivery_fee: faker.datatype.boolean() ? faker.number.float({ min: 5, max: 50, fractionDigits: 2 }) : undefined,
      delivery_radius: faker.datatype.boolean() ? faker.number.int({ min: 5, max: 50 }) : undefined,
    },
    status: faker.helpers.arrayElement(statuses),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

/**
 * Generate mock booking data
 */
export const generateMockBooking = (overrides: Partial<Booking> = {}): Booking => {
  const statuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed'] as const
  const paymentStatuses = ['pending', 'paid', 'refunded', 'partially_refunded'] as const
  const pickupMethods = ['pickup', 'delivery'] as const

  const startDate = faker.date.future()
  const endDate = faker.date.future({ refDate: startDate })
  const totalHours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
  const baseCost = faker.number.float({ min: 20, max: 500, fractionDigits: 2 })
  const securityDeposit = faker.number.float({ min: 0, max: 200, fractionDigits: 2 })
  const deliveryFee = faker.datatype.boolean() ? faker.number.float({ min: 5, max: 30, fractionDigits: 2 }) : 0
  const serviceFee = baseCost * 0.1 // 10% service fee

  return {
    id: faker.string.uuid(),
    item_id: faker.string.uuid(),
    renter_id: faker.string.uuid(),
    owner_id: faker.string.uuid(),
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    total_hours: totalHours,
    pricing: {
      base_cost: baseCost,
      security_deposit: securityDeposit,
      delivery_fee: deliveryFee > 0 ? deliveryFee : undefined,
      service_fee: serviceFee,
      total_amount: baseCost + securityDeposit + deliveryFee + serviceFee,
    },
    status: faker.helpers.arrayElement(statuses),
    payment_status: faker.helpers.arrayElement(paymentStatuses),
    pickup_delivery: {
      method: faker.helpers.arrayElement(pickupMethods),
      address: faker.location.streetAddress(),
      scheduled_time: faker.date.future().toISOString(),
      completed_time: faker.datatype.boolean() ? faker.date.recent().toISOString() : undefined,
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

/**
 * Generate mock review data
 */
export const generateMockReview = (overrides: Partial<Review> = {}): Review => {
  const reviewTypes = ['renter_to_owner', 'owner_to_renter', 'item_review'] as const

  return {
    id: faker.string.uuid(),
    booking_id: faker.string.uuid(),
    reviewer_id: faker.string.uuid(),
    reviewee_id: faker.string.uuid(),
    item_id: faker.string.uuid(),
    rating: faker.number.int({ min: 1, max: 5 }),
    comment: faker.lorem.paragraph(),
    review_type: faker.helpers.arrayElement(reviewTypes),
    created_at: faker.date.past().toISOString(),
    ...overrides,
  }
}

/**
 * Generate mock message data
 */
export const generateMockMessage = (overrides: Partial<Message> = {}): Message => {
  const messageTypes = ['text', 'image', 'location', 'system'] as const

  return {
    id: faker.string.uuid(),
    conversation_id: faker.string.uuid(),
    sender_id: faker.string.uuid(),
    recipient_id: faker.string.uuid(),
    content: faker.lorem.sentence(),
    message_type: faker.helpers.arrayElement(messageTypes),
    read_at: faker.datatype.boolean() ? faker.date.recent().toISOString() : undefined,
    created_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

/**
 * Generate mock category data
 */
export const generateMockCategory = (overrides: Partial<Category> = {}): Category => {
  const categoryNames = [
    'Tools', 'Electronics', 'Sports & Recreation', 'Vehicles', 
    'Home & Garden', 'Outdoor Equipment', 'Photography', 'Music'
  ]

  const name = faker.helpers.arrayElement(categoryNames)
  
  return {
    id: faker.string.uuid(),
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, 'and'),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['wrench', 'laptop', 'football', 'car', 'home', 'tent', 'camera', 'music']),
    parent_category_id: faker.datatype.boolean() ? faker.string.uuid() : undefined,
    subcategories: [],
    item_count: faker.number.int({ min: 0, max: 1000 }),
    created_at: faker.date.past().toISOString(),
    ...overrides,
  }
}

/**
 * Generate multiple items with realistic relationships
 */
export const generateMockDataSet = (options: {
  userCount?: number
  itemCount?: number
  bookingCount?: number
  reviewCount?: number
} = {}) => {
  const { userCount = 10, itemCount = 50, bookingCount = 20, reviewCount = 30 } = options

  // Generate users
  const users = Array.from({ length: userCount }, () => generateMockUser())
  
  // Generate items with realistic owner relationships
  const items = Array.from({ length: itemCount }, () => {
    const owner = faker.helpers.arrayElement(users)
    return generateMockItem({ owner_id: owner.id })
  })

  // Generate bookings with realistic relationships
  const bookings = Array.from({ length: bookingCount }, () => {
    const item = faker.helpers.arrayElement(items)
    const renter = faker.helpers.arrayElement(users.filter(u => u.id !== item.owner_id))
    
    return generateMockBooking({
      item_id: item.id,
      owner_id: item.owner_id,
      renter_id: renter.id,
    })
  })

  // Generate reviews with realistic relationships
  const reviews = Array.from({ length: reviewCount }, () => {
    const booking = faker.helpers.arrayElement(bookings.filter(b => b.status === 'completed'))
    const isRenterReview = faker.datatype.boolean()
    
    return generateMockReview({
      booking_id: booking.id,
      reviewer_id: isRenterReview ? booking.renter_id : booking.owner_id,
      reviewee_id: isRenterReview ? booking.owner_id : booking.renter_id,
      item_id: booking.item_id,
      review_type: isRenterReview ? 'renter_to_owner' : 'owner_to_renter',
    })
  })

  return {
    users,
    items,
    bookings,
    reviews,
  }
}

/**
 * Generate test data for specific scenarios
 */
export const generateScenarioData = {
  /**
   * Generate data for a new user scenario
   */
  newUser: () => ({
    user: generateMockUser({
      verification_status: 'pending',
      rating: 0,
      total_reviews: 0,
      created_at: new Date().toISOString(),
    }),
    items: [],
    bookings: [],
    reviews: [],
  }),

  /**
   * Generate data for an experienced user scenario
   */
  experiencedUser: () => {
    const user = generateMockUser({
      verification_status: 'verified',
      rating: faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 }),
      total_reviews: faker.number.int({ min: 20, max: 100 }),
    })

    const items = Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () =>
      generateMockItem({ owner_id: user.id })
    )

    const bookings = Array.from({ length: faker.number.int({ min: 5, max: 20 }) }, () =>
      generateMockBooking({
        owner_id: user.id,
        item_id: faker.helpers.arrayElement(items).id,
        status: 'completed',
      })
    )

    const reviews = bookings.map(booking =>
      generateMockReview({
        booking_id: booking.id,
        reviewee_id: user.id,
        review_type: 'renter_to_owner',
        rating: faker.number.int({ min: 4, max: 5 }),
      })
    )

    return { user, items, bookings, reviews }
  },

  /**
   * Generate data for high-demand items
   */
  popularItems: () => {
    const owner = generateMockUser({ verification_status: 'verified' })
    
    const items = Array.from({ length: 5 }, () =>
      generateMockItem({
        owner_id: owner.id,
        rating: faker.number.float({ min: 4.5, max: 5.0, fractionDigits: 1 }),
        daily_rate: faker.number.float({ min: 50, max: 200, fractionDigits: 2 }),
        status: 'active',
      })
    )

    const bookings = items.flatMap(item =>
      Array.from({ length: faker.number.int({ min: 10, max: 30 }) }, () =>
        generateMockBooking({
          item_id: item.id,
          owner_id: item.owner_id,
          status: faker.helpers.arrayElement(['completed', 'active', 'confirmed']),
        })
      )
    )

    return { owner, items, bookings }
  },

  /**
   * Generate data for testing edge cases
   */
  edgeCases: () => ({
    // User with no profile picture
    userWithoutAvatar: generateMockUser({ avatar_url: null }),
    
    // Item with no images
    itemWithoutImages: generateMockItem({ images: [] }),
    
    // Booking with zero security deposit
    bookingWithoutDeposit: generateMockBooking({
      pricing: {
        base_cost: 25.00,
        security_deposit: 0,
        service_fee: 2.50,
        total_amount: 27.50,
      },
    }),
    
    // Very long item description
    itemWithLongDescription: generateMockItem({
      description: faker.lorem.paragraphs(10),
    }),
    
    // Item with maximum images
    itemWithManyImages: generateMockItem({
      images: Array.from({ length: 10 }, () => faker.image.url()),
    }),
  }),
}

/**
 * Create mock API responses
 */
export const createMockApiResponse = <T>(data: T, options: {
  success?: boolean
  error?: string
  delay?: number
} = {}) => {
  const { success = true, error, delay = 0 } = options

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (success) {
        resolve({ data, error: null })
      } else {
        reject(new Error(error || 'Mock API error'))
      }
    }, delay)
  })
}

/**
 * Generate realistic search results
 */
export const generateSearchResults = (query: string, filters: any = {}) => {
  const baseItems = Array.from({ length: 50 }, () => generateMockItem())
  
  // Filter by query
  let filteredItems = baseItems
  if (query) {
    filteredItems = baseItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
    )
  }

  // Apply filters
  if (filters.category) {
    filteredItems = filteredItems.filter(item => item.category === filters.category)
  }
  
  if (filters.priceRange) {
    const [min, max] = filters.priceRange
    filteredItems = filteredItems.filter(item => 
      item.daily_rate >= min && item.daily_rate <= max
    )
  }

  if (filters.condition) {
    filteredItems = filteredItems.filter(item => item.condition === filters.condition)
  }

  return filteredItems
}
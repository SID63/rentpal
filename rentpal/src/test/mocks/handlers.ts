import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock Supabase Auth endpoints
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User'
        }
      }
    })
  }),

  // Mock Supabase REST API endpoints
  http.get('*/rest/v1/profiles', () => {
    return HttpResponse.json([
      {
        id: 'mock-user-id',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        phone: null,
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345',
        bio: 'Test bio',
        verification_status: 'verified',
        rating: 4.5,
        total_reviews: 10,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ])
  }),

  http.get('*/rest/v1/item_listings', () => {
    return HttpResponse.json([
      {
        id: 'mock-item-id',
        owner_id: 'mock-user-id',
        title: 'Test Item',
        description: 'A test item for rental',
        category: 'tools',
        subcategory: 'power-tools',
        condition: 'good',
        daily_rate: 25.00,
        hourly_rate: 5.00,
        security_deposit: 50.00,
        images: ['image1.jpg', 'image2.jpg'],
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip_code: '12345',
          latitude: 40.7128,
          longitude: -74.0060
        },
        availability: {
          available_from: '2024-01-01',
          available_until: '2024-12-31',
          blocked_dates: [],
          minimum_rental_period: 4,
          maximum_rental_period: 168
        },
        policies: {
          cancellation_policy: 'moderate',
          pickup_delivery: 'both',
          delivery_fee: 10.00,
          delivery_radius: 10
        },
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ])
  }),

  http.get('*/rest/v1/bookings', () => {
    return HttpResponse.json([
      {
        id: 'mock-booking-id',
        item_id: 'mock-item-id',
        renter_id: 'mock-renter-id',
        owner_id: 'mock-user-id',
        start_date: '2024-02-01T10:00:00Z',
        end_date: '2024-02-02T10:00:00Z',
        total_hours: 24,
        pricing: {
          base_cost: 25.00,
          security_deposit: 50.00,
          delivery_fee: 10.00,
          service_fee: 5.00,
          total_amount: 90.00
        },
        status: 'confirmed',
        payment_status: 'paid',
        pickup_delivery: {
          method: 'delivery',
          address: '456 Renter St',
          scheduled_time: '2024-02-01T09:00:00Z'
        },
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      }
    ])
  }),

  http.get('*/rest/v1/reviews', () => {
    return HttpResponse.json([
      {
        id: 'mock-review-id',
        booking_id: 'mock-booking-id',
        reviewer_id: 'mock-renter-id',
        reviewee_id: 'mock-user-id',
        item_id: 'mock-item-id',
        rating: 5,
        comment: 'Great item and owner!',
        review_type: 'renter_to_owner',
        created_at: '2024-02-03T00:00:00Z'
      }
    ])
  }),

  http.get('*/rest/v1/categories', () => {
    return HttpResponse.json([
      {
        id: 'tools',
        name: 'Tools',
        slug: 'tools',
        description: 'Power tools, hand tools, and equipment',
        icon: 'wrench',
        parent_category_id: null,
        item_count: 150,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'power-tools',
        name: 'Power Tools',
        slug: 'power-tools',
        description: 'Electric and battery-powered tools',
        icon: 'drill',
        parent_category_id: 'tools',
        item_count: 75,
        created_at: '2024-01-01T00:00:00Z'
      }
    ])
  }),

  // Mock file upload endpoints
  http.post('*/storage/v1/object/*', () => {
    return HttpResponse.json({
      Key: 'mock-file-key',
      ETag: 'mock-etag'
    })
  }),
]
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'

// Mock user data for testing
export const mockUser = {
  id: 'mock-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  }
}

export const mockProfile = {
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
  verification_status: 'verified' as const,
  rating: 4.5,
  total_reviews: 10,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockItem = {
  id: 'mock-item-id',
  owner_id: 'mock-user-id',
  title: 'Test Item',
  description: 'A test item for rental',
  category: 'tools',
  subcategory: 'power-tools',
  condition: 'good' as const,
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
    cancellation_policy: 'moderate' as const,
    pickup_delivery: 'both' as const,
    delivery_fee: 10.00,
    delivery_radius: 10
  },
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockBooking = {
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
  status: 'confirmed' as const,
  payment_status: 'paid' as const,
  pickup_delivery: {
    method: 'delivery' as const,
    address: '456 Renter St',
    scheduled_time: '2024-02-01T09:00:00Z'
  },
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z'
}

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
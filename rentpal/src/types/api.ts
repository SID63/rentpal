// API response types for RentPal application

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data: T | null
  error: string | null
  success: boolean
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T = unknown> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  error: string | null
  success: boolean
}

/**
 * Search API response
 */
export interface SearchResponse<T = unknown> {
  data: T[]
  filters: SearchFilters
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  error: string | null
  success: boolean
}

/**
 * Search filters interface
 */
export interface SearchFilters {
  query?: string
  category?: string
  location?: {
    city?: string
    state?: string
    radius?: number
    latitude?: number
    longitude?: number
  }
  priceRange?: {
    min?: number
    max?: number
  }
  availability?: {
    startDate?: string
    endDate?: string
  }
  rating?: number
  sortBy?: 'price' | 'rating' | 'distance' | 'newest' | 'popular'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Upload response interface
 */
export interface UploadResponse {
  url: string
  filename: string
  size: number
  contentType: string
  error: string | null
  success: boolean
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string
  message: string
  statusCode: number
  validationErrors?: ValidationError[]
  timestamp: string
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: {
    id: string
    email: string
    fullName: string
    avatarUrl?: string
  } | null
  session: {
    accessToken: string
    refreshToken: string
    expiresAt: number
  } | null
  error: string | null
  success: boolean
}

/**
 * Analytics data response
 */
export interface AnalyticsResponse {
  metrics: {
    totalUsers: number
    totalItems: number
    totalBookings: number
    totalRevenue: number
    activeUsers: number
    conversionRate: number
  }
  trends: {
    period: string
    userGrowth: number
    bookingGrowth: number
    revenueGrowth: number
  }
  topCategories: Array<{
    id: string
    name: string
    itemCount: number
    bookingCount: number
  }>
  error: string | null
  success: boolean
}

/**
 * Location geocoding response
 */
export interface GeocodeResponse {
  address: {
    formatted: string
    street?: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  coordinates: {
    latitude: number
    longitude: number
  }
  error: string | null
  success: boolean
}

/**
 * Payment intent response
 */
export interface PaymentIntentResponse {
  clientSecret: string
  paymentIntentId: string
  amount: number
  currency: string
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled'
  error: string | null
  success: boolean
}

/**
 * Notification response
 */
export interface NotificationResponse {
  notifications: Array<{
    id: string
    title: string
    message: string
    type: string
    isRead: boolean
    createdAt: string
    relatedId?: string
  }>
  unreadCount: number
  error: string | null
  success: boolean
}
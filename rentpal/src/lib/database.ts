// Database utility functions for RentPal
import { supabase } from './supabase'
import { 
  Profile, 
  ProfileInsert, 
  ProfileUpdate,
  Item,
  ItemInsert,
  ItemUpdate,
  ItemWithDetails,
  Category,
  Booking,
  BookingInsert,
  BookingUpdate,
  BookingWithDetails,
  Review,
  ReviewInsert,
  Message,
  MessageInsert,
  ConversationWithDetails,
  Notification
} from '@/types/database'
import { withCache, cacheKeys, invalidateCache } from '@/lib/cache'

// Profile operations
export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      return await withCache(
        cacheKeys.userProfile(userId),
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle()
          if (error) throw error
          return data || null
        },
        { ttl: 10 * 60 * 1000, useMemory: true, useStorage: true }
      )
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  },

  async createProfile(profile: ProfileInsert): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return null
    }

    return data
  },

  async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return null
    }

    // Invalidate caches
    invalidateCache.user(userId)
    return data
  },

  async searchProfiles(query: string, limit = 10): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,city.ilike.%${query}%`)
      .limit(limit)

    if (error) {
      console.error('Error searching profiles:', error)
      return []
    }

    return data || []
  }
}

// Category operations
export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      return await withCache(
        cacheKeys.categories(),
        async () => {
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
          if (error) throw error
          return data || []
        },
        { ttl: 60 * 60 * 1000, useMemory: true, useStorage: true }
      )
    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    }
  },

  async getCategoryById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching category:', error)
      return null
    }

    return data
  },

  async getCategoriesWithSubcategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    // Group categories by parent_id
    const categories = data || []
    const parentCategories = categories.filter(cat => !cat.parent_id)
    
    return parentCategories.map(parent => ({
      ...parent,
      subcategories: categories.filter(cat => cat.parent_id === parent.id)
    })) as Category[]
  }
}

// Item operations
export const itemService = {
  async getItems(filters?: {
    category?: string
    location?: string
    minPrice?: number
    maxPrice?: number
    limit?: number
    offset?: number
    coordinates?: { latitude: number; longitude: number }
    radius?: number // in miles
  }): Promise<ItemWithDetails[]> {
    let query = supabase
      .from('items')
      .select(`
        *,
        owner:profiles(*),
        category:categories(*),
        images:item_images(*),
        reviews:reviews(*)
      `)
      .eq('status', 'active')

    if (filters?.category) {
      query = query.eq('category_id', filters.category)
    }

    if (filters?.location) {
      query = query.or(`location_city.ilike.%${filters.location}%,location_state.ilike.%${filters.location}%`)
    }

    if (filters?.minPrice) {
      query = query.gte('daily_rate', filters.minPrice)
    }

    if (filters?.maxPrice) {
      query = query.lte('daily_rate', filters.maxPrice)
    }

    // Location-based filtering (basic implementation)
    if (filters?.coordinates && filters?.radius) {
      // This is a simplified approach. In production, you'd use PostGIS or similar
      const { latitude, longitude } = filters.coordinates
      const latRange = filters.radius / 69 // Approximate degrees per mile for latitude
      const lngRange = filters.radius / (69 * Math.cos(latitude * Math.PI / 180)) // Adjust for longitude

      query = query
        .gte('location_latitude', latitude - latRange)
        .lte('location_latitude', latitude + latRange)
        .gte('location_longitude', longitude - lngRange)
        .lte('location_longitude', longitude + lngRange)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1)
    }

    query = query.order('created_at', { ascending: false })

    const fetcher = async () => {
      const { data, error } = await query
      if (error) throw error
      return (data as ItemWithDetails[]) || []
    }

    // Only cache when filters are simple (no geo/range) to avoid huge key space
    const shouldCache = !filters?.coordinates && !filters?.radius && !filters?.minPrice && !filters?.maxPrice
    if (shouldCache) {
      try {
        const cacheKey = cacheKeys.searchResults(
          JSON.stringify({ category: filters?.category || 'all', location: filters?.location || 'all' }),
          { limit: filters?.limit || 20, offset: filters?.offset || 0 }
        )
        return await withCache(cacheKey, fetcher, { ttl: 5 * 60 * 1000, useMemory: true })
      } catch (error) {
        console.error('Error fetching items:', error)
        return []
      }
    }

    try {
      return await fetcher()
    } catch (error) {
      console.error('Error fetching items:', error)
      return []
    }
  },

  async getItemsNearLocation(
    coordinates: { latitude: number; longitude: number },
    radiusMiles: number = 25,
    limit: number = 50
  ): Promise<ItemWithDetails[]> {
    // Get items with location data
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        owner:profiles(*),
        category:categories(*),
        images:item_images(*),
        reviews:reviews(*)
      `)
      .eq('status', 'active')
      .not('location_latitude', 'is', null)
      .not('location_longitude', 'is', null)
      .limit(limit * 2) // Get more items to filter by distance

    if (error) {
      console.error('Error fetching items near location:', error)
      return []
    }

    // Filter by actual distance (this would be more efficient with PostGIS)
    const itemsWithDistance = (data as ItemWithDetails[])
      .map(item => {
        if (!item.location_latitude || !item.location_longitude) return null
        
        // Calculate distance using Haversine formula
        const R = 3959 // Earth's radius in miles
        const dLat = (item.location_latitude - coordinates.latitude) * Math.PI / 180
        const dLon = (item.location_longitude - coordinates.longitude) * Math.PI / 180
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(coordinates.latitude * Math.PI / 180) * 
          Math.cos(item.location_latitude * Math.PI / 180) * 
          Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c

        return { ...item, distance }
      })
      .filter((item): item is ItemWithDetails & { distance: number } => 
        item !== null && item.distance <= radiusMiles
      )
      .sort((a, b) => a.distance - b.distance)
    // Return nearest items limited to the requested count (strip distance field)
    const result = itemsWithDistance
      .slice(0, limit)
      .map(({ distance, ...rest }) => rest as ItemWithDetails)
    return result
  },

  async getItemById(id: string, userId?: string): Promise<ItemWithDetails | null> {
    const fetcher = async () => {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          owner:profiles(*),
          category:categories(*),
          images:item_images(*),
          reviews:reviews(
            *,
            reviewer:profiles(*)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as ItemWithDetails
    }

    let itemWithDetails: ItemWithDetails | null = null

    try {
      itemWithDetails = await withCache(cacheKeys.item(id), fetcher, { ttl: 10 * 60 * 1000, useMemory: true })
    } catch (error) {
      console.error('Error fetching item:', error)
      return null
    }

    // Check if item is favorited by current user
    if (userId) {
      const { data: favorite } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('item_id', id)
        .single()

      itemWithDetails.is_favorited = !!favorite
    }

    // Increment view count (guarding against undefined)
    if (itemWithDetails && typeof itemWithDetails.views_count === 'number') {
      await supabase
        .from('items')
        .update({ views_count: itemWithDetails.views_count + 1 })
        .eq('id', id)
    }

    return itemWithDetails
  },

  async createItem(item: ItemInsert): Promise<Item | null> {
    const { data, error } = await supabase
      .from('items')
      .insert(item)
      .select()
      .single()

    if (error) {
      console.error('Error creating item:', error)
      return null
    }

    return data
  },

  async getUserItems(userId: string): Promise<ItemWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          owner:profiles(*),
          category:categories(*),
          images:item_images(*),
          reviews:reviews(*)
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user items:', error)
        return []
      }

      return Array.isArray(data) ? (data as ItemWithDetails[]) : []
    } catch (e) {
      console.error('Error in getUserItems:', e)
      return []
    }
  },
}

// Booking operations
export const bookingService = {
  async getUserBookings(userId: string, type: 'renter' | 'owner' = 'renter'): Promise<BookingWithDetails[]> {
    const column = type === 'renter' ? 'renter_id' : 'owner_id'

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        item:items(
          *,
          owner:profiles(*),
          category:categories(*),
          images:item_images(*)
        ),
        renter:profiles(*),
        owner:profiles(*)
      `)
      .eq(column, userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user bookings:', error)
      return []
    }

    return Array.isArray(data) ? (data as BookingWithDetails[]) : []
  },

  async getBooking(id: string): Promise<BookingWithDetails | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        item:items(*),
        renter:profiles(*),
        owner:profiles(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching booking:', error)
      return null
    }

    return data as BookingWithDetails
  },

  async checkBookingOverlap(
    itemId: string,
    startDate: string,
    endDate: string,
    excludeBookingId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('bookings')
      .select('id')
      .eq('item_id', itemId)
      .in('status', ['confirmed', 'active'])
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error checking booking overlap:', error)
      return true
    }

    return (data || []).length > 0
  },

  async updateBooking(id: string, updates: BookingUpdate): Promise<Booking | null> {
    // If updating dates, check for overlaps
    if (updates.start_date || updates.end_date) {
      const currentBooking = await this.getBooking(id)
      if (!currentBooking) {
        console.error('Booking not found')
        return null
      }

      const startDate = updates.start_date || currentBooking.start_date
      const endDate = updates.end_date || currentBooking.end_date

      const hasOverlap = await this.checkBookingOverlap(
        currentBooking.item_id,
        startDate,
        endDate,
        id
      )

      if (hasOverlap) {
        console.error('Updated booking dates overlap with existing booking')
        return null
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating booking:', error)
      return null
    }

    return data
  },

  async cancelBooking(id: string, reason?: string): Promise<boolean> {
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error cancelling booking:', error)
      return false
    }

    return true
  },

  async getBookingConflicts(itemId: string, startDate: string, endDate: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('item_id', itemId)
      .in('status', ['confirmed', 'active'])
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)

    if (error) {
      console.error('Error fetching booking conflicts:', error)
      return []
    }

    return data || []
  }
}

// Review operations
export const reviewService = {
  async createReview(review: ReviewInsert): Promise<Review | null> {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single()

    if (error) {
      console.error('Error creating review:', error)
      return null
    }

    return data
  },

  async getItemReviews(itemId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles(*)
      `)
      .eq('item_id', itemId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching item reviews:', error)
      return []
    }

    return data || []
  },

  async getUserReviews(userId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles(*),
        item:items(*)
      `)
      .eq('reviewee_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user reviews:', error)
      return []
    }

    return data || []
  },

  async getReviewsByReviewer(reviewerId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewee:profiles(*),
        item:items(*),
        booking:bookings(*)
      `)
      .eq('reviewer_id', reviewerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reviewer reviews:', error)
      return []
    }

    return data || []
  },

  async getBookingReview(bookingId: string, reviewerId: string): Promise<Review | null> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', reviewerId)
      .single()

    if (error) {
      console.error('Error fetching booking review:', error)
      return null
    }

    return data
  },

  async canUserReview(bookingId: string, userId: string): Promise<boolean> {
    // Check if booking is completed and user hasn't already reviewed
    const { data: booking } = await supabase
      .from('bookings')
      .select('status, renter_id, owner_id')
      .eq('id', bookingId)
      .single()

    if (!booking || booking.status !== 'completed') {
      return false
    }

    // Check if user is part of the booking
    if (booking.renter_id !== userId && booking.owner_id !== userId) {
      return false
    }

    // Check if user has already reviewed
    const existingReview = await this.getBookingReview(bookingId, userId)
    return !existingReview
  },

  async updateReview(reviewId: string, updates: Partial<Review>): Promise<Review | null> {
    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', reviewId)
      .select()
      .single()

    if (error) {
      console.error('Error updating review:', error)
      return null
    }

    return data
  },

  async deleteReview(reviewId: string): Promise<boolean> {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)

    if (error) {
      console.error('Error deleting review:', error)
      return false
    }

    return true
  },

  async getReviewStats(itemId?: string, userId?: string): Promise<{
    totalReviews: number
    averageRating: number
    ratingBreakdown: { [key: number]: number }
  }> {
    let query = supabase
      .from('reviews')
      .select('rating')
      .eq('is_public', true)

    if (itemId) {
      query = query.eq('item_id', itemId)
    }

    if (userId) {
      query = query.eq('reviewee_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching review stats:', error)
      return { totalReviews: 0, averageRating: 0, ratingBreakdown: {} }
    }

    const reviews = data || []
    const totalReviews = reviews.length
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
      : 0

    const ratingBreakdown = reviews.reduce((acc, review) => {
      acc[review.rating] = (acc[review.rating] || 0) + 1
      return acc
    }, {} as { [key: number]: number })

    return {
      totalReviews,
      averageRating,
      ratingBreakdown
    }
  },

  async reportReview(reviewId: string, reporterId: string, reason: string): Promise<boolean> {
    // In a real implementation, this would create a report record
    // For now, we'll just log it
    console.log('Review reported:', { reviewId, reporterId, reason })
    
    // You could create a reports table and insert the report
    // const { error } = await supabase
    //   .from('review_reports')
    //   .insert({
    //     review_id: reviewId,
    //     reporter_id: reporterId,
    //     reason: reason
    //   })

    return true
  }
}

// Messaging operations
export const messageService = {
  async getConversations(userId: string): Promise<ConversationWithDetails[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1:profiles!conversations_participant_1_id_fkey(*),
        participant_2:profiles!conversations_participant_2_id_fkey(*),
        item:items(*),
        booking:bookings(*)
      `)
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return []
    }

    return data as ConversationWithDetails[] || []
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return data || []
  },

  async sendMessage(message: MessageInsert): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return null
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', message.conversation_id)

    return data
  },

  async createConversation(
    participant1Id: string, 
    participant2Id: string, 
    itemId?: string, 
    bookingId?: string
  ): Promise<string | null> {
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_1_id.eq.${participant1Id},participant_2_id.eq.${participant1Id}`)
      .or(`participant_1_id.eq.${participant2Id},participant_2_id.eq.${participant2Id}`)
      .eq('item_id', itemId || null)
      .single()

    if (existing) {
      return existing.id
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: participant1Id,
        participant_2_id: participant2Id,
        item_id: itemId || null,
        booking_id: bookingId || null
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return null
    }

    return data.id
  },

  async markMessagesAsRead(conversationId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking messages as read:', error)
      return false
    }

    return true
  },

  async getUnreadMessageCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }

    return count || 0
  }
}

// Favorites operations
export const favoriteService = {
  async addFavorite(userId: string, itemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, item_id: itemId })

    if (error) {
      console.error('Error adding favorite:', error)
      return false
    }

    return true
  },

  async removeFavorite(userId: string, itemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId)

    if (error) {
      console.error('Error removing favorite:', error)
      return false
    }

    return true
  },

  async getUserFavorites(userId: string): Promise<ItemWithDetails[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        item_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user favorites:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Get the full item details for each favorited item
    const itemIds = data.map(fav => fav.item_id)
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        *,
        owner:profiles(*),
        category:categories(*),
        images:item_images(*),
        reviews:reviews(*)
      `)
      .in('id', itemIds)
      .eq('status', 'active')

    if (itemsError) {
      console.error('Error fetching favorite items:', itemsError)
      return []
    }

    return items as ItemWithDetails[] || []
  }
}

// Notification operations
export const notificationService = {
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data || []
  },

  async markNotificationAsRead(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }

    return true
  },

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }

    return true
  }
}
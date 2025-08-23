// Custom React hooks for database operations
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  profileService,
  categoryService,
  itemService,
  bookingService,
  reviewService,
  messageService,
  favoriteService,
  notificationService
} from '@/lib/database'
import {
  Profile,
  Category,
  ItemWithDetails,
  BookingWithDetails,
  Review,
  Message,
  ConversationWithDetails,
  Notification
} from '@/types/database'

// Profile hooks
export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const data = await profileService.getProfile(userId)
        setProfile(data)
      } catch {
        setError('Failed to fetch profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!userId) return null

    try {
      const updated = await profileService.updateProfile(userId, updates)
      if (updated) {
        setProfile(updated)
      }
      return updated
    } catch {
      setError('Failed to update profile')
      return null
    }
  }, [userId])

  return { profile, loading, error, updateProfile }
}

// Categories hooks
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const data = await categoryService.getCategories()
        const safe = Array.isArray(data) ? data : []
        if (!Array.isArray(data)) {
          console.error('getCategories returned non-array:', data)
        }
        setCategories(safe)
      } catch {
        setError('Failed to fetch categories')
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  return { categories, loading, error }
}

// Items hooks
export function useItems(filters?: {
  category?: string
  location?: string
  minPrice?: number
  maxPrice?: number
  limit?: number
}) {
  const [items, setItems] = useState<ItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchItems = useCallback(async (offset = 0, reset = false) => {
    try {
      if (reset) setLoading(true)
      
      const data = await itemService.getItems({
        ...filters,
        offset,
        limit: filters?.limit || 10
      })
      const safe = Array.isArray(data) ? data : []
      if (!Array.isArray(data)) {
        console.error('getItems returned non-array:', data)
      }
      if (reset) {
        setItems(safe)
      } else {
        setItems(prev => [...prev, ...safe])
      }

      setHasMore(safe.length === (filters?.limit || 10))
    } catch {
      setError('Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchItems(0, true)
  }, [fetchItems])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchItems(items.length)
    }
  }, [fetchItems, items.length, loading, hasMore])

  const refresh = useCallback(() => {
    if (filters) {
      itemService.getItems(filters).then((data: unknown) => {
        const safe = Array.isArray(data) ? (data as ItemWithDetails[]) : []
        if (!Array.isArray(data)) {
          console.error('getItems (refresh) returned non-array:', data)
        }
        setItems(safe)
      })
    }
  }, [filters])

  return { items, loading, error, hasMore, loadMore, refresh }
}

export function useItem(itemId: string) {
  const [item, setItem] = useState<ItemWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!itemId) {
      setLoading(false)
      return
    }

    const fetchItem = async () => {
      try {
        setLoading(true)
        const data = await itemService.getItemById(itemId, user?.id)
        setItem(data)
      } catch {
        setError('Failed to fetch item')
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [itemId, user?.id])

  return { item, loading, error }
}

export function useUserItems(userId?: string) {
  const [items, setItems] = useState<ItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchUserItems = async () => {
      try {
        setLoading(true)
        const data = await itemService.getUserItems(userId)
        const safe = Array.isArray(data) ? data : []
        if (!Array.isArray(data)) {
          console.error('getUserItems returned non-array:', data)
        }
        setItems(safe)
      } catch {
        setError('Failed to fetch user items')
      } finally {
        setLoading(false)
      }
    }

    fetchUserItems()
  }, [userId])

  const refresh = useCallback(() => {
    if (userId) {
      itemService.getUserItems(userId).then((data: unknown) => {
        const safe = Array.isArray(data) ? (data as ItemWithDetails[]) : []
        if (!Array.isArray(data)) {
          console.error('getUserItems (refresh) returned non-array:', data)
        }
        setItems(safe)
      })
    }
  }, [userId])

  return { items, loading, error, refresh }
}

// Bookings hooks
export function useBookings(type: 'renter' | 'owner' = 'renter') {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchBookings = async () => {
      try {
        setLoading(true)
        const data = await bookingService.getUserBookings(user.id, type)
        const safe = Array.isArray(data) ? data : []
        if (!Array.isArray(data)) {
          console.error('getUserBookings returned non-array:', data)
        }
        setBookings(safe)
      } catch {
        setError('Failed to fetch bookings')
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [user, type])

  const refresh = useCallback(() => {
    if (user) {
      bookingService.getUserBookings(user.id, type).then((data: unknown) => {
        const safe = Array.isArray(data) ? (data as BookingWithDetails[]) : []
        if (!Array.isArray(data)) {
          console.error('getUserBookings (refresh) returned non-array:', data)
        }
        setBookings(safe)
      })
    }
  }, [user, type])

  return { bookings, loading, error, refresh }
}

export function useBooking(bookingId: string) {
  const [booking, setBooking] = useState<BookingWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId) {
      setLoading(false)
      return
    }

    const fetchBooking = async () => {
      try {
        setLoading(true)
        const data = await bookingService.getBooking(bookingId)
        setBooking(data)
      } catch {
        setError('Failed to fetch booking')
      } finally {
        setLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId])

  return { booking, loading, error }
}

// Reviews hooks
export function useItemReviews(itemId: string) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!itemId) {
      setLoading(false)
      return
    }

    const fetchReviews = async () => {
      try {
        setLoading(true)
        const data = await reviewService.getItemReviews(itemId)
        const safe = Array.isArray(data) ? data : []
        if (!Array.isArray(data)) {
          console.error('getItemReviews returned non-array:', data)
        }
        setReviews(safe)
      } catch {
        setError('Failed to fetch reviews')
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [itemId])

  return { reviews, loading, error }
}

export function useUserReviews(userId: string) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchReviews = async () => {
      try {
        setLoading(true)
        const data = await reviewService.getUserReviews(userId)
        const safe = Array.isArray(data) ? data : []
        if (!Array.isArray(data)) {
          console.error('getUserReviews returned non-array:', data)
        }
        setReviews(safe)
      } catch {
        setError('Failed to fetch user reviews')
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [userId])

  return { reviews, loading, error }
}

// Messaging hooks
export function useConversations() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchConversations = async () => {
      try {
        setLoading(true)
        const data = await messageService.getConversations(user.id)
        const safe = Array.isArray(data) ? data : []
        if (!Array.isArray(data)) {
          console.error('getConversations returned non-array:', data)
        }
        setConversations(safe)
      } catch {
        setError('Failed to fetch conversations')
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [user])

  return { conversations, loading, error }
}

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!conversationId) {
      setLoading(false)
      return
    }

    const fetchMessages = async () => {
      try {
        setLoading(true)
        const data = await messageService.getMessages(conversationId)
        const safe = Array.isArray(data) ? data : []
        if (!Array.isArray(data)) {
          console.error('getMessages returned non-array:', data)
        }
        setMessages(safe)
      } catch {
        setError('Failed to fetch messages')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversationId])

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return null

    try {
      const message = await messageService.sendMessage({
        conversation_id: conversationId,
        sender_id: '', // Will be set by RLS
        recipient_id: '', // Will be determined from conversation
        content
      })

      if (message) {
        setMessages(prev => [...prev, message])
      }

      return message
    } catch {
      setError('Failed to send message')
      return null
    }
  }, [conversationId])

  return { messages, loading, error, sendMessage }
}

// Favorites hooks
export function useFavorites() {
  const [favorites, setFavorites] = useState<ItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchFavorites = async () => {
      try {
        setLoading(true)
        const data = await favoriteService.getUserFavorites(user.id)
        const safe = Array.isArray(data) ? data : []
        if (!Array.isArray(data)) {
          console.error('getUserFavorites returned non-array:', data)
        }
        setFavorites(safe)
      } catch {
        setError('Failed to fetch favorites')
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [user])

  const addFavorite = useCallback(async (itemId: string) => {
    if (!user) return false

    try {
      const success = await favoriteService.addFavorite(user.id, itemId)
      if (success) {
        // Refresh favorites list
        const data = await favoriteService.getUserFavorites(user.id)
        const safe = Array.isArray(data) ? data : []
        if (!Array.isArray(data)) {
          console.error('getUserFavorites (addFavorite) returned non-array:', data)
        }
        setFavorites(safe)
      }
      return success
    } catch {
      setError('Failed to add favorite')
      return false
    }
  }, [user])

  const removeFavorite = useCallback(async (itemId: string) => {
    if (!user) return false

    try {
      const success = await favoriteService.removeFavorite(user.id, itemId)
      if (success) {
        setFavorites(prev => prev.filter(item => item.id !== itemId))
      }
      return success
    } catch {
      setError('Failed to remove favorite')
      return false
    }
  }, [user])

  return { favorites, loading, error, addFavorite, removeFavorite }
}

// Notifications hooks
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchNotifications = async () => {
      try {
        setLoading(true)
        const data = await notificationService.getUserNotifications(user.id)
        const safe = Array.isArray(data) ? data : []
        if (!Array.isArray(data)) {
          console.error('getUserNotifications returned non-array:', data)
        }
        setNotifications(safe)
        setUnreadCount(safe.filter(n => !n.is_read).length)
      } catch {
        setError('Failed to fetch notifications')
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [user])

  const markAsRead = useCallback(async (id: string) => {
    try {
      const success = await notificationService.markNotificationAsRead(id)
      if (success) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      return success
    } catch {
      setError('Failed to mark notification as read')
      return false
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user) return false

    try {
      const success = await notificationService.markAllNotificationsAsRead(user.id)
      if (success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        )
        setUnreadCount(0)
      }
      return success
    } catch {
      setError('Failed to mark all notifications as read')
      return false
    }
  }, [user])

  return { notifications, loading, error, unreadCount, markAsRead, markAllAsRead }
}
/**
 * Caching utilities for improved performance
 */

// In-memory cache for client-side data
class MemoryCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()
  private maxSize: number

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  set(key: string, data: unknown, ttlMs = 5 * 60 * 1000) { // Default 5 minutes
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    })
  }

  get(key: string) {
    const entry = this.cache.get(key)
    
    if (!entry) return null

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  size(): number {
    return this.cache.size
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now()
    const keysToDelete: string[] = []
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

// Global cache instances
export const memoryCache = new MemoryCache(200)
export const userCache = new MemoryCache(50)
export const itemCache = new MemoryCache(500)

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    memoryCache.cleanup()
    userCache.cleanup()
    itemCache.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * Browser storage cache utilities
 */
export const storageCache = {
  set: (key: string, data: unknown, ttlMs = 24 * 60 * 60 * 1000) => { // Default 24 hours
    if (typeof window === 'undefined') return

    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      }
      localStorage.setItem(`cache_${key}`, JSON.stringify(item))
    } catch (error) {
      console.warn('Failed to set localStorage cache:', error)
    }
  },

  get: (key: string) => {
    if (typeof window === 'undefined') return null

    try {
      const item = localStorage.getItem(`cache_${key}`)
      if (!item) return null

      const parsed = JSON.parse(item)
      
      // Check if expired
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(`cache_${key}`)
        return null
      }

      return parsed.data
    } catch (error) {
      console.warn('Failed to get localStorage cache:', error)
      return null
    }
  },

  delete: (key: string) => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`cache_${key}`)
  },

  clear: () => {
    if (typeof window === 'undefined') return
    
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key)
      }
    })
  },

  cleanup: () => {
    if (typeof window === 'undefined') return

    const keys = Object.keys(localStorage)
    const now = Date.now()

    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const item = localStorage.getItem(key)
          if (item) {
            const parsed = JSON.parse(item)
            if (now - parsed.timestamp > parsed.ttl) {
              localStorage.removeItem(key)
            }
          }
        } catch {
          // Remove corrupted entries
          localStorage.removeItem(key)
        }
      }
    })
  }
}

/**
 * Cache key generators
 */
export const cacheKeys = {
  user: (userId: string) => `user_${userId}`,
  userProfile: (userId: string) => `user_profile_${userId}`,
  item: (itemId: string) => `item_${itemId}`,
  itemsByOwner: (ownerId: string) => `items_owner_${ownerId}`,
  searchResults: (query: string, filters: Record<string, string | number | boolean | null | undefined>) => {
    const filterStr = JSON.stringify(filters)
    return `search_${query}_${btoa(filterStr)}`
  },
  categories: () => 'categories',
  bookings: (userId: string) => `bookings_${userId}`,
  reviews: (itemId: string) => `reviews_${itemId}`,
  conversations: (userId: string) => `conversations_${userId}`,
}

/**
 * Cached API wrapper
 */
export const withCache = <T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    useMemory?: boolean
    useStorage?: boolean
    forceRefresh?: boolean
  } = {}
): Promise<T> => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    useMemory = true,
    useStorage = false,
    forceRefresh = false,
  } = options

  return new Promise(async (resolve, reject) => {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        // Try memory cache first
        if (useMemory) {
          const cached = memoryCache.get(cacheKey)
          if (cached) {
            resolve(cached as T)
            return
          }
        }

        // Try storage cache
        if (useStorage) {
          const cached = storageCache.get(cacheKey)
          if (cached) {
            // Also store in memory for faster access
            if (useMemory) {
              memoryCache.set(cacheKey, cached, ttl)
            }
            resolve(cached)
            return
          }
        }
      }

      // Fetch fresh data
      const data = await fetcher()

      // Store in caches
      if (useMemory) {
        memoryCache.set(cacheKey, data, ttl)
      }
      if (useStorage) {
        storageCache.set(cacheKey, data, ttl)
      }

      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Cache invalidation utilities
 */
export const invalidateCache = {
  user: (userId: string) => {
    memoryCache.delete(cacheKeys.user(userId))
    memoryCache.delete(cacheKeys.userProfile(userId))
    storageCache.delete(cacheKeys.user(userId))
    storageCache.delete(cacheKeys.userProfile(userId))
  },

  item: (itemId: string, ownerId?: string) => {
    memoryCache.delete(cacheKeys.item(itemId))
    storageCache.delete(cacheKeys.item(itemId))
    
    if (ownerId) {
      memoryCache.delete(cacheKeys.itemsByOwner(ownerId))
      storageCache.delete(cacheKeys.itemsByOwner(ownerId))
    }

    // Invalidate search results (broad invalidation)
    // In a real app, you might want more targeted invalidation
    const keys = Array.from(memoryCache['cache'].keys())
    keys.forEach(key => {
      if (key.startsWith('search_')) {
        memoryCache.delete(key)
      }
    })
  },

  search: () => {
    // Invalidate all search results
    const keys = Array.from(memoryCache['cache'].keys())
    keys.forEach(key => {
      if (key.startsWith('search_')) {
        memoryCache.delete(key)
      }
    })
  },

  searchResults: () => {
    // Alias for search() to match usage in database.ts
    invalidateCache.search()
  },

  bookings: (userId: string) => {
    memoryCache.delete(cacheKeys.bookings(userId))
    storageCache.delete(cacheKeys.bookings(userId))
  },

  all: () => {
    memoryCache.clear()
    storageCache.clear()
  }
}

// React hook moved to client-only module: see `src/lib/client-cache.ts`

/**
 * Preload data into cache
 */
export const preloadData = async <T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    useMemory?: boolean
    useStorage?: boolean
  } = {}
) => {
  try {
    await withCache(cacheKey, fetcher, options)
  } catch (error) {
    console.warn('Failed to preload data:', error)
  }
}

/**
 * Cache warming utilities
 */
export const warmCache = {
  // Warm up common data on app start
  essential: async () => {
    // Categories are frequently accessed
    preloadData(cacheKeys.categories(), async () => {
      // This would be your actual API call
      const response = await fetch('/api/categories')
      return response.json()
    }, { ttl: 60 * 60 * 1000, useMemory: true, useStorage: true }) // 1 hour

    // Popular items
    preloadData('popular_items', async () => {
      const response = await fetch('/api/items/popular')
      return response.json()
    }, { ttl: 30 * 60 * 1000, useMemory: true }) // 30 minutes
  },

  // Warm up user-specific data after login
  user: async (userId: string) => {
    preloadData(cacheKeys.userProfile(userId), async () => {
      const response = await fetch(`/api/users/${userId}`)
      return response.json()
    })

    preloadData(cacheKeys.bookings(userId), async () => {
      const response = await fetch(`/api/bookings?userId=${userId}`)
      return response.json()
    })
  }
}

// Initialize cache cleanup on app start
if (typeof window !== 'undefined') {
  // Clean up storage cache on app start
  storageCache.cleanup()
  
  // Warm essential cache
  warmCache.essential()
}
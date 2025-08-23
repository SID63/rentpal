// Database utility functions for RentPal
import { supabase, isSupabaseConfigured } from './supabase'
import { 
  Profile, 
  ProfileInsert, 
  ProfileUpdate,
  Item,
  ItemInsert,
  ItemUpdate,
  ItemWithDetails,
  ItemImage,
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

// Enhanced ItemService interfaces
export interface CreateItemParams {
  itemData: ItemInsert
  images?: File[] | string[]
}

export interface CreateItemResult {
  success: boolean
  data?: Item
  error?: string
}

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
    // First try to update existing profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updates as any)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      // If profile doesn't exist (PGRST116), create it with upsert
      if (error.code === 'PGRST116') {
        console.log('Profile not found, creating new profile for user:', userId)
        const profileData = {
          id: userId,
          ...updates,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const { data: newData, error: upsertError } = await supabase
          .from('profiles')
          .upsert(profileData as any)
          .select()
          .single()

        if (upsertError) {
          console.error('Error creating profile:', upsertError)
          return null
        }

        // Invalidate caches
        invalidateCache.user(userId)
        return newData
      }
      
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
      const result = await withCache(
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
      ) as unknown

      // Coerce to array if cached shape is { categories: [...] }
      const resultObj = result as Record<string, unknown>
      const arr = Array.isArray(result)
        ? result
        : Array.isArray(resultObj?.categories)
          ? resultObj.categories
          : []
      return arr as Category[]
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
    // Guard against missing configuration (prevents noisy runtime errors in dev)
    const configured = isSupabaseConfigured()
    if (!configured) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[itemService] getItems skipped: Supabase not configured', {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          filters,
        })
      }
      return []
    }
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
      // Build a safe OR clause by splitting on commas and avoiding raw commas inside values
      const tokens = String(filters.location)
        .split(/[,+]/)
        .map((s) => s.trim())
        .filter(Boolean)

      if (tokens.length > 0) {
        const clauses = tokens.flatMap((t) => {
          // Escape Postgres wildcard characters to avoid unintended matches
          const escaped = t.replace(/%/g, '\\%').replace(/_/g, '\\_')
          return [
            `location_city.ilike.%${escaped}%`,
            `location_state.ilike.%${escaped}%`,
          ]
        })
        query = query.or(clauses.join(','))
      }
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
    } catch (error: any) {
      console.error('Error fetching items:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })
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
      .map(({ ...rest }) => rest as ItemWithDetails)
    return result
  },

  async getItemById(id: string, userId?: string): Promise<ItemWithDetails | null> {
    // Guard against missing configuration
    const configured = isSupabaseConfigured()
    if (!configured) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[itemService] getItemById skipped: Supabase not configured', {
          id,
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        })
      }
      return null
    }
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
            reviewer:profiles!reviews_reviewer_id_fkey(*)
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
      try {
        const { data: favorite } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('item_id', id)
          .single()
        itemWithDetails.is_favorited = !!favorite
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[itemService] favorite check failed', e)
        }
      }
    }

    // Increment view count (guarding against undefined)
    if (itemWithDetails && typeof itemWithDetails.views_count === 'number') {
      try {
        await supabase
          .from('items')
          .update({ views_count: itemWithDetails.views_count + 1 })
          .eq('id', id)
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[itemService] increment views failed', e)
        }
      }
    }

    return itemWithDetails
  },

  async createItem(params: CreateItemParams): Promise<CreateItemResult> {
    try {
      // Validate user profile before creating item
      if (params.itemData.owner_id) {
        const profileValidation = await this.validateUserProfile(params.itemData.owner_id)
        if (!profileValidation.valid) {
          return {
            success: false,
            error: profileValidation.error
          }
        }
      }

      // Start a transaction-like approach by creating the item first
      const { data: item, error: itemError } = await supabase
        .from('items')
        .insert(params.itemData)
        .select()
        .single()

      if (itemError) {
        console.error('Error creating item:', itemError)
        return {
          success: false,
          error: `Failed to create item: ${itemError.message}`
        }
      }

      // If images are provided, upload and associate them
      if (params.images && params.images.length > 0) {
        try {
          const imageUrls = await this.uploadItemImages(item.id, params.images)
          await this.associateImages(item.id, imageUrls)
        } catch (imageError) {
          // If image upload fails, we have a few options:
          // 1. Delete the item and return error (strict transaction)
          // 2. Keep the item but return partial success (current approach)
          // 3. Retry image upload
          
          console.error('Error uploading images for item:', imageError)
          
          // For better UX, we'll keep the item but inform about image failure
          // This allows users to add images later through the edit functionality
          return {
            success: true,
            data: item,
            error: `Item created successfully, but image upload failed: ${String(imageError)}. You can add images later by editing the item.`
          }
        }
      }

      // Invalidate relevant caches
      invalidateCache.searchResults()

      return {
        success: true,
        data: item
      }
    } catch (error) {
      console.error('Error in createItem:', error)
      return {
        success: false,
        error: `Failed to create item: ${String(error)}`
      }
    }
  },

  async uploadItemImages(itemId: string, images: File[] | string[]): Promise<string[]> {
    const { uploadFiles } = await import('./storage')
    
    // If images are already URLs (strings), return them as-is
    if (images.length > 0 && typeof images[0] === 'string') {
      return images as string[]
    }

    // Get current user for upload path
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User must be authenticated to upload images')
    }

    // Upload files to storage
    const uploadResult = await uploadFiles(
      images as File[],
      'item-images',
      user.id,
      {
        maxConcurrent: 3,
        stopOnError: false
      }
    )

    if (!uploadResult.success || uploadResult.successCount === 0) {
      throw new Error(`Image upload failed: ${uploadResult.errors.join(', ')}`)
    }

    // Extract URLs from successful uploads
    const imageUrls = uploadResult.results
      .filter(result => result.success && result.url)
      .map(result => result.url!)

    if (imageUrls.length === 0) {
      throw new Error('No images were successfully uploaded')
    }

    return imageUrls
  },

  async associateImages(itemId: string, imageUrls: string[]): Promise<void> {
    if (!imageUrls || imageUrls.length === 0) {
      return
    }

    try {
      const { imageService } = await import('./services/imageService')
      const result = await imageService.associateImagesWithItem(itemId, imageUrls, {
        makePrimary: true // First image becomes primary
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to associate images')
      }
    } catch (error) {
      console.error('Error associating images with item:', error)
      throw new Error(`Failed to associate images: ${String(error)}`)
    }
  },

  async deleteItemImages(itemId: string): Promise<void> {
    try {
      const { imageService } = await import('./services/imageService')
      const result = await imageService.deleteAllItemImages(itemId)
      
      if (!result.success && result.errors.length > 0) {
        console.error('Error deleting item images:', result.errors.join(', '))
      }
    } catch (error) {
      console.error('Error in deleteItemImages:', error)
    }
  },

  async validateUserProfile(userId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const profile = await profileService.getProfile(userId)
      
      if (!profile) {
        return {
          valid: false,
          error: 'Profile not found. Please complete your profile setup before creating items.'
        }
      }

      // Check required fields for item creation
      const requiredFields = ['full_name', 'address', 'city', 'state', 'zip_code']
      const missingFields = requiredFields.filter(field => !profile[field as keyof Profile])

      if (missingFields.length > 0) {
        return {
          valid: false,
          error: `Please complete your profile. Missing: ${missingFields.join(', ')}`
        }
      }

      return { valid: true }
    } catch (error) {
      console.error('Error validating user profile:', error)
      return {
        valid: false,
        error: 'Unable to validate profile. Please try again.'
      }
    }
  },

  async updateItem(itemId: string, updates: ItemUpdate): Promise<Item | null> {
    try {
      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single()

      if (error) {
        console.error('Error updating item:', error)
        return null
      }

      // Invalidate relevant caches
      invalidateCache.item(itemId)
      invalidateCache.searchResults()

      return data
    } catch (error) {
      console.error('Error in updateItem:', error)
      return null
    }
  },

  async updateItemWithImages(
    itemId: string, 
    updates: ItemUpdate, 
    newImages?: File[]
  ): Promise<CreateItemResult> {
    try {
      // Update the item data
      const updatedItem = await this.updateItem(itemId, updates)
      
      if (!updatedItem) {
        return {
          success: false,
          error: 'Failed to update item'
        }
      }

      // If new images are provided, upload and associate them
      if (newImages && newImages.length > 0) {
        try {
          const imageUrls = await this.uploadItemImages(itemId, newImages)
          await this.associateImages(itemId, imageUrls)
        } catch (imageError) {
          console.error('Error uploading new images:', imageError)
          return {
            success: true,
            data: updatedItem,
            error: `Item updated successfully, but image upload failed: ${String(imageError)}`
          }
        }
      }

      return {
        success: true,
        data: updatedItem
      }
    } catch (error) {
      console.error('Error in updateItemWithImages:', error)
      return {
        success: false,
        error: `Failed to update item: ${String(error)}`
      }
    }
  },

  async getUserItems(userId: string): Promise<ItemWithDetails[]> {
    try {
      // Guard against missing configuration
      const configured = isSupabaseConfigured()
      if (!configured) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[itemService] getUserItems skipped: Supabase not configured', {
            userId,
            hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          })
        }
        return []
      }
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
    } catch (e: any) {
      console.error('Error in getUserItems:', {
        message: e?.message,
        status: e?.status,
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
      })
      return []
    }
  },

  async deleteItem(itemId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify the item belongs to the user
      const { data: item, error: fetchError } = await supabase
        .from('items')
        .select('id, owner_id')
        .eq('id', itemId)
        .eq('owner_id', userId)
        .single()

      if (fetchError || !item) {
        return {
          success: false,
          error: 'Item not found or you do not have permission to delete it'
        }
      }

      // Delete associated images first
      await this.deleteItemImages(itemId)

      // Delete the item (this will cascade delete related records due to foreign key constraints)
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)
        .eq('owner_id', userId)

      if (deleteError) {
        console.error('Error deleting item:', deleteError)
        return {
          success: false,
          error: `Failed to delete item: ${deleteError.message}`
        }
      }

      // Invalidate relevant caches
      invalidateCache.item(itemId)
      invalidateCache.searchResults()

      return { success: true }
    } catch (error) {
      console.error('Error in deleteItem:', error)
      return {
        success: false,
        error: `Failed to delete item: ${String(error)}`
      }
    }
  },

  async reorderItemImages(itemId: string, imageIds: string[], userId: string): Promise<{ success: boolean; images?: ItemImage[]; error?: string }> {
    try {
      // Verify the item belongs to the user
      const { data: item, error: fetchError } = await supabase
        .from('items')
        .select('id')
        .eq('id', itemId)
        .eq('owner_id', userId)
        .single()

      if (fetchError || !item) {
        return {
          success: false,
          error: 'Item not found or you do not have permission to modify it'
        }
      }

      const { imageService } = await import('./services/imageService')
      const result = await imageService.reorderItemImages(itemId, imageIds)

      return result
    } catch (error) {
      console.error('Error in reorderItemImages:', error)
      return {
        success: false,
        error: `Failed to reorder images: ${String(error)}`
      }
    }
  },

  async setPrimaryItemImage(itemId: string, imageId: string, userId: string): Promise<{ success: boolean; images?: ItemImage[]; error?: string }> {
    try {
      // Verify the item belongs to the user
      const { data: item, error: fetchError } = await supabase
        .from('items')
        .select('id')
        .eq('id', itemId)
        .eq('owner_id', userId)
        .single()

      if (fetchError || !item) {
        return {
          success: false,
          error: 'Item not found or you do not have permission to modify it'
        }
      }

      const { imageService } = await import('./services/imageService')
      const result = await imageService.setPrimaryImage(itemId, imageId)

      return result
    } catch (error) {
      console.error('Error in setPrimaryItemImage:', error)
      return {
        success: false,
        error: `Failed to set primary image: ${String(error)}`
      }
    }
  },

  async deleteItemImages(itemId: string, imageIds: string[], userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify the item belongs to the user
      const { data: item, error: fetchError } = await supabase
        .from('items')
        .select('id')
        .eq('id', itemId)
        .eq('owner_id', userId)
        .single()

      if (fetchError || !item) {
        return {
          success: false,
          error: 'Item not found or you do not have permission to modify it'
        }
      }

      const { imageService } = await import('./services/imageService')
      const result = await imageService.deleteImagesByIds(imageIds)

      return {
        success: result.success,
        error: result.errors.length > 0 ? result.errors.join(', ') : undefined
      }
    } catch (error) {
      console.error('Error in deleteItemImages:', error)
      return {
        success: false,
        error: `Failed to delete images: ${String(error)}`
      }
    }
  },
}

// Booking operations
export const bookingService = {
  async getUserBookings(userId: string, type: 'renter' | 'owner' = 'renter'): Promise<BookingWithDetails[]> {
    try {
      // Guard against missing configuration
      const configured = isSupabaseConfigured()
      if (!configured) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[bookingService] getUserBookings skipped: Supabase not configured', {
            userId,
            type,
            hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          })
        }
        return []
      }

      const column = type === 'renter' ? 'renter_id' : 'owner_id'

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[bookingService] Fetching user bookings...', {
          userId,
          column,
          type
        })
      }

      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          item:items(
            *,
            owner:profiles(*),
            category:categories(*),
            images:item_images(*)
          ),
          renter:profiles!bookings_renter_id_fkey(*),
          owner:profiles!bookings_owner_id_fkey(*)
        `)
        .eq(column, userId)
        .order('created_at', { ascending: false })
        .throwOnError()

      const result = Array.isArray(data) ? (data as BookingWithDetails[]) : []

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[bookingService] Bookings fetched', { count: result.length })
      }

      return result
    } catch (err: any) {
      // Network errors or thrown PostgREST errors will be caught here
      const errorInfo = {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        status: err?.status,
        code: err?.code,
        details: err?.details,
        hint: err?.hint
      }
      console.error('[bookingService] getUserBookings exception', errorInfo)
      return []
    }
  },

  async getBooking(id: string): Promise<BookingWithDetails | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        item:items(*),
        renter:profiles!bookings_renter_id_fkey(*),
        owner:profiles!bookings_owner_id_fkey(*)
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

  async cancelBooking(id: string): Promise<boolean> {
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
        reviewer:profiles!reviews_reviewer_id_fkey(*)
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
        reviewer:profiles!reviews_reviewer_id_fkey(*),
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
        reviewee:profiles!reviews_reviewee_id_fkey(*),
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
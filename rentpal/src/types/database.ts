// Database types for RentPal application
// Generated from Supabase schema

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
export type VerificationStatus = 'pending' | 'verified' | 'rejected'
export type ItemStatus = 'active' | 'inactive' | 'suspended'
export type MessageType = 'text' | 'system' | 'booking_request' | 'booking_update'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          phone: string | null
          address: string
          city: string
          state: string
          zip_code: string
          latitude: number | null
          longitude: number | null
          bio: string | null
          verification_status: VerificationStatus
          rating: number
          total_reviews: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          phone?: string | null
          address: string
          city: string
          state: string
          zip_code: string
          latitude?: number | null
          longitude?: number | null
          bio?: string | null
          verification_status?: VerificationStatus
          rating?: number
          total_reviews?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          phone?: string | null
          address?: string
          city?: string
          state?: string
          zip_code?: string
          latitude?: number | null
          longitude?: number | null
          bio?: string | null
          verification_status?: VerificationStatus
          rating?: number
          total_reviews?: number
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          parent_id: string | null
          icon_url: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          parent_id?: string | null
          icon_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          parent_id?: string | null
          icon_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      items: {
        Row: {
          id: string
          owner_id: string
          category_id: string
          title: string
          description: string
          daily_rate: number
          hourly_rate: number | null
          security_deposit: number
          min_rental_duration: number
          max_rental_duration: number | null
          location_address: string
          location_city: string
          location_state: string
          location_zip: string
          location_latitude: number | null
          location_longitude: number | null
          pickup_instructions: string | null
          delivery_available: boolean
          delivery_fee: number
          delivery_radius: number
          status: ItemStatus
          views_count: number
          favorites_count: number
          rating: number
          total_reviews: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          category_id: string
          title: string
          description: string
          daily_rate: number
          hourly_rate?: number | null
          security_deposit?: number
          min_rental_duration?: number
          max_rental_duration?: number | null
          location_address: string
          location_city: string
          location_state: string
          location_zip: string
          location_latitude?: number | null
          location_longitude?: number | null
          pickup_instructions?: string | null
          delivery_available?: boolean
          delivery_fee?: number
          delivery_radius?: number
          status?: ItemStatus
          views_count?: number
          favorites_count?: number
          rating?: number
          total_reviews?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          category_id?: string
          title?: string
          description?: string
          daily_rate?: number
          hourly_rate?: number | null
          security_deposit?: number
          min_rental_duration?: number
          max_rental_duration?: number | null
          location_address?: string
          location_city?: string
          location_state?: string
          location_zip?: string
          location_latitude?: number | null
          location_longitude?: number | null
          pickup_instructions?: string | null
          delivery_available?: boolean
          delivery_fee?: number
          delivery_radius?: number
          status?: ItemStatus
          views_count?: number
          favorites_count?: number
          rating?: number
          total_reviews?: number
          created_at?: string
          updated_at?: string
        }
      }
      item_images: {
        Row: {
          id: string
          item_id: string
          image_url: string
          alt_text: string | null
          sort_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          image_url: string
          alt_text?: string | null
          sort_order?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          image_url?: string
          alt_text?: string | null
          sort_order?: number
          is_primary?: boolean
          created_at?: string
        }
      }
      item_availability: {
        Row: {
          id: string
          item_id: string
          date: string
          is_available: boolean
          blocked_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          date: string
          is_available?: boolean
          blocked_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          date?: string
          is_available?: boolean
          blocked_reason?: string | null
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          item_id: string
          renter_id: string
          owner_id: string
          start_date: string
          end_date: string
          total_hours: number
          daily_rate: number
          hourly_rate: number | null
          subtotal: number
          service_fee: number
          security_deposit: number
          total_amount: number
          status: BookingStatus
          pickup_location: string | null
          return_location: string | null
          special_instructions: string | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          renter_id: string
          owner_id: string
          start_date: string
          end_date: string
          total_hours: number
          daily_rate: number
          hourly_rate?: number | null
          subtotal: number
          service_fee: number
          security_deposit: number
          total_amount: number
          status?: BookingStatus
          pickup_location?: string | null
          return_location?: string | null
          special_instructions?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          renter_id?: string
          owner_id?: string
          start_date?: string
          end_date?: string
          total_hours?: number
          daily_rate?: number
          hourly_rate?: number | null
          subtotal?: number
          service_fee?: number
          security_deposit?: number
          total_amount?: number
          status?: BookingStatus
          pickup_location?: string | null
          return_location?: string | null
          special_instructions?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          reviewer_id: string
          reviewee_id: string
          item_id: string
          rating: number
          title: string | null
          comment: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          reviewer_id: string
          reviewee_id: string
          item_id: string
          rating: number
          title?: string | null
          comment?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          reviewer_id?: string
          reviewee_id?: string
          item_id?: string
          rating?: number
          title?: string | null
          comment?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          recipient_id: string
          booking_id: string | null
          message_type: MessageType
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          recipient_id: string
          booking_id?: string | null
          message_type?: MessageType
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          recipient_id?: string
          booking_id?: string | null
          message_type?: MessageType
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          participant_1_id: string
          participant_2_id: string
          item_id: string | null
          booking_id: string | null
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          participant_1_id: string
          participant_2_id: string
          item_id?: string | null
          booking_id?: string | null
          last_message_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          participant_1_id?: string
          participant_2_id?: string
          item_id?: string | null
          booking_id?: string | null
          last_message_at?: string
          created_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          item_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          related_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          related_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          related_id?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_status: BookingStatus
      verification_status: VerificationStatus
      item_status: ItemStatus
      message_type: MessageType
    }
  }
}

// Convenience types for common operations
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type Item = Database['public']['Tables']['items']['Row']
export type ItemInsert = Database['public']['Tables']['items']['Insert']
export type ItemUpdate = Database['public']['Tables']['items']['Update']

export type ItemImage = Database['public']['Tables']['item_images']['Row']
export type ItemImageInsert = Database['public']['Tables']['item_images']['Insert']
export type ItemImageUpdate = Database['public']['Tables']['item_images']['Update']

export type ItemAvailability = Database['public']['Tables']['item_availability']['Row']
export type ItemAvailabilityInsert = Database['public']['Tables']['item_availability']['Insert']
export type ItemAvailabilityUpdate = Database['public']['Tables']['item_availability']['Update']

export type Booking = Database['public']['Tables']['bookings']['Row']
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']
export type BookingUpdate = Database['public']['Tables']['bookings']['Update']

export type Review = Database['public']['Tables']['reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export type Favorite = Database['public']['Tables']['favorites']['Row']
export type FavoriteInsert = Database['public']['Tables']['favorites']['Insert']
export type FavoriteUpdate = Database['public']['Tables']['favorites']['Update']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

// Extended types with relations
export interface ItemWithDetails extends Item {
  owner: Profile
  category: Category
  images: ItemImage[]
  reviews: Review[]
  is_favorited?: boolean
}

export interface BookingWithDetails extends Booking {
  item: ItemWithDetails
  renter: Profile
  owner: Profile
}

export interface ReviewWithDetails extends Review {
  reviewer: Profile
  reviewee: Profile
  item: Item
  booking: Booking
}

export interface ConversationWithDetails extends Conversation {
  participant_1: Profile
  participant_2: Profile
  item?: Item
  booking?: Booking
  last_message?: Message
  unread_count?: number
}

export interface MessageWithDetails extends Message {
  sender: Profile
  recipient: Profile
  booking?: Booking
}
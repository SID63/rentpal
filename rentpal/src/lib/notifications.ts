// Notification service for RentPal
import { supabase } from './supabase'
import { NotificationInsert } from '@/types/database'

export type NotificationType = 
  | 'booking_request' 
  | 'booking_update' 
  | 'booking_confirmed' 
  | 'booking_cancelled'
  | 'message'
  | 'review'
  | 'payment'
  | 'system'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedId?: string
  actionUrl?: string
}

export const notificationService = {
  async createNotification(params: CreateNotificationParams): Promise<boolean> {
    try {
      const notification: NotificationInsert = {
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        related_id: params.relatedId || null
      }

      const { error } = await supabase
        .from('notifications')
        .insert(notification)

      if (error) {
        console.error('Error creating notification:', error)
        return false
      }

      // TODO: Send push notification or email if user preferences allow
      // await this.sendPushNotification(params)
      // await this.sendEmailNotification(params)

      return true
    } catch (error) {
      console.error('Error in createNotification:', error)
      return false
    }
  },

  async createBookingNotification(
    userId: string,
    bookingId: string,
    type: 'request' | 'confirmed' | 'cancelled' | 'completed',
    itemTitle: string,
    renterName?: string
  ): Promise<boolean> {
    const notifications = {
      request: {
        title: 'New Booking Request',
        message: `${renterName} wants to rent "${itemTitle}". Review the request to approve or decline.`,
        type: 'booking_request' as NotificationType
      },
      confirmed: {
        title: 'Booking Confirmed',
        message: `Your booking for "${itemTitle}" has been confirmed. Check your booking details for next steps.`,
        type: 'booking_confirmed' as NotificationType
      },
      cancelled: {
        title: 'Booking Cancelled',
        message: `The booking for "${itemTitle}" has been cancelled.`,
        type: 'booking_cancelled' as NotificationType
      },
      completed: {
        title: 'Booking Completed',
        message: `Your rental of "${itemTitle}" is complete. Please leave a review for your experience.`,
        type: 'booking_update' as NotificationType
      }
    }

    const notification = notifications[type]
    
    return this.createNotification({
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedId: bookingId
    })
  },

  async createMessageNotification(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    conversationId: string
  ): Promise<boolean> {
    return this.createNotification({
      userId: recipientId,
      type: 'message',
      title: `New message from ${senderName}`,
      message: messagePreview.length > 100 
        ? `${messagePreview.substring(0, 100)}...` 
        : messagePreview,
      relatedId: conversationId
    })
  },

  async createReviewNotification(
    userId: string,
    reviewerName: string,
    itemTitle: string,
    rating: number,
    reviewId: string
  ): Promise<boolean> {
    return this.createNotification({
      userId,
      type: 'review',
      title: 'New Review Received',
      message: `${reviewerName} left a ${rating}-star review for "${itemTitle}".`,
      relatedId: reviewId
    })
  },

  async createSystemNotification(
    userId: string,
    title: string,
    message: string
  ): Promise<boolean> {
    return this.createNotification({
      userId,
      type: 'system',
      title,
      message
    })
  },

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error)
      return false
    }
  },

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
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
    } catch (error) {
      console.error('Error in markAllNotificationsAsRead:', error)
      return false
    }
  },

  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('Error deleting notification:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteNotification:', error)
      return false
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('Error getting unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error in getUnreadCount:', error)
      return 0
    }
  },

  // TODO: Implement push notifications
  async sendPushNotification(params: CreateNotificationParams): Promise<boolean> {
    // Implementation would depend on push notification service (e.g., Firebase, OneSignal)
    console.log('Push notification would be sent:', params)
    return true
  },

  // TODO: Implement email notifications
  async sendEmailNotification(params: CreateNotificationParams): Promise<boolean> {
    // Implementation would depend on email service (e.g., SendGrid, Resend)
    console.log('Email notification would be sent:', params)
    return true
  }
}

// Database triggers and functions for automatic notifications
export const setupNotificationTriggers = async () => {
  // These would be SQL functions/triggers in Supabase
  // For now, we'll handle notifications in the application layer
  
  console.log('Notification triggers would be set up in production')
}
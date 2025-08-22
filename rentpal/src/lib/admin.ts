// Admin and moderation service functions
import { supabase } from './supabase'

// Types for admin functionality
export interface AdminUser {
  id: string
  role: 'super_admin' | 'admin' | 'moderator'
  permissions: Record<string, boolean>
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  profile?: {
    full_name: string
    email: string
    avatar_url?: string
  }
}

export interface Report {
  id: string
  reporter_id: string
  reported_user_id?: string
  reported_item_id?: string
  reported_review_id?: string
  reported_message_id?: string
  type: 'inappropriate_content' | 'spam' | 'fraud' | 'harassment' | 'other'
  reason: string
  description?: string
  evidence_urls?: string[]
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed'
  assigned_to?: string
  resolution_notes?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  reporter?: {
    full_name: string
    email: string
  }
  reported_user?: {
    full_name: string
    email: string
  }
  reported_item?: {
    title: string
    owner_id: string
  }
}

export interface ModerationAction {
  id: string
  admin_id: string
  target_user_id?: string
  target_item_id?: string
  target_review_id?: string
  target_message_id?: string
  report_id?: string
  action: 'approved' | 'rejected' | 'suspended' | 'banned' | 'warning'
  reason: string
  notes?: string
  duration_hours?: number
  expires_at?: string
  created_at: string
  admin?: {
    full_name: string
    email: string
  }
}

export interface VerificationRequest {
  id: string
  user_id: string
  document_type: string
  document_urls: string[]
  status: 'pending' | 'verified' | 'rejected'
  reviewed_by?: string
  review_notes?: string
  submitted_at: string
  reviewed_at?: string
  created_at: string
  updated_at: string
  user?: {
    full_name: string
    email: string
    avatar_url?: string
  }
  reviewer?: {
    full_name: string
    email: string
  }
}

export interface PlatformAnalytics {
  id: string
  date: string
  metric_name: string
  metric_value: number
  metadata: Record<string, any>
  created_at: string
}

export interface TrustScore {
  id: string
  user_id: string
  overall_score: number
  identity_verified: boolean
  phone_verified: boolean
  email_verified: boolean
  social_connections: number
  successful_transactions: number
  dispute_count: number
  report_count: number
  last_calculated: string
  created_at: string
  updated_at: string
  user?: {
    full_name: string
    email: string
    avatar_url?: string
  }
}

export interface FlaggedContent {
  id: string
  content_type: string
  content_id: string
  user_id: string
  flag_reason: string
  confidence_score: number
  auto_action_taken?: string
  reviewed: boolean
  reviewed_by?: string
  review_decision?: string
  created_at: string
  updated_at: string
  user?: {
    full_name: string
    email: string
  }
  content?: any // The actual content being flagged
}

// Admin user management
export const adminService = {
  // Check if current user is admin
  async isAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    return !error && !!data
  },

  // Get current admin user details
  async getCurrentAdmin(): Promise<AdminUser | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('admin_users')
      .select(`
        *,
        profile:profiles(full_name, email, avatar_url)
      `)
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (error) return null
    return data as AdminUser
  },

  // Get all admin users
  async getAdminUsers(): Promise<AdminUser[]> {
    const { data, error } = await supabase
      .from('admin_users')
      .select(`
        *,
        profile:profiles(full_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admin users:', error)
      return []
    }

    return data as AdminUser[]
  },

  // Create new admin user
  async createAdminUser(userId: string, role: AdminUser['role'], permissions: Record<string, boolean> = {}): Promise<boolean> {
    const currentAdmin = await this.getCurrentAdmin()
    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      throw new Error('Only super admins can create admin users')
    }

    const { error } = await supabase
      .from('admin_users')
      .insert({
        id: userId,
        role,
        permissions,
        created_by: currentAdmin.id
      })

    return !error
  },

  // Update admin user
  async updateAdminUser(userId: string, updates: Partial<AdminUser>): Promise<boolean> {
    const { error } = await supabase
      .from('admin_users')
      .update(updates)
      .eq('id', userId)

    return !error
  },

  // Deactivate admin user
  async deactivateAdminUser(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: false })
      .eq('id', userId)

    return !error
  }
}

// Report management
export const reportService = {
  // Get all reports
  async getReports(filters?: {
    status?: Report['status']
    type?: Report['type']
    assigned_to?: string
    limit?: number
    offset?: number
  }): Promise<{ reports: Report[], total: number }> {
    let query = supabase
      .from('reports')
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(full_name, email),
        reported_user:profiles!reports_reported_user_id_fkey(full_name, email),
        reported_item:items(title, owner_id)
      `, { count: 'exact' })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    query = query.order('created_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching reports:', error)
      return { reports: [], total: 0 }
    }

    return { reports: data as Report[], total: count || 0 }
  },

  // Get single report
  async getReport(reportId: string): Promise<Report | null> {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(full_name, email),
        reported_user:profiles!reports_reported_user_id_fkey(full_name, email),
        reported_item:items(title, owner_id)
      `)
      .eq('id', reportId)
      .single()

    if (error) return null
    return data as Report
  },

  // Create report
  async createReport(report: Omit<Report, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<string | null> {
    const { data, error } = await supabase
      .from('reports')
      .insert(report)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating report:', error)
      return null
    }

    return data.id
  },

  // Update report
  async updateReport(reportId: string, updates: Partial<Report>): Promise<boolean> {
    const { error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', reportId)

    return !error
  },

  // Assign report to admin
  async assignReport(reportId: string, adminId: string): Promise<boolean> {
    const { error } = await supabase
      .from('reports')
      .update({ 
        assigned_to: adminId,
        status: 'investigating'
      })
      .eq('id', reportId)

    return !error
  },

  // Resolve report
  async resolveReport(reportId: string, resolution_notes: string): Promise<boolean> {
    const { error } = await supabase
      .from('reports')
      .update({ 
        status: 'resolved',
        resolution_notes,
        resolved_at: new Date().toISOString()
      })
      .eq('id', reportId)

    return !error
  }
}

// Moderation actions
export const moderationService = {
  // Get moderation actions
  async getModerationActions(filters?: {
    admin_id?: string
    target_user_id?: string
    action?: ModerationAction['action']
    limit?: number
    offset?: number
  }): Promise<{ actions: ModerationAction[], total: number }> {
    let query = supabase
      .from('moderation_actions')
      .select(`
        *,
        admin:profiles!moderation_actions_admin_id_fkey(full_name, email)
      `, { count: 'exact' })

    if (filters?.admin_id) {
      query = query.eq('admin_id', filters.admin_id)
    }

    if (filters?.target_user_id) {
      query = query.eq('target_user_id', filters.target_user_id)
    }

    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    query = query.order('created_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching moderation actions:', error)
      return { actions: [], total: 0 }
    }

    return { actions: data as ModerationAction[], total: count || 0 }
  },

  // Create moderation action
  async createModerationAction(action: Omit<ModerationAction, 'id' | 'created_at'>): Promise<string | null> {
    const { data, error } = await supabase
      .from('moderation_actions')
      .insert(action)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating moderation action:', error)
      return null
    }

    // Apply the moderation action
    await this.applyModerationAction(action)

    return data.id
  },

  // Apply moderation action to target
  async applyModerationAction(action: Omit<ModerationAction, 'id' | 'created_at'>): Promise<boolean> {
    try {
      switch (action.action) {
        case 'suspended':
          if (action.target_user_id) {
            // Update user profile to suspended status
            await supabase
              .from('profiles')
              .update({ verification_status: 'rejected' })
              .eq('id', action.target_user_id)
          }
          if (action.target_item_id) {
            // Suspend item
            await supabase
              .from('items')
              .update({ status: 'suspended' })
              .eq('id', action.target_item_id)
          }
          break

        case 'banned':
          if (action.target_user_id) {
            // Ban user - set all their items to inactive
            await supabase
              .from('items')
              .update({ status: 'suspended' })
              .eq('owner_id', action.target_user_id)
          }
          break

        case 'rejected':
          if (action.target_item_id) {
            await supabase
              .from('items')
              .update({ status: 'inactive' })
              .eq('id', action.target_item_id)
          }
          if (action.target_review_id) {
            await supabase
              .from('reviews')
              .update({ is_public: false })
              .eq('id', action.target_review_id)
          }
          break

        case 'approved':
          if (action.target_item_id) {
            await supabase
              .from('items')
              .update({ status: 'active' })
              .eq('id', action.target_item_id)
          }
          if (action.target_review_id) {
            await supabase
              .from('reviews')
              .update({ is_public: true })
              .eq('id', action.target_review_id)
          }
          break
      }

      return true
    } catch (error) {
      console.error('Error applying moderation action:', error)
      return false
    }
  }
}

// User verification
export const verificationService = {
  // Get verification requests
  async getVerificationRequests(filters?: {
    status?: VerificationRequest['status']
    limit?: number
    offset?: number
  }): Promise<{ requests: VerificationRequest[], total: number }> {
    let query = supabase
      .from('verification_requests')
      .select(`
        *,
        user:profiles!verification_requests_user_id_fkey(full_name, email, avatar_url),
        reviewer:profiles!verification_requests_reviewed_by_fkey(full_name, email)
      `, { count: 'exact' })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    query = query.order('submitted_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching verification requests:', error)
      return { requests: [], total: 0 }
    }

    return { requests: data as VerificationRequest[], total: count || 0 }
  },

  // Review verification request
  async reviewVerificationRequest(
    requestId: string, 
    status: 'verified' | 'rejected', 
    reviewNotes?: string
  ): Promise<boolean> {
    const currentAdmin = await adminService.getCurrentAdmin()
    if (!currentAdmin) return false

    const { data: request, error: fetchError } = await supabase
      .from('verification_requests')
      .select('user_id')
      .eq('id', requestId)
      .single()

    if (fetchError) return false

    // Update verification request
    const { error: updateError } = await supabase
      .from('verification_requests')
      .update({
        status,
        reviewed_by: currentAdmin.id,
        review_notes: reviewNotes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) return false

    // Update user's verification status
    if (status === 'verified') {
      await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('id', request.user_id)

      // Update trust score
      await supabase.rpc('calculate_trust_score', { target_user_id: request.user_id })
    }

    return true
  }
}

// Analytics service
export const analyticsService = {
  // Get platform analytics
  async getPlatformAnalytics(filters?: {
    start_date?: string
    end_date?: string
    metric_names?: string[]
  }): Promise<PlatformAnalytics[]> {
    let query = supabase
      .from('platform_analytics')
      .select('*')

    if (filters?.start_date) {
      query = query.gte('date', filters.start_date)
    }

    if (filters?.end_date) {
      query = query.lte('date', filters.end_date)
    }

    if (filters?.metric_names && filters.metric_names.length > 0) {
      query = query.in('metric_name', filters.metric_names)
    }

    query = query.order('date', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching analytics:', error)
      return []
    }

    return data as PlatformAnalytics[]
  },

  // Record platform metric
  async recordMetric(date: string, metricName: string, value: number, metadata?: Record<string, any>): Promise<boolean> {
    const { error } = await supabase
      .from('platform_analytics')
      .upsert({
        date,
        metric_name: metricName,
        metric_value: value,
        metadata: metadata || {}
      })

    return !error
  },

  // Get dashboard stats
  async getDashboardStats(): Promise<{
    totalUsers: number
    totalItems: number
    totalBookings: number
    totalRevenue: number
    pendingReports: number
    pendingVerifications: number
    activeUsers: number
    newUsersToday: number
  }> {
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [
      { count: totalUsers },
      { count: totalItems },
      { count: totalBookings },
      { data: revenueData },
      { count: pendingReports },
      { count: pendingVerifications },
      { count: activeUsers },
      { count: newUsersToday }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('items').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('total_amount').eq('status', 'completed'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', thirtyDaysAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today)
    ])

    const totalRevenue = revenueData?.reduce((sum, booking) => sum + booking.total_amount, 0) || 0

    return {
      totalUsers: totalUsers || 0,
      totalItems: totalItems || 0,
      totalBookings: totalBookings || 0,
      totalRevenue,
      pendingReports: pendingReports || 0,
      pendingVerifications: pendingVerifications || 0,
      activeUsers: activeUsers || 0,
      newUsersToday: newUsersToday || 0
    }
  }
}

// Trust and safety
export const trustSafetyService = {
  // Get trust scores
  async getTrustScores(filters?: {
    min_score?: number
    max_score?: number
    limit?: number
    offset?: number
  }): Promise<{ scores: TrustScore[], total: number }> {
    let query = supabase
      .from('trust_scores')
      .select(`
        *,
        user:profiles(full_name, email, avatar_url)
      `, { count: 'exact' })

    if (filters?.min_score !== undefined) {
      query = query.gte('overall_score', filters.min_score)
    }

    if (filters?.max_score !== undefined) {
      query = query.lte('overall_score', filters.max_score)
    }

    query = query.order('overall_score', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching trust scores:', error)
      return { scores: [], total: 0 }
    }

    return { scores: data as TrustScore[], total: count || 0 }
  },

  // Get flagged content
  async getFlaggedContent(filters?: {
    content_type?: string
    reviewed?: boolean
    limit?: number
    offset?: number
  }): Promise<{ content: FlaggedContent[], total: number }> {
    let query = supabase
      .from('flagged_content')
      .select(`
        *,
        user:profiles(full_name, email)
      `, { count: 'exact' })

    if (filters?.content_type) {
      query = query.eq('content_type', filters.content_type)
    }

    if (filters?.reviewed !== undefined) {
      query = query.eq('reviewed', filters.reviewed)
    }

    query = query.order('created_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching flagged content:', error)
      return { content: [], total: 0 }
    }

    return { content: data as FlaggedContent[], total: count || 0 }
  },

  // Review flagged content
  async reviewFlaggedContent(
    contentId: string, 
    decision: 'approved' | 'rejected' | 'needs_human_review'
  ): Promise<boolean> {
    const currentAdmin = await adminService.getCurrentAdmin()
    if (!currentAdmin) return false

    const { error } = await supabase
      .from('flagged_content')
      .update({
        reviewed: true,
        reviewed_by: currentAdmin.id,
        review_decision: decision
      })
      .eq('id', contentId)

    return !error
  }
}
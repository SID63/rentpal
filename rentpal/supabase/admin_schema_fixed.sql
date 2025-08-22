-- Admin and Moderation Schema Extension (Fixed Version)
-- This file extends the main schema with admin and moderation functionality

-- Create admin-specific types
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'moderator');
CREATE TYPE report_status AS ENUM ('pending', 'investigating', 'resolved', 'dismissed');
CREATE TYPE report_type AS ENUM ('inappropriate_content', 'spam', 'fraud', 'harassment', 'other');
CREATE TYPE moderation_action AS ENUM ('approved', 'rejected', 'suspended', 'banned', 'warning');

-- Admin users table
CREATE TABLE admin_users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role admin_role NOT NULL DEFAULT 'moderator',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table for user-generated reports
CREATE TABLE reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  reported_user_id UUID REFERENCES profiles(id),
  reported_item_id UUID REFERENCES items(id),
  reported_review_id UUID REFERENCES reviews(id),
  reported_message_id UUID REFERENCES messages(id),
  type report_type NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[], -- Array of URLs to screenshots/evidence
  status report_status DEFAULT 'pending',
  assigned_to UUID REFERENCES admin_users(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moderation actions table for tracking admin actions
CREATE TABLE moderation_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES admin_users(id) NOT NULL,
  target_user_id UUID REFERENCES profiles(id),
  target_item_id UUID REFERENCES items(id),
  target_review_id UUID REFERENCES reviews(id),
  target_message_id UUID REFERENCES messages(id),
  report_id UUID REFERENCES reports(id),
  action moderation_action NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  duration_hours INTEGER, -- For temporary suspensions
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User verification requests table
CREATE TABLE verification_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  document_type TEXT NOT NULL, -- 'drivers_license', 'passport', 'id_card'
  document_urls TEXT[] NOT NULL, -- Array of document image URLs
  status verification_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES admin_users(id),
  review_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform analytics table for tracking key metrics
CREATE TABLE platform_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, metric_name)
);

-- Audit log table for tracking admin actions
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES admin_users(id),
  user_id UUID REFERENCES profiles(id), -- User who performed the action (if not admin)
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'user', 'item', 'booking', 'review', etc.
  resource_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trust and safety scores table
CREATE TABLE trust_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  overall_score DECIMAL DEFAULT 50 CHECK (overall_score >= 0 AND overall_score <= 100),
  identity_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  social_connections INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  dispute_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flagged content table for automated content moderation
CREATE TABLE flagged_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'item', 'review', 'message', 'profile'
  content_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  flag_reason TEXT NOT NULL,
  confidence_score DECIMAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  auto_action_taken TEXT, -- 'hidden', 'flagged', 'none'
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES admin_users(id),
  review_decision TEXT, -- 'approved', 'rejected', 'needs_human_review'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for admin tables
CREATE INDEX idx_admin_users_role ON admin_users(role, is_active);
CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_assigned ON reports(assigned_to, status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_moderation_actions_admin ON moderation_actions(admin_id, created_at DESC);
CREATE INDEX idx_moderation_actions_target_user ON moderation_actions(target_user_id);
CREATE INDEX idx_verification_requests_status ON verification_requests(status, submitted_at DESC);
CREATE INDEX idx_platform_analytics_date ON platform_analytics(date DESC, metric_name);
CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_trust_scores_score ON trust_scores(overall_score DESC);
CREATE INDEX idx_flagged_content_reviewed ON flagged_content(reviewed, created_at DESC);
CREATE INDEX idx_flagged_content_type ON flagged_content(content_type, content_id);

-- Enable RLS on admin tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin tables

-- Admin users policies
CREATE POLICY "Only super admins can manage admin users" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    )
  );

CREATE POLICY "Admins can view other admins" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Reports policies
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage all reports" ON reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Moderation actions policies
CREATE POLICY "Only admins can create moderation actions" ON moderation_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Admins can view all moderation actions" ON moderation_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Verification requests policies
CREATE POLICY "Users can create their own verification requests" ON verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own verification requests" ON verification_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all verification requests" ON verification_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Platform analytics policies
CREATE POLICY "Only admins can access analytics" ON platform_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Audit logs policies
CREATE POLICY "Only admins can access audit logs" ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Trust scores policies
CREATE POLICY "Users can view their own trust score" ON trust_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all trust scores" ON trust_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Flagged content policies
CREATE POLICY "Only admins can access flagged content" ON flagged_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Create triggers for updated_at columns
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trust_scores_updated_at BEFORE UPDATE ON trust_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flagged_content_updated_at BEFORE UPDATE ON flagged_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
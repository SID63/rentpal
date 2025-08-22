-- Admin and Moderation Schema Extension
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

-- Functions for admin functionality

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(target_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  base_score DECIMAL := 50;
  identity_bonus DECIMAL := 0;
  activity_bonus DECIMAL := 0;
  reputation_bonus DECIMAL := 0;
  penalty DECIMAL := 0;
  final_score DECIMAL;
BEGIN
  -- Identity verification bonuses
  SELECT 
    CASE WHEN identity_verified THEN 15 ELSE 0 END +
    CASE WHEN phone_verified THEN 10 ELSE 0 END +
    CASE WHEN email_verified THEN 5 ELSE 0 END
  INTO identity_bonus
  FROM trust_scores 
  WHERE user_id = target_user_id;
  
  -- Activity and reputation bonuses
  SELECT 
    LEAST(successful_transactions * 2, 20) + -- Max 20 points for transactions
    LEAST(social_connections * 1, 10) -- Max 10 points for connections
  INTO activity_bonus
  FROM trust_scores 
  WHERE user_id = target_user_id;
  
  -- Reputation from reviews
  SELECT COALESCE(rating * 4, 0) -- Max 20 points for 5-star rating
  INTO reputation_bonus
  FROM profiles 
  WHERE id = target_user_id;
  
  -- Penalties for disputes and reports
  SELECT 
    dispute_count * 5 + -- 5 points penalty per dispute
    report_count * 3    -- 3 points penalty per report
  INTO penalty
  FROM trust_scores 
  WHERE user_id = target_user_id;
  
  -- Calculate final score
  final_score := base_score + identity_bonus + activity_bonus + reputation_bonus - penalty;
  
  -- Ensure score is within bounds
  final_score := GREATEST(0, LEAST(100, final_score));
  
  -- Update the trust score
  UPDATE trust_scores 
  SET 
    overall_score = final_score,
    last_calculated = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-flag suspicious content
CREATE OR REPLACE FUNCTION auto_flag_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag items with suspicious pricing (too low or too high)
  IF TG_TABLE_NAME = 'items' THEN
    IF NEW.daily_rate < 5 OR NEW.daily_rate > 10000 THEN
      INSERT INTO flagged_content (
        content_type,
        content_id,
        user_id,
        flag_reason,
        confidence_score,
        auto_action_taken
      ) VALUES (
        'item',
        NEW.id,
        NEW.owner_id,
        'Suspicious pricing detected',
        0.8,
        'flagged'
      );
    END IF;
  END IF;
  
  -- Flag reviews with potential spam patterns
  IF TG_TABLE_NAME = 'reviews' THEN
    IF LENGTH(NEW.comment) < 10 OR NEW.comment ~* '(http|www\.|\.com|\.net)' THEN
      INSERT INTO flagged_content (
        content_type,
        content_id,
        user_id,
        flag_reason,
        confidence_score,
        auto_action_taken
      ) VALUES (
        'review',
        NEW.id,
        NEW.reviewer_id,
        'Potential spam or inappropriate content',
        0.6,
        'flagged'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-flagging
CREATE TRIGGER auto_flag_items_trigger
  AFTER INSERT OR UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION auto_flag_content();

CREATE TRIGGER auto_flag_reviews_trigger
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION auto_flag_content();

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
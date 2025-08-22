-- Quick Admin Setup Script
-- Run this after applying the main admin_schema.sql

-- Step 1: Find your user (replace with your actual email)
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Create admin user (replace the UUID with your user ID from step 1)
-- INSERT INTO admin_users (id, role, permissions, is_active) 
-- VALUES (
--   'your-user-id-here',
--   'super_admin',
--   '{"all": true}',
--   true
-- );

-- Step 3: Create some sample data for testing (optional)

-- Sample trust scores
INSERT INTO trust_scores (user_id, overall_score, identity_verified, phone_verified, email_verified)
SELECT 
  id,
  FLOOR(RANDOM() * 100) + 1,
  RANDOM() > 0.5,
  RANDOM() > 0.3,
  true
FROM profiles
LIMIT 10;

-- Sample platform analytics
INSERT INTO platform_analytics (date, metric_name, metric_value, metadata)
VALUES 
  (CURRENT_DATE, 'total_users', 150, '{"source": "manual"}'),
  (CURRENT_DATE, 'total_items', 75, '{"source": "manual"}'),
  (CURRENT_DATE, 'total_bookings', 25, '{"source": "manual"}'),
  (CURRENT_DATE, 'total_revenue', 2500.00, '{"source": "manual", "currency": "USD"}'),
  (CURRENT_DATE - INTERVAL '1 day', 'total_users', 145, '{"source": "manual"}'),
  (CURRENT_DATE - INTERVAL '1 day', 'total_items', 70, '{"source": "manual"}'),
  (CURRENT_DATE - INTERVAL '1 day', 'total_bookings', 22, '{"source": "manual"}'),
  (CURRENT_DATE - INTERVAL '1 day', 'total_revenue', 2200.00, '{"source": "manual", "currency": "USD"}');

-- Verify setup
SELECT 'Admin users created:' as info, COUNT(*) as count FROM admin_users
UNION ALL
SELECT 'Trust scores created:', COUNT(*) FROM trust_scores
UNION ALL
SELECT 'Analytics records:', COUNT(*) FROM platform_analytics;
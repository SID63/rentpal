-- Create your first admin user
-- Step 1: Find your user ID (replace with your actual email)
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Copy the UUID from step 1 and use it below
-- Replace 'your-user-id-here' with your actual user ID

INSERT INTO admin_users (id, role, permissions, is_active) 
VALUES (
  'your-user-id-here', -- Replace with your actual UUID
  'super_admin',
  '{"all": true}',
  true
);

-- Step 3: Verify the admin user was created
SELECT 
  au.id,
  au.role,
  au.is_active,
  p.email,
  p.full_name
FROM admin_users au
JOIN profiles p ON au.id = p.id
WHERE au.role = 'super_admin';

-- Step 4: Create some sample trust scores for testing
INSERT INTO trust_scores (user_id, overall_score, identity_verified, phone_verified, email_verified)
SELECT 
  id,
  FLOOR(RANDOM() * 50) + 50, -- Random score between 50-100
  RANDOM() > 0.5,
  RANDOM() > 0.3,
  true
FROM profiles
LIMIT 5;

-- Step 5: Add some sample analytics data
INSERT INTO platform_analytics (date, metric_name, metric_value, metadata)
VALUES 
  (CURRENT_DATE, 'total_users', 25, '{"source": "manual"}'),
  (CURRENT_DATE, 'total_items', 15, '{"source": "manual"}'),
  (CURRENT_DATE, 'total_bookings', 5, '{"source": "manual"}'),
  (CURRENT_DATE, 'total_revenue', 500.00, '{"source": "manual", "currency": "USD"}');

-- Verify everything is set up
SELECT 'Setup complete!' as status;
-- Script to create your first admin user
-- Replace 'your-user-id-here' with your actual user ID from auth.users

-- First, make sure you have a regular user account created through the app
-- Then find your user ID by running:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Insert your user as a super admin (replace the UUID with your actual user ID)
INSERT INTO admin_users (id, role, permissions, is_active) 
VALUES (
  'your-user-id-here', -- Replace with your actual user ID
  'super_admin',
  '{"all": true}',
  true
);

-- Example: If your user ID is 12345678-1234-1234-1234-123456789012
-- INSERT INTO admin_users (id, role, permissions, is_active) 
-- VALUES (
--   '12345678-1234-1234-1234-123456789012',
--   'super_admin',
--   '{"all": true}',
--   true
-- );

-- Verify the admin user was created
SELECT 
  au.id,
  au.role,
  au.is_active,
  p.email,
  p.full_name
FROM admin_users au
JOIN profiles p ON au.id = p.id
WHERE au.role = 'super_admin';
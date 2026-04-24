-- =====================================================
-- Fix is_admin() Security Vulnerability
-- =====================================================
-- Issue: RLS policy references user_metadata (auth.users table)
-- 
-- The previous is_admin() function queried auth.users which contains
-- user_metadata (user-editable). Supabase flags ANY query to auth.users
-- in RLS policies as insecure.
--
-- Fix: Only use the profiles table which is server-side controlled.
-- The handle_new_user() trigger sets the role on signup, and only
-- trusted server-side code should update roles.
-- =====================================================

-- Fix the is_admin function - use CREATE OR REPLACE to avoid dropping dependencies
-- This removes the security vulnerability of querying auth.users
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    );
$ LANGUAGE sql STABLE;

-- =====================================================
-- Verify the fix works
-- =====================================================
-- Test as admin user (should return true)
-- SELECT is_admin();

-- Test as non-admin user (should return false)  
-- SELECT is_admin();

-- =====================================================
-- Note: Ensure the admin user has a profile with role='admin'
-- Run this if the admin profile doesn't exist:
-- INSERT INTO profiles (id, email, role)
-- SELECT id, email, 'admin'
-- FROM auth.users
-- WHERE email = 'admin@mekh.app'
-- ON CONFLICT (id) DO NOTHING;
-- =====================================================

-- =====================================================
-- Fix Notifications and Profiles Table Issues
-- Resolves 42P17 error caused by RLS policy evaluation failures
-- =====================================================

-- STEP 1: Ensure profiles table exists with proper schema
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'technician', 'client')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 2: Ensure is_admin() function exists with SECURITY DEFINER
-- This allows the function to be used in RLS policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    );
$$;

-- STEP 3: Add RLS policies for profiles table
-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to view all profiles (needed for is_admin check)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
CREATE POLICY "Authenticated users can view profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admin to insert profiles
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
CREATE POLICY "Admin can insert profiles" ON profiles
    FOR INSERT WITH CHECK (is_admin() = true);

-- STEP 4: Ensure notifications table has client_id column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- STEP 5: Fix notifications RLS policies to be simpler and more robust
-- Drop existing problematic policies
DROP POLICY IF EXISTS "tech_view_notifications" ON notifications;
DROP POLICY IF EXISTS "tech_update_notifications" ON notifications;
DROP POLICY IF EXISTS "client_view_notifications" ON notifications;
DROP POLICY IF EXISTS "client_update_notifications" ON notifications;
DROP POLICY IF EXISTS "admin_view_notifications" ON notifications;
DROP POLICY IF EXISTS "admin_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "admin_update_notifications" ON notifications;

-- Create simpler, more robust policies
-- Technicians can view their own notifications
CREATE POLICY "tech_view_own_notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = notifications.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Technicians can update their own notifications
CREATE POLICY "tech_update_own_notifications" ON notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = notifications.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Clients can view their own notifications
CREATE POLICY "client_view_own_notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = notifications.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- Clients can update their own notifications
CREATE POLICY "client_update_own_notifications" ON notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = notifications.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- Admin can view all notifications
CREATE POLICY "admin_view_all_notifications" ON notifications
    FOR SELECT USING (is_admin() = true);

-- Admin can insert notifications
CREATE POLICY "admin_insert_notifications" ON notifications
    FOR INSERT WITH CHECK (is_admin() = true);

-- Admin can update all notifications
CREATE POLICY "admin_update_all_notifications" ON notifications
    FOR UPDATE USING (is_admin() = true);

-- STEP 6: Ensure admin profile exists for admin@autogearke.com
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'admin@autogearke.com'
ON CONFLICT (id) DO NOTHING;

DO $$ 
BEGIN
    RAISE NOTICE 'Migration 021 completed successfully!';
END $$;
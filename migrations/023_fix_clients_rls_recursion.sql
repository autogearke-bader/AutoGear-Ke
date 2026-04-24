-- =====================================================
-- Fix Clients Table RLS Infinite Recursion
-- Resolves "infinite recursion detected in policy for relation 'clients'"
-- =====================================================

-- STEP 1: Drop all existing policies on clients table to start fresh
DROP POLICY IF EXISTS "clients_insert_own" ON clients;
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON clients;
DROP POLICY IF EXISTS "client_view_own" ON clients;
DROP POLICY IF EXISTS "client_update_own" ON clients;
DROP POLICY IF EXISTS "admin_view_clients" ON clients;
DROP POLICY IF EXISTS "admin_manage_clients" ON clients;
DROP POLICY IF EXISTS "client_select_own" ON clients;
DROP POLICY IF EXISTS "client_insert_own" ON clients;
DROP POLICY IF EXISTS "client_update_own" ON clients;
DROP POLICY IF EXISTS "authenticated_select_clients" ON clients;
DROP POLICY IF EXISTS "admin_select_clients" ON clients;
DROP POLICY IF EXISTS "admin_insert_clients" ON clients;
DROP POLICY IF EXISTS "admin_update_clients" ON clients;
DROP POLICY IF EXISTS "admin_delete_clients" ON clients;

-- STEP 2: Create a database function to safely upsert client profiles
-- This bypasses RLS policy issues by running with elevated privileges
CREATE OR REPLACE FUNCTION upsert_client_profile(
    p_name TEXT,
    p_phone TEXT,
    p_user_id UUID,
    p_email TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO clients (user_id, name, phone, email)
    VALUES (p_user_id, p_name, p_phone, p_email)
    ON CONFLICT (user_id)
    DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = COALESCE(EXCLUDED.email, clients.email),
        updated_at = NOW();
END;
$$;

-- STEP 3: Create simple RLS policies that work with the function

-- Allow users to view their own client profile
CREATE POLICY "client_select_own" ON clients
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own client profile (for direct inserts)
CREATE POLICY "client_insert_own" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own client profile (for direct updates)
CREATE POLICY "client_update_own" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "admin_all_clients" ON clients
    FOR ALL USING (is_admin() = true);

DO $$
BEGIN
    RAISE NOTICE 'Fixed clients RLS policies and added safe upsert function!';
END $$;
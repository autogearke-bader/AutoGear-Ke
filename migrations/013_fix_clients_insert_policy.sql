-- Fix: Add missing INSERT policy for clients table
-- This fixes the issue where new client profiles cannot be created
-- because there's no RLS policy allowing INSERT operations

-- ============================================
-- CLIENTS - Add INSERT policy
-- ============================================

-- Allow authenticated users to insert their own client profile
-- This is needed when a new user completes their client profile
CREATE POLICY "clients_insert_own" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also add a policy to allow users to view all clients (needed for some operations)
-- This complements the existing client_view_own policy
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON clients;
CREATE POLICY "Authenticated users can view all clients" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- Note: The following policies should also exist:
-- - admin_view_clients (SELECT for admin)
-- - admin_manage_clients (ALL for admin)
-- - client_view_own (SELECT for own data)
-- - client_update_own (UPDATE for own data)
-- ============================================

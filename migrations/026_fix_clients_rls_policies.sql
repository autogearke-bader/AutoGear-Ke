-- Add additional RLS policy for clients table to ensure authenticated users can insert their own profile
-- This is needed for the client onboarding flow

-- First check if the policy already exists and drop it if so
DROP POLICY IF EXISTS "clients_insert_own" ON clients;

-- Allow authenticated users to insert their own client profile
-- Using auth.uid() to match the user_id field
CREATE POLICY "clients_insert_own" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also ensure update policy exists
DROP POLICY IF EXISTS "client_update_own" ON clients;
CREATE POLICY "client_update_own" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

-- Ensure select policy exists
DROP POLICY IF EXISTS "client_view_own" ON clients;
CREATE POLICY "client_view_own" ON clients
    FOR SELECT USING (auth.uid() = user_id);
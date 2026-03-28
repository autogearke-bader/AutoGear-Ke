-- Fix RLS for admin access - Fixed version
-- Fix 406 errors by ensuring proper admin policies
-- Run this SQL against your Supabase database

-- Ensure the is_admin() function exists
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'admin@autogearke.com'
  );
$$ LANGUAGE sql STABLE;

-- Drop existing admin policies and recreate
DROP POLICY IF EXISTS "Admin can view all technicians" ON technicians;
DROP POLICY IF EXISTS "Admin can manage all technicians" ON technicians;
DROP POLICY IF EXISTS "Admin can view all clients" ON clients;
DROP POLICY IF EXISTS "Admin can manage all clients" ON clients;
DROP POLICY IF EXISTS "Admin can view notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can update notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can view leads" ON leads;
DROP POLICY IF EXISTS "Admin can manage leads" ON leads;
DROP POLICY IF EXISTS "Admin can view reviews" ON reviews;
DROP POLICY IF EXISTS "Admin can manage reviews" ON reviews;

-- Drop the old authenticated user policies
DROP POLICY IF EXISTS "Authenticated users can view all technicians" ON technicians;
DROP POLICY IF EXISTS "Authenticated users can manage technicians" ON technicians;
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON clients;

-- Admin can view ALL technicians
CREATE POLICY "Admin can view all technicians" ON technicians
    FOR SELECT USING (is_admin() = true);

-- Admin can manage ALL technicians
CREATE POLICY "Admin can manage all technicians" ON technicians
    FOR ALL USING (is_admin() = true);

-- Admin can view ALL clients
CREATE POLICY "Admin can view all clients" ON clients
    FOR SELECT USING (is_admin() = true);

-- Admin can manage ALL clients
CREATE POLICY "Admin can manage all clients" ON clients
    FOR ALL USING (is_admin() = true);

-- Admin can view notifications
CREATE POLICY "Admin can view notifications" ON notifications
    FOR SELECT USING (is_admin() = true);

-- Admin can insert notifications
CREATE POLICY "Admin can insert notifications" ON notifications
    FOR INSERT WITH CHECK (is_admin() = true);

-- Admin can update notifications
CREATE POLICY "Admin can update notifications" ON notifications
    FOR UPDATE USING (is_admin() = true);

-- Admin can view leads
CREATE POLICY "Admin can view leads" ON leads
    FOR SELECT USING (is_admin() = true);

-- Admin can manage leads
CREATE POLICY "Admin can manage leads" ON leads
    FOR ALL USING (is_admin() = true);

-- Admin can view reviews
CREATE POLICY "Admin can view reviews" ON reviews
    FOR SELECT USING (is_admin() = true);

-- Admin can manage reviews
CREATE POLICY "Admin can manage reviews" ON reviews
    FOR ALL USING (is_admin() = true);

-- Public can still view LIVE technicians (for the main website)
DROP POLICY IF EXISTS "Public can view live technicians" ON technicians;
CREATE POLICY "Public can view live technicians" ON technicians
    FOR SELECT USING (status = 'live');

-- Technicians can view/update their own profiles
DROP POLICY IF EXISTS "Technicians can manage own profile" ON technicians;
CREATE POLICY "Technicians can manage own profile" ON technicians
    FOR ALL USING (auth.uid() = user_id);

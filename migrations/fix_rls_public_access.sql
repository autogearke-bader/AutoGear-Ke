-- ============================================================================
-- Migration: Fix RLS Policies for Public Access
-- ============================================================================
-- Issue: Technician cards not displaying for unauthenticated users (401 errors)
-- Solution: Update RLS policies to explicitly allow unauthenticated (anon) access
-- ============================================================================

-- Drop potentially problematic policies first
DROP POLICY IF EXISTS "admin_view_technicians" ON technicians;
DROP POLICY IF EXISTS "admin_manage_technicians" ON technicians;
DROP POLICY IF EXISTS "public_view_live_technicians" ON technicians;
DROP POLICY IF EXISTS "technician_manage_own" ON technicians;
DROP POLICY IF EXISTS "public_view_services" ON technician_services;
DROP POLICY IF EXISTS "tech_manage_services" ON technician_services;
DROP POLICY IF EXISTS "public_view_photos" ON technician_photos;
DROP POLICY IF EXISTS "tech_manage_photos" ON technician_photos;
DROP POLICY IF EXISTS "public_view_payments" ON technician_payments;
DROP POLICY IF EXISTS "tech_manage_payments" ON technician_payments;
DROP POLICY IF EXISTS "public_view_videos" ON technician_videos;
DROP POLICY IF EXISTS "tech_manage_videos" ON technician_videos;

-- ============================================================================
-- CREATE IS_ADMIN FUNCTION (if it doesn't exist)
-- ============================================================================
-- Note: Using CREATE OR REPLACE instead of DROP to avoid breaking dependent policies
-- The function will be updated or created if it doesn't exist

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'admin@mekh.app'
  );
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- TECHNICIANS: Public + Authenticated Access
-- ============================================================================
-- Admin can view ALL technicians (including pending/suspended)
CREATE POLICY "admin_view_technicians" ON technicians
    FOR SELECT USING (is_admin() = true);

-- Admin can do ALL operations
CREATE POLICY "admin_manage_technicians" ON technicians
    FOR ALL USING (is_admin() = true);

-- UNAUTHENTICATED & AUTHENTICATED USERS can view LIVE technicians
CREATE POLICY "public_view_live_technicians" ON technicians
    FOR SELECT USING (status = 'live');

-- Technicians can manage their own profiles
CREATE POLICY "technician_manage_own" ON technicians
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- TECHNICIAN SERVICES: Public Access
-- ============================================================================
-- Everyone (including anonymous users) can view services
CREATE POLICY "public_view_services" ON technician_services
    FOR SELECT USING (true);

-- Technicians can manage own services
CREATE POLICY "tech_manage_services" ON technician_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_services.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- ============================================================================
-- TECHNICIAN PHOTOS: Public Access
-- ============================================================================
-- Everyone (including anonymous users) can view photos
CREATE POLICY "public_view_photos" ON technician_photos
    FOR SELECT USING (true);

-- Technicians can manage own photos
CREATE POLICY "tech_manage_photos" ON technician_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_photos.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- ============================================================================
-- TECHNICIAN PAYMENTS: Public Access
-- ============================================================================
-- Everyone (including anonymous users) can view payment methods
CREATE POLICY "public_view_payments" ON technician_payments
    FOR SELECT USING (true);

-- Technicians can manage own payments
CREATE POLICY "tech_manage_payments" ON technician_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_payments.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- ============================================================================
-- TECHNICIAN VIDEOS: Public Access
-- ============================================================================
-- Everyone (including anonymous users) can view videos
CREATE POLICY "public_view_videos" ON technician_videos
    FOR SELECT USING (true);

-- Technicians can manage own videos
CREATE POLICY "tech_manage_videos" ON technician_videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_videos.technician_id 
            AND technicians.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_videos.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- ============================================================================
-- COMPLETION
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'RLS policies updated for public access to technician data!';
END $$;

-- Complete RLS Fix - Admin + Public Access
-- Run this SQL against your Supabase database

-- Ensure the is_admin() function exists
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'admin@mekh.app'
  );
$$ LANGUAGE sql STABLE;

-- ============================================
-- TECHNIICIANS
-- ============================================

-- Drop all existing policies on technicians
DROP POLICY IF EXISTS "Admin can view all technicians" ON technicians;
DROP POLICY IF EXISTS "Admin can manage all technicians" ON technicians;
DROP POLICY IF EXISTS "Public can view live technicians" ON technicians;
DROP POLICY IF EXISTS "Technicians can manage own profile" ON technicians;
DROP POLICY IF EXISTS "Anyone can view live technicians" ON technicians;
DROP POLICY IF EXISTS "Authenticated users can view all technicians" ON technicians;
DROP POLICY IF EXISTS "Authenticated users can manage technicians" ON technicians;

-- Admin can view ALL technicians (including pending/suspended)
CREATE POLICY "admin_view_technicians" ON technicians
    FOR SELECT USING (is_admin() = true);

-- Admin can do ALL operations
CREATE POLICY "admin_manage_technicians" ON technicians
    FOR ALL USING (is_admin() = true);

-- Public can view LIVE technicians
CREATE POLICY "public_view_live_technicians" ON technicians
    FOR SELECT USING (status = 'live');

-- Technicians can manage their own profiles
CREATE POLICY "technician_manage_own" ON technicians
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CLIENTS
-- ============================================

DROP POLICY IF EXISTS "Admin can view all clients" ON clients;
DROP POLICY IF EXISTS "Admin can manage all clients" ON clients;
DROP POLICY IF EXISTS "Clients can view own data" ON clients;
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON clients;

-- Admin can view all clients
CREATE POLICY "admin_view_clients" ON clients
    FOR SELECT USING (is_admin() = true);

-- Admin can manage all clients
CREATE POLICY "admin_manage_clients" ON clients
    FOR ALL USING (is_admin() = true);

-- Clients can view their own data
CREATE POLICY "client_view_own" ON clients
    FOR SELECT USING (auth.uid() = user_id);

-- Clients can update their own data
CREATE POLICY "client_update_own" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- TECHNICIAN SERVICES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view technician services" ON technician_services;
DROP POLICY IF EXISTS "Authenticated users can view technician services" ON technician_services;
DROP POLICY IF EXISTS "Authenticated users can manage technician services" ON technician_services;

-- Anyone can view technician services
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

-- ============================================
-- TECHNICIAN PHOTOS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view technician photos" ON technician_photos;
DROP POLICY IF EXISTS "Authenticated users can view technician photos" ON technician_photos;
DROP POLICY IF EXISTS "Authenticated users can manage technician photos" ON technician_photos;

-- Anyone can view photos
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

-- ============================================
-- TECHNICIAN PAYMENTS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view payment methods" ON technician_payments;
DROP POLICY IF EXISTS "Authenticated users can view payment methods" ON technician_payments;
DROP POLICY IF EXISTS "Authenticated users can manage payment methods" ON technician_payments;

-- Anyone can view payment methods
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

-- ============================================
-- LEADS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view leads" ON leads;
DROP POLICY IF EXISTS "Users can insert leads" ON leads;
DROP POLICY IF EXISTS "Technicians can update own leads" ON leads;
DROP POLICY IF EXISTS "Admin can view leads" ON leads;
DROP POLICY IF EXISTS "Admin can manage leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;

-- Anyone can view leads (for public website)
CREATE POLICY "public_view_leads" ON leads
    FOR SELECT USING (true);

-- Any authenticated user can insert leads (clients booking)
CREATE POLICY "auth_insert_leads" ON leads
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));

-- Technicians can update own leads
CREATE POLICY "tech_update_leads" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = leads.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Admin can manage all leads
CREATE POLICY "admin_manage_leads" ON leads
    FOR ALL USING (is_admin() = true);

-- ============================================
-- REVIEWS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view visible reviews" ON reviews;
DROP POLICY IF EXISTS "Anyone can view all reviews (admin)" ON reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Technicians can manage reviews for own profile" ON reviews;
DROP POLICY IF EXISTS "Admin can view reviews" ON reviews;
DROP POLICY IF EXISTS "Admin can manage reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can view reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can update reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can delete reviews" ON reviews;

-- Anyone can view visible reviews
CREATE POLICY "public_view_reviews" ON reviews
    FOR SELECT USING (is_visible = true);

-- Authenticated users can insert reviews
CREATE POLICY "auth_insert_reviews" ON reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Admin can view all reviews
CREATE POLICY "admin_view_all_reviews" ON reviews
    FOR SELECT USING (is_admin() = true);

-- Admin can manage all reviews
CREATE POLICY "admin_manage_reviews" ON reviews
    FOR ALL USING (is_admin() = true);

-- ============================================
-- NOTIFICATIONS
-- Note: notifications table has technician_id and client_id, not user_id
-- ============================================

DROP POLICY IF EXISTS "Technicians can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Technicians can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can view notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can update notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON notifications;

-- Technicians can view own notifications
CREATE POLICY "tech_view_notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = notifications.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Technicians can update own notifications
CREATE POLICY "tech_update_notifications" ON notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = notifications.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Clients can view own notifications (using client_id)
CREATE POLICY "client_view_notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = notifications.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- Clients can update own notifications
CREATE POLICY "client_update_notifications" ON notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = notifications.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- Admin can view all notifications
CREATE POLICY "admin_view_notifications" ON notifications
    FOR SELECT USING (is_admin() = true);

-- Admin can insert notifications
CREATE POLICY "admin_insert_notifications" ON notifications
    FOR INSERT WITH CHECK (is_admin() = true);

-- Admin can update notifications
CREATE POLICY "admin_update_notifications" ON notifications
    FOR UPDATE USING (is_admin() = true);

-- ============================================
-- ARTICLES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view published articles" ON articles;
DROP POLICY IF EXISTS "Anyone can view all articles (admin)" ON articles;
DROP POLICY IF EXISTS "Anyone can insert articles" ON articles;
DROP POLICY IF EXISTS "Anyone can update articles" ON articles;
DROP POLICY IF EXISTS "Anyone can delete articles" ON articles;
DROP POLICY IF EXISTS "Authenticated users can view articles" ON articles;
DROP POLICY IF EXISTS "Authenticated users can insert articles" ON articles;
DROP POLICY IF EXISTS "Authenticated users can update articles" ON articles;
DROP POLICY IF EXISTS "Authenticated users can delete articles" ON articles;

-- Anyone can view published articles
CREATE POLICY "public_view_articles" ON articles
    FOR SELECT USING (is_published = true);

-- Admin can manage all articles
CREATE POLICY "admin_manage_articles" ON articles
    FOR ALL USING (is_admin() = true);

-- Authenticated users can create/update articles
CREATE POLICY "auth_manage_articles" ON articles
    FOR ALL USING (is_admin() = true);

-- ============================================
-- TECHNICIAN VIDEOS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view technician videos" ON technician_videos;
DROP POLICY IF EXISTS "Technicians can manage own videos" ON technician_videos;
DROP POLICY IF EXISTS "Admin can manage technician videos" ON technician_videos;
DROP POLICY IF EXISTS "Authenticated users can view technician videos" ON technician_videos;
DROP POLICY IF EXISTS "Authenticated users can manage technician videos" ON technician_videos;

-- Anyone can view videos
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
    );

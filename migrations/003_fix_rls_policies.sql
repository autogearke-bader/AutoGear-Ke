-- Migration: Simple RLS fix - Allow all authenticated users full access
-- Run this SQL against your Supabase database

-- Drop existing admin policies and replace with simpler ones
-- that allow any authenticated user to access everything

-- Technicians: Allow all authenticated users to select
DROP POLICY IF EXISTS "Anyone can view live technicians" ON technicians;
DROP POLICY IF EXISTS "Technicians can view all technicians" ON technicians;
DROP POLICY IF EXISTS "Admin can view all technicians" ON technicians;
DROP POLICY IF EXISTS "Admin can update technicians" ON technicians;

CREATE POLICY "Authenticated users can view all technicians" ON technicians
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage technicians" ON technicians
    FOR ALL USING (auth.role() = 'authenticated');

-- Clients: Allow all authenticated users to select
DROP POLICY IF EXISTS "Clients can view own data" ON clients;
DROP POLICY IF EXISTS "Admin can view all clients" ON clients;
DROP POLICY IF EXISTS "Admin can manage clients" ON clients;

CREATE POLICY "Authenticated users can view all clients" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage clients" ON clients
    FOR ALL USING (auth.role() = 'authenticated');

-- Notifications: Allow all authenticated users to insert/view
DROP POLICY IF EXISTS "Technicians can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Technicians can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can view all notifications" ON notifications;

CREATE POLICY "Authenticated users can view notifications" ON notifications
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert notifications" ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update notifications" ON notifications
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Technician Services: Allow all authenticated users
DROP POLICY IF EXISTS "Anyone can view technician services" ON technician_services;
DROP POLICY IF EXISTS "Technicians can manage own services" ON technician_services;
DROP POLICY IF EXISTS "Admin can view all technician services" ON technician_services;
DROP POLICY IF EXISTS "Admin can manage technician services" ON technician_services;

CREATE POLICY "Authenticated users can view technician services" ON technician_services
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage technician services" ON technician_services
    FOR ALL USING (auth.role() = 'authenticated');

-- Technician Photos: Allow all authenticated users
DROP POLICY IF EXISTS "Anyone can view technician photos" ON technician_photos;
DROP POLICY IF EXISTS "Technicians can manage own photos" ON technician_photos;
DROP POLICY IF EXISTS "Admin can view all technician photos" ON technician_photos;
DROP POLICY IF EXISTS "Admin can manage technician photos" ON technician_photos;

CREATE POLICY "Authenticated users can view technician photos" ON technician_photos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage technician photos" ON technician_photos
    FOR ALL USING (auth.role() = 'authenticated');

-- Technician Payments: Allow all authenticated users
DROP POLICY IF EXISTS "Anyone can view payment methods" ON technician_payments;
DROP POLICY IF EXISTS "Technicians can manage own payments" ON technician_payments;

CREATE POLICY "Authenticated users can view payment methods" ON technician_payments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage payment methods" ON technician_payments
    FOR ALL USING (auth.role() = 'authenticated');

-- Leads: Allow all authenticated users
DROP POLICY IF EXISTS "Anyone can view leads" ON leads;
DROP POLICY IF EXISTS "Users can insert leads" ON leads;
DROP POLICY IF EXISTS "Technicians can update own leads" ON leads;
DROP POLICY IF EXISTS "Admin can view all leads" ON leads;
DROP POLICY IF EXISTS "Admin can manage leads" ON leads;

CREATE POLICY "Authenticated users can view leads" ON leads
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert leads" ON leads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update leads" ON leads
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete leads" ON leads
    FOR DELETE USING (auth.role() = 'authenticated');

-- Reviews: Allow all authenticated users
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON reviews;
DROP POLICY IF EXISTS "Anyone can view all reviews (admin)" ON reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Technicians can manage reviews for own profile" ON reviews;
DROP POLICY IF EXISTS "Admin can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Admin can manage reviews" ON reviews;

CREATE POLICY "Authenticated users can view reviews" ON reviews
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert reviews" ON reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update reviews" ON reviews
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete reviews" ON reviews
    FOR DELETE USING (auth.role() = 'authenticated');

-- Articles: Allow all authenticated users
DROP POLICY IF EXISTS "Anyone can view published articles" ON articles;
DROP POLICY IF EXISTS "Anyone can view all articles (admin)" ON articles;
DROP POLICY IF EXISTS "Anyone can insert articles" ON articles;
DROP POLICY IF EXISTS "Anyone can update articles" ON articles;
DROP POLICY IF EXISTS "Anyone can delete articles" ON articles;

CREATE POLICY "Authenticated users can view articles" ON articles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert articles" ON articles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update articles" ON articles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete articles" ON articles
    FOR DELETE USING (auth.role() = 'authenticated');

-- Technician Videos: Allow all authenticated users
DROP POLICY IF EXISTS "Anyone can view technician videos" ON technician_videos;
DROP POLICY IF EXISTS "Technicians can manage own videos" ON technician_videos;
DROP POLICY IF EXISTS "Admin can manage technician videos" ON technician_videos;

CREATE POLICY "Authenticated users can view technician videos" ON technician_videos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage technician videos" ON technician_videos
    FOR ALL USING (auth.role() = 'authenticated');

-- Notes: 
-- - For production, you should restrict these policies based on user roles
-- - The 406 errors you're seeing are from the main app (client), not admin
-- - Those queries use user_id filter which may have different RLS
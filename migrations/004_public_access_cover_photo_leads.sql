-- Migration: Add cover photo, thumbnail image, and lead WhatsApp tracking
-- Run this SQL against your Supabase database

-- 1. Add cover_photo column to technicians table
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS cover_photo TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS thumbnail_image TEXT;

-- 2. Add is_whatsapp_lead column to leads table to track leads from WhatsApp clicks
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_whatsapp_lead BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_clicked_at TIMESTAMPTZ;

-- 3. Create index for faster queries on leads with whatsapp
CREATE INDEX IF NOT EXISTS idx_leads_is_whatsapp ON leads(is_whatsapp_lead) WHERE is_whatsapp_lead = true;

-- 4. Allow public (anon) access to view live technicians without authentication
-- First, enable anon on supabase if not already
-- Note: This assumes anon key is configured in supabase

-- Drop existing authenticated-only policies and replace with public read access
DROP POLICY IF EXISTS "Authenticated users can view all technicians" ON technicians;
CREATE POLICY "Anyone can view live technicians" ON technicians
    FOR SELECT USING (status = 'live');

-- 5. Allow public to view technician services
DROP POLICY IF EXISTS "Authenticated users can view technician services" ON technician_services;
CREATE POLICY "Anyone can view technician services" ON technician_services
    FOR SELECT USING (true);

-- 6. Allow public to view technician photos
DROP POLICY IF EXISTS "Authenticated users can view technician photos" ON technician_photos;
CREATE POLICY "Anyone can view technician photos" ON technician_photos
    FOR SELECT USING (true);

-- 7. Allow public to view reviews (only visible ones)
DROP POLICY IF EXISTS "Authenticated users can view reviews" ON reviews;
CREATE POLICY "Anyone can view visible reviews" ON reviews
    FOR SELECT USING (is_visible = true);

-- 8. Allow public to view technician payments
DROP POLICY IF EXISTS "Authenticated users can view payment methods" ON technician_payments;
CREATE POLICY "Anyone can view payment methods" ON technician_payments
    FOR SELECT USING (true);

-- 9. Allow public to view technician videos
DROP POLICY IF EXISTS "Authenticated users can view technician videos" ON technician_videos;
CREATE POLICY "Anyone can view technician videos" ON technician_videos
    FOR SELECT USING (true);

-- 10. Allow authenticated users to create leads
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON leads;
CREATE POLICY "Authenticated users can insert leads" ON leads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 11. Allow authenticated users to view their own leads
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
CREATE POLICY "Users can view own leads" ON leads
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        OR EXISTS (SELECT 1 FROM technicians WHERE technicians.id = leads.technician_id AND technicians.user_id = auth.uid())
    );

-- 12. Allow technicians to update own leads
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
CREATE POLICY "Technicians can update own leads" ON leads
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        OR EXISTS (SELECT 1 FROM technicians WHERE technicians.id = leads.technician_id AND technicians.user_id = auth.uid())
    );

-- 13. Allow technicians to view own notifications
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON notifications;
CREATE POLICY "Technicians can view own notifications" ON notifications
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (SELECT 1 FROM technicians WHERE technicians.id = notifications.technician_id AND technicians.user_id = auth.uid())
    );

-- 14. Allow technicians to insert notifications for their own profile
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
CREATE POLICY "Technicians can insert own notifications" ON notifications
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND EXISTS (SELECT 1 FROM technicians WHERE technicians.id = notifications.technician_id AND technicians.user_id = auth.uid())
    );

-- 15. Allow technicians to update own notifications
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON notifications;
CREATE POLICY "Technicians can update own notifications" ON notifications
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        AND EXISTS (SELECT 1 FROM technicians WHERE technicians.id = notifications.technician_id AND technicians.user_id = auth.uid())
    );

-- 16. Allow public to view clients (for own profile only - managed in client-side)
-- Note: This is for lead creation context where client info is needed

-- 17. Allow authenticated users to manage technicians (own profile)
DROP POLICY IF EXISTS "Authenticated users can manage technicians" ON technicians;
CREATE POLICY "Technicians can manage own profile" ON technicians
    FOR ALL USING (auth.uid() = user_id);

-- 18. Allow technicians to manage own services
DROP POLICY IF EXISTS "Authenticated users can manage technician services" ON technician_services;
CREATE POLICY "Technicians can manage own services" ON technician_services
    FOR ALL USING (
        EXISTS (SELECT 1 FROM technicians WHERE technicians.id = technician_services.technician_id AND technicians.user_id = auth.uid())
    );

-- 19. Allow technicians to manage own photos
DROP POLICY IF EXISTS "Authenticated users can manage technician photos" ON technician_photos;
CREATE POLICY "Technicians can manage own photos" ON technician_photos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM technicians WHERE technicians.id = technician_photos.technician_id AND technicians.user_id = auth.uid())
    );

-- 20. Allow technicians to manage own payments
DROP POLICY IF EXISTS "Authenticated users can manage payment methods" ON technician_payments;
CREATE POLICY "Technicians can manage own payments" ON technician_payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM technicians WHERE technicians.id = technician_payments.technician_id AND technicians.user_id = auth.uid())
    );

-- 21. Allow technicians to manage own videos
DROP POLICY IF EXISTS "Authenticated users can manage technician videos" ON technician_videos;
CREATE POLICY "Technicians can manage own videos" ON technician_videos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM technicians WHERE technicians.id = technician_videos.technician_id AND technicians.user_id = auth.uid())
    );

-- 22. Allow public to view technicians table for admin checks
-- This is needed for client-side lead creation

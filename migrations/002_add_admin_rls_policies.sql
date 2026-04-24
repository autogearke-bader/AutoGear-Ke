-- Migration: Add admin RLS policies for full access
-- Run this SQL against your Supabase database

-- Add admin role check function if it doesn't exist
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'admin@mekh.app'
  );
$$ LANGUAGE sql STABLE;

-- Allow admin to view all technicians (including pending and suspended)
DROP POLICY IF EXISTS "Admin can view all technicians" ON technicians;
CREATE POLICY "Admin can view all technicians" ON technicians
    FOR SELECT USING (is_admin() = true);

-- Allow admin to update technicians
DROP POLICY IF EXISTS "Admin can update technicians" ON technicians;
CREATE POLICY "Admin can update technicians" ON technicians
    FOR ALL USING (is_admin() = true);

-- Allow admin to view all clients
DROP POLICY IF EXISTS "Admin can view all clients" ON clients;
CREATE POLICY "Admin can view all clients" ON clients
    FOR SELECT USING (is_admin() = true);

-- Allow admin to manage clients
DROP POLICY IF EXISTS "Admin can manage clients" ON clients;
CREATE POLICY "Admin can manage clients" ON clients
    FOR ALL USING (is_admin() = true);

-- Allow admin to insert notifications (for rejection/approval notifications)
DROP POLICY IF EXISTS "Admin can insert notifications" ON notifications;
CREATE POLICY "Admin can insert notifications" ON notifications
    FOR INSERT WITH CHECK (is_admin() = true);

-- Allow admin to view all notifications
DROP POLICY IF EXISTS "Admin can view all notifications" ON notifications;
CREATE POLICY "Admin can view all notifications" ON notifications
    FOR SELECT USING (is_admin() = true);

-- Allow admin to view all technician services
DROP POLICY IF EXISTS "Admin can view all technician services" ON technician_services;
CREATE POLICY "Admin can view all technician services" ON technician_services
    FOR SELECT USING (is_admin() = true);

-- Allow admin to manage technician services
DROP POLICY IF EXISTS "Admin can manage technician services" ON technician_services;
CREATE POLICY "Admin can manage technician services" ON technician_services
    FOR ALL USING (is_admin() = true);

-- Allow admin to view all technician photos
DROP POLICY IF EXISTS "Admin can view all technician photos" ON technician_photos;
CREATE POLICY "Admin can view all technician photos" ON technician_photos
    FOR SELECT USING (is_admin() = true);

-- Allow admin to manage technician photos
DROP POLICY IF EXISTS "Admin can manage technician photos" ON technician_photos;
CREATE POLICY "Admin can manage technician photos" ON technician_photos
    FOR ALL USING (is_admin() = true);

-- Allow admin to view all leads
DROP POLICY IF EXISTS "Admin can view all leads" ON leads;
CREATE POLICY "Admin can view all leads" ON leads
    FOR SELECT USING (is_admin() = true);

-- Allow admin to manage leads
DROP POLICY IF EXISTS "Admin can manage leads" ON leads;
CREATE POLICY "Admin can manage leads" ON leads
    FOR ALL USING (is_admin() = true);

-- Allow admin to view all reviews
DROP POLICY IF EXISTS "Admin can view all reviews" ON reviews;
CREATE POLICY "Admin can view all reviews" ON reviews
    FOR SELECT USING (is_admin() = true);

-- Allow admin to manage reviews
DROP POLICY IF EXISTS "Admin can manage reviews" ON reviews;
CREATE POLICY "Admin can manage reviews" ON reviews
    FOR ALL USING (is_admin() = true);

-- Create technician_videos table if it doesn't exist (from previous migration)
CREATE TABLE IF NOT EXISTS technician_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram')),
  video_url TEXT NOT NULL,
  video_id TEXT NOT NULL,
  service TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on technician_videos if not already enabled
ALTER TABLE technician_videos ENABLE ROW LEVEL SECURITY;

-- Allow public to view technician videos
DROP POLICY IF EXISTS "Anyone can view technician videos" ON technician_videos;
CREATE POLICY "Anyone can view technician videos" ON technician_videos
    FOR SELECT USING (true);

-- Allow technicians to manage own videos
DROP POLICY IF EXISTS "Technicians can manage own videos" ON technician_videos;
CREATE POLICY "Technicians can manage own videos" ON technician_videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_videos.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Allow admin to manage technician videos
DROP POLICY IF EXISTS "Admin can manage technician videos" ON technician_videos;
CREATE POLICY "Admin can manage technician videos" ON technician_videos
    FOR ALL USING (is_admin() = true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_technician_videos_technician_id ON technician_videos(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_photos_service ON technician_photos(service);
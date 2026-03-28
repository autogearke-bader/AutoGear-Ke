-- Migration: Update technician schema for new features
-- Run this SQL against your Supabase database

-- 1. Update technician_services table: replace price_min/price_max with single price
ALTER TABLE technician_services DROP COLUMN IF EXISTS price_min;
ALTER TABLE technician_services DROP COLUMN IF EXISTS price_max;
ALTER TABLE technician_services ADD COLUMN IF NOT EXISTS price INTEGER;

-- 2. Update technician_photos table: add service column
ALTER TABLE technician_photos ADD COLUMN IF NOT EXISTS service TEXT;

-- 3. Create technician_videos table for video links
CREATE TABLE IF NOT EXISTS technician_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram')),
  video_url TEXT NOT NULL,
  video_id TEXT NOT NULL,
  service TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_technician_videos_technician_id ON technician_videos(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_photos_service ON technician_photos(service);

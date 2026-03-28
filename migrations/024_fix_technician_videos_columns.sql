-- Migration: Fix technician_videos table columns
-- This fixes the 400 error when querying videos in the dashboard
-- and ensures existing video records are properly accessible

-- Add sort_order column if it doesn't exist
ALTER TABLE technician_videos 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add alt_text column if it doesn't exist  
ALTER TABLE technician_videos 
ADD COLUMN IF NOT EXISTS alt_text TEXT;

-- Ensure video_id column exists and allows NULL (for flexibility)
-- This is already defined in some migrations but not others
ALTER TABLE technician_videos 
ALTER COLUMN video_id DROP NOT NULL;

-- Set default sort_order for any existing records where it might be NULL
-- This ensures the ORDER BY clause works properly
UPDATE technician_videos 
SET sort_order = 0 
WHERE sort_order IS NULL;

-- Add NOT NULL constraint after updating existing records
ALTER TABLE technician_videos 
ALTER COLUMN sort_order SET NOT NULL;

-- Create index on technician_id for faster queries
-- This improves performance when fetching videos for a specific technician
CREATE INDEX IF NOT EXISTS idx_technician_videos_technician_id 
ON technician_videos(technician_id);

-- Create index on sort_order for faster ordering
CREATE INDEX IF NOT EXISTS idx_technician_videos_sort_order 
ON technician_videos(sort_order);

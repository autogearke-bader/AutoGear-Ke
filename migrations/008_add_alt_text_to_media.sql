-- Migration: Add alt_text and service columns to technician_photos and alt_text to technician_videos
-- Date: 2026-03-13

-- Add service and alt_text columns to technician_photos if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technician_photos' AND column_name = 'service') THEN
        ALTER TABLE technician_photos ADD COLUMN service TEXT DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technician_photos' AND column_name = 'alt_text') THEN
        ALTER TABLE technician_photos ADD COLUMN alt_text TEXT DEFAULT '';
    END IF;
END $$;

-- Add alt_text column to technician_videos if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technician_videos' AND column_name = 'alt_text') THEN
        ALTER TABLE technician_videos ADD COLUMN alt_text TEXT DEFAULT '';
    END IF;
END $$;

-- Update existing records to populate alt_text from existing service and caption fields
-- This helps with SEO for existing content
UPDATE technician_photos 
SET alt_text = COALESCE(service || ' ', '') || COALESCE(caption, '')
WHERE alt_text = '';

UPDATE technician_videos 
SET alt_text = COALESCE(service, '')
WHERE alt_text = '';

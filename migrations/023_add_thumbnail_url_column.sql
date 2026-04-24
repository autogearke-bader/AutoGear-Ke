-- =====================================================
-- Add thumbnail_url column to technician_videos
-- Cache TikTok thumbnails to avoid API calls on every page load
-- =====================================================

-- Add thumbnail_url column to technician_videos table
ALTER TABLE technician_videos
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add index for better performance when querying thumbnails
CREATE INDEX IF NOT EXISTS idx_technician_videos_thumbnail_url
ON technician_videos(thumbnail_url)
WHERE thumbnail_url IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN technician_videos.thumbnail_url IS 'Cached TikTok video thumbnail URL to avoid API calls on every page load';

DO $$
BEGIN
    RAISE NOTICE 'Migration 023 completed - thumbnail_url column added to technician_videos!';
END $$;
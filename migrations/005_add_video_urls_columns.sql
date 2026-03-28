-- Add video URL columns to technicians table
-- These columns will store up to 4 video URLs total (can be from any platform)

ALTER TABLE technicians 
ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video1_url TEXT,
ADD COLUMN IF NOT EXISTS video1_platform TEXT,
ADD COLUMN IF NOT EXISTS video1_service TEXT,
ADD COLUMN IF NOT EXISTS video2_url TEXT,
ADD COLUMN IF NOT EXISTS video2_platform TEXT,
ADD COLUMN IF NOT EXISTS video2_service TEXT,
ADD COLUMN IF NOT EXISTS video3_url TEXT,
ADD COLUMN IF NOT EXISTS video3_platform TEXT,
ADD COLUMN IF NOT EXISTS video3_service TEXT;

-- Create technician_videos table if it doesn't exist
CREATE TABLE IF NOT EXISTS technician_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram')),
    video_url TEXT NOT NULL,
    video_id TEXT,
    service TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on technician_videos
ALTER TABLE technician_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for technician_videos
DROP POLICY IF EXISTS "Anyone can view technician videos" ON technician_videos;
CREATE POLICY "Anyone can view technician videos" ON technician_videos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_videos.technician_id 
            AND technicians.status = 'live'
        )
    );

DROP POLICY IF EXISTS "Technicians can manage own videos" ON technician_videos;
CREATE POLICY "Technicians can manage own videos" ON technician_videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_videos.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_technician_videos_technician_id ON technician_videos(technician_id);

-- Add missing location columns to technicians table
-- These columns are used in the JoinPage wizard for storing location data

-- Add google_maps_link column if it doesn't exist
ALTER TABLE technicians 
ADD COLUMN IF NOT EXISTS google_maps_link TEXT;

-- Add latitude column if it doesn't exist  
ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

-- Add longitude column if it doesn't exist
ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Enable RLS on new columns (optional - existing policies should handle access)
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

-- Grant public read access to location data
DROP POLICY IF EXISTS "Public can view technician location" ON technicians;
CREATE POLICY "Public can view technician location" ON technicians
    FOR SELECT USING (true);

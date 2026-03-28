-- Add latitude and longitude columns to technicians table for location-based features
ALTER TABLE technicians 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

-- Create indexes for faster location queries
CREATE INDEX IF NOT EXISTS idx_technicians_latitude ON technicians(latitude);
CREATE INDEX IF NOT EXISTS idx_technicians_longitude ON technicians(longitude);

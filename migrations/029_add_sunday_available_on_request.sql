-- =====================================================
-- Add Sunday Available on Request Field
-- Allows technicians to mark Sunday as "Available on request" instead of regular hours
-- =====================================================

-- Add available_on_request column to business_hours table
ALTER TABLE business_hours ADD COLUMN IF NOT EXISTS available_on_request BOOLEAN DEFAULT false;

-- Update RLS policies to handle the new column (no changes needed as existing policies cover all columns)

DO $$
BEGIN
    RAISE NOTICE 'Migration 029 completed - Added available_on_request column to business_hours table';
END $$;
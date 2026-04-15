-- =====================================================
-- Migration 032: Add avg_rating and review_count columns to technicians table
-- =====================================================

-- Add columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='technicians' AND column_name='avg_rating') THEN
        ALTER TABLE technicians ADD COLUMN avg_rating NUMERIC DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='technicians' AND column_name='review_count') THEN
        ALTER TABLE technicians ADD COLUMN review_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Backfill existing data using inline calculation
UPDATE technicians t
SET 
  review_count = (
    SELECT COUNT(*)
    FROM reviews r
    WHERE r.technician_id = t.id
      AND r.status = 'approved'
      AND r.is_visible = true
  ),
  avg_rating = (
    SELECT COALESCE(ROUND(AVG(r.rating)::NUMERIC, 1), 0)
    FROM reviews r
    WHERE r.technician_id = t.id
      AND r.status = 'approved'
      AND r.is_visible = true
  );

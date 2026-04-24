-- =====================================================
-- Migration 031: Auto-update technician avg_rating & review_count
-- when a review is approved
-- =====================================================
-- The technicians table has avg_rating and review_count columns.
-- These must be recalculated whenever a review's status changes to 'approved'.
-- =====================================================

-- Function that recalculates avg_rating and review_count for a technician
CREATE OR REPLACE FUNCTION public.refresh_technician_rating(tech_id UUID)
RETURNS VOID AS $$
DECLARE
  v_count INTEGER;
  v_avg   NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0)
  INTO v_count, v_avg
  FROM reviews
  WHERE technician_id = tech_id
    AND status = 'approved'
    AND is_visible = true;

  UPDATE technicians
  SET
    review_count = v_count,
    avg_rating   = v_avg
  WHERE id = tech_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function called after INSERT / UPDATE / DELETE on reviews
CREATE OR REPLACE FUNCTION public.trg_update_technician_rating()
RETURNS TRIGGER AS $$
DECLARE
  affected_tech UUID;
BEGIN
  -- Determine which technician is affected
  IF TG_OP = 'DELETE' THEN
    affected_tech := OLD.technician_id;
  ELSE
    affected_tech := NEW.technician_id;
  END IF;

  PERFORM public.refresh_technician_rating(affected_tech);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if present
DROP TRIGGER IF EXISTS trg_reviews_update_rating ON reviews;

-- Create trigger: runs after any INSERT, UPDATE, or DELETE on reviews
CREATE TRIGGER trg_reviews_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_technician_rating();

-- Backfill existing approved and visible reviews immediately
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT technician_id FROM reviews WHERE status = 'approved' AND is_visible = true LOOP
    PERFORM public.refresh_technician_rating(r.technician_id);
  END LOOP;
END $$;

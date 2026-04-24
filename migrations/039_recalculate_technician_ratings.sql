-- ============================================================================
-- Migration 039: Recalculate and verify technician ratings
-- ============================================================================

-- First, ensure the refresh_technician_rating function includes visibility check
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

-- Recalculate ratings for ALL technicians to ensure accuracy
DO $$
DECLARE
  tech_record RECORD;
BEGIN
  RAISE NOTICE 'Recalculating ratings for all technicians...';

  FOR tech_record IN SELECT id, business_name FROM technicians LOOP
    PERFORM public.refresh_technician_rating(tech_record.id);
    RAISE NOTICE 'Updated ratings for: %', tech_record.business_name;
  END LOOP;

  RAISE NOTICE 'Rating recalculation completed.';
END $$;

-- Verify the ratings are correct
DO $$
DECLARE
  incorrect_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO incorrect_count
  FROM (
    SELECT
      t.id,
      t.business_name,
      t.review_count AS stored_count,
      t.avg_rating AS stored_rating,
      COUNT(r.id) FILTER (WHERE r.status = 'approved' AND r.is_visible = true) AS calculated_count,
      COALESCE(ROUND(AVG(r.rating) FILTER (WHERE r.status = 'approved' AND r.is_visible = true)::NUMERIC, 1), 0) AS calculated_rating
    FROM technicians t
    LEFT JOIN reviews r ON r.technician_id = t.id
    GROUP BY t.id, t.business_name, t.review_count, t.avg_rating
    HAVING
      t.review_count != COUNT(r.id) FILTER (WHERE r.status = 'approved' AND r.is_visible = true)
      OR t.avg_rating != COALESCE(ROUND(AVG(r.rating) FILTER (WHERE r.status = 'approved' AND r.is_visible = true)::NUMERIC, 1), 0)
  ) incorrect_ratings;

  IF incorrect_count > 0 THEN
    RAISE NOTICE 'Warning: % technicians have incorrect rating data. This may indicate an issue with the rating trigger.', incorrect_count;
  ELSE
    RAISE NOTICE 'All technician ratings are accurate.';
  END IF;
END $$;

-- ============================================================================
-- Complete
-- ============================================================================
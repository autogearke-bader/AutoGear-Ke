-- ============================================================================
-- Migration 036: Fix cleanup_old_bookings function
-- ============================================================================

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS cleanup_old_bookings();

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION cleanup_old_bookings()
RETURNS TABLE(cleaned_count INTEGER) AS $$
DECLARE
  count_cleaned INTEGER := 0;
BEGIN
  -- Update bookings older than 2 days with eligible statuses
  -- to hide them from client view (soft delete)
  UPDATE leads
  SET hidden_from_client = true
  WHERE
    hidden_from_client = false
    AND created_at < NOW() - INTERVAL '2 days'
    AND status IN ('job_done', 'contacted', 'pending', 'not_converted');

  GET DIAGNOSTICS count_cleaned = ROW_COUNT;

  RETURN QUERY SELECT count_cleaned;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return 0
    RAISE NOTICE 'Error in cleanup_old_bookings: %', SQLERRM;
    RETURN QUERY SELECT 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant execute permission to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION cleanup_old_bookings() TO authenticated;

-- ============================================================================
-- Test the function
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Testing cleanup_old_bookings function...';
    PERFORM cleanup_old_bookings();
    RAISE NOTICE 'Function executed successfully!';
END $$;
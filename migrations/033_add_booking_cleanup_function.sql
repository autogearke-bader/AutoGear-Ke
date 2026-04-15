-- ============================================================================
-- Migration 033: Add automatic booking cleanup functionality
-- ============================================================================

-- Add a 'hidden_from_client' column to leads table for soft delete
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hidden_from_client BOOLEAN DEFAULT false;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_leads_hidden_from_client ON leads(hidden_from_client);
CREATE INDEX IF NOT EXISTS idx_leads_status_created_at ON leads(status, created_at);

-- ============================================================================
-- Function to clean up old bookings
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_bookings()
RETURNS TABLE(cleaned_count INTEGER) AS $$
DECLARE
  count_cleaned INTEGER;
BEGIN
  -- Update bookings older than 2 days with eligible statuses
  -- to hide them from client view (soft delete)
  UPDATE leads
  SET hidden_from_client = true
  WHERE 
    hidden_from_client = false
    AND created_at < NOW() - INTERVAL '2 days'
    AND status IN ('job_done', 'contacted', 'pending');
  
  GET DIAGNOSTICS count_cleaned = ROW_COUNT;
  
  RETURN QUERY SELECT count_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant execute permission to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION cleanup_old_bookings() TO authenticated;

-- ============================================================================
-- Update RLS policies to respect hidden_from_client flag
-- ============================================================================

-- Drop existing client leads view policy if it exists
DROP POLICY IF EXISTS "Clients can view own leads" ON leads;

-- Create new policy that excludes hidden bookings for clients
CREATE POLICY "Clients can view own non-hidden leads" ON leads
    FOR SELECT USING (
        hidden_from_client = false
        AND (
            client_id IN (
                SELECT id FROM clients WHERE user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM technicians 
                WHERE technicians.id = leads.technician_id 
                AND technicians.user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- Complete
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE 'Migration 033: Booking cleanup function created successfully!';
END $$;

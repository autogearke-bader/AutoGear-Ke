-- ============================================================================
-- Migration 038: Fix review visibility issues
-- ============================================================================

-- Ensure the is_visible column has the correct default
ALTER TABLE reviews ALTER COLUMN is_visible SET DEFAULT false;

-- Update any reviews that might have wrong visibility settings
-- (This is a safety measure in case any reviews got corrupted)
UPDATE reviews SET is_visible = false WHERE status = 'pending';
UPDATE reviews SET is_visible = false WHERE status = 'declined';

-- Ensure approved reviews that were revoked remain hidden
-- (This should already be handled by adminRevokeReview function)

-- Re-apply the RLS policy to ensure it's active
DROP POLICY IF EXISTS "public_view_approved_reviews" ON reviews;
CREATE POLICY "public_view_approved_reviews" ON reviews
    FOR SELECT
    USING (status = 'approved' AND is_visible = true);

-- Add policy to prevent pending reviews from being visible
DROP POLICY IF EXISTS "public_view_no_pending_reviews" ON reviews;
CREATE POLICY "public_view_no_pending_reviews" ON reviews
    FOR SELECT
    USING (status != 'pending');

-- ============================================================================
-- Complete
-- ============================================================================
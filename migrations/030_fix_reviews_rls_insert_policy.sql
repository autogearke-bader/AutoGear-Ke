-- =====================================================
-- Fix Reviews RLS — Run this in Supabase SQL Editor
-- =====================================================
-- Problem: POST /rest/v1/reviews returns 403
-- Cause:   The insert policy requires client_id = auth.uid()
--          but the old submitReview() never set client_id.
-- Fix:     Code now sends client_id. This migration ensures
--          the policy is correct and the column exists.
-- =====================================================

-- STEP 1: Ensure required columns exist (safe if already present)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS client_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined'));
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_visible  BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- STEP 2: Drop ALL existing review policies to start clean
DROP POLICY IF EXISTS "admin_full_access_reviews"   ON reviews;
DROP POLICY IF EXISTS "public_view_visible_reviews" ON reviews;
DROP POLICY IF EXISTS "public_view_approved_reviews" ON reviews;
DROP POLICY IF EXISTS "auth_insert_reviews"         ON reviews;
DROP POLICY IF EXISTS "tech_manage_reviews"         ON reviews;
DROP POLICY IF EXISTS "tech_view_own_reviews"       ON reviews;
DROP POLICY IF EXISTS "client_view_own_reviews"     ON reviews;

-- STEP 3: Re-create policies

-- 3a. Admin: full access
CREATE POLICY "admin_full_access_reviews" ON reviews
    FOR ALL
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- 3b. Public: can only read approved reviews
CREATE POLICY "public_view_approved_reviews" ON reviews
    FOR SELECT
    USING (status = 'approved');

-- 3c. Authenticated client: can INSERT a review
--     client_id must equal auth.uid() (auth user ID)
--     The app code sets client_id = session.user.id
CREATE POLICY "auth_insert_reviews" ON reviews
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND client_id = auth.uid()
    );

-- 3d. Client: can read their own reviews (any status)
CREATE POLICY "client_view_own_reviews" ON reviews
    FOR SELECT
    USING (client_id = auth.uid());

-- 3e. Technician: can read all reviews for their profile
CREATE POLICY "tech_view_own_reviews" ON reviews
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM technicians
            WHERE technicians.id = reviews.technician_id
            AND technicians.user_id = auth.uid()
        )
    );

-- STEP 4: Ensure RLS is enabled on the table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

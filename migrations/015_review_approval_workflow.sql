-- =====================================================
-- Review Approval Workflow System
-- Adds approval status, admin notes, approved_by fields
-- =====================================================

-- =====================================================
-- STEP 1: Add new columns to reviews table
-- =====================================================

-- Add status column with default 'pending'
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'declined'));

-- Add admin_notes column for admin to add notes
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';

-- Add approved_by column to track who approved
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add client_id column to track who submitted the review
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add updated_at column
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- STEP 2: Create indexes for performance
-- =====================================================

-- Index on status field for filtering pending/approved/declined reviews
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Index on technician_id for loading reviews by technician
CREATE INDEX IF NOT EXISTS idx_reviews_technician_id ON reviews(technician_id);

-- Index on status + technician_id for common query pattern
CREATE INDEX IF NOT EXISTS idx_reviews_status_technician ON reviews(status, technician_id);

-- Index on client_id for client's own reviews
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);

-- =====================================================
-- STEP 3: Update RLS policies for reviews
-- =====================================================

-- Drop existing review policies
DROP POLICY IF EXISTS "admin_full_access_reviews" ON reviews;
DROP POLICY IF EXISTS "public_view_visible_reviews" ON reviews;
DROP POLICY IF EXISTS "auth_insert_reviews" ON reviews;
DROP POLICY IF EXISTS "tech_manage_reviews" ON reviews;

-- Admin full access to all reviews (all operations)
CREATE POLICY "admin_full_access_reviews" ON reviews
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Public can only view APPROVED reviews
CREATE POLICY "public_view_approved_reviews" ON reviews
    FOR SELECT 
    USING (status = 'approved');

-- Authenticated users can insert reviews (default to pending)
CREATE POLICY "auth_insert_reviews" ON reviews
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND client_id = auth.uid()
    );

-- Technicians can view their own technician's reviews (all statuses for management)
CREATE POLICY "tech_view_own_reviews" ON reviews
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = reviews.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Clients can view their own submitted reviews (all statuses)
CREATE POLICY "client_view_own_reviews" ON reviews
    FOR SELECT 
    USING (client_id = auth.uid());

-- Clients cannot update or delete their reviews after submission
-- (No UPDATE or DELETE policies for clients)

-- =====================================================
-- STEP 4: Create function to handle review status changes
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_review_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Set updated_at timestamp
    NEW.updated_at = NOW();
    
    -- If status changed to approved, set approved_by
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        NEW.approved_by := auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_review_status_change ON reviews;

-- Create trigger
CREATE TRIGGER on_review_status_change
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_review_status_change();

-- =====================================================
-- STEP 5: Create notification for technicians when review is approved
-- =====================================================
-- Note: This will be triggered from the application code
-- when an admin approves a review

-- Insert a sample notification type if not exists
-- The actual notification will be created by the application

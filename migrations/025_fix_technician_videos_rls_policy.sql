-- Fix technician_videos RLS policy
-- The current policy is missing WITH CHECK clause for INSERT

-- Drop the broken policy
DROP POLICY IF EXISTS "tech_manage_videos" ON technician_videos;

-- Create new policy with proper USING and WITH CHECK clauses
-- USING: Used for SELECT, UPDATE, DELETE (checks existing rows)
-- WITH CHECK: Used for INSERT (checks new rows)
CREATE POLICY "tech_manage_videos" ON technician_videos
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_videos.technician_id 
            AND technicians.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_videos.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Migration 011: Fix technician_videos RLS so INSERT works during join wizard
-- Root cause: the "tech_manage_videos" policy used FOR ALL USING (...), but
-- USING clauses only apply to existing rows (SELECT/UPDATE/DELETE).
-- INSERT needs a separate WITH CHECK clause, otherwise new rows can never be inserted.

-- Drop the broken unified policy
DROP POLICY IF EXISTS "tech_manage_videos" ON technician_videos;

-- SELECT / UPDATE / DELETE: check against existing rows via USING
CREATE POLICY "tech_manage_videos" ON technician_videos
    FOR ALL USING (
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

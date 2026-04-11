-- ============================================================================
-- Fix Articles RLS for Admin Access
-- ============================================================================
-- Problem: Articles table RLS policies were preventing admin inserts/updates
-- Solution: Drop existing policies and recreate with proper admin access

-- Drop existing articles RLS policies (use IF EXISTS to handle pre-existing policies)
DROP POLICY IF EXISTS "Public view published articles" ON articles;
DROP POLICY IF EXISTS "Authenticated view all articles" ON articles;
DROP POLICY IF EXISTS "Anyone can view published articles" ON articles;
DROP POLICY IF EXISTS "Anyone can view all articles (admin)" ON articles;
DROP POLICY IF EXISTS "Anyone can insert articles" ON articles;
DROP POLICY IF EXISTS "Anyone can update articles" ON articles;
DROP POLICY IF EXISTS "Anyone can delete articles" ON articles;
DROP POLICY IF EXISTS "Authenticated insert articles" ON articles;
DROP POLICY IF EXISTS "Authenticated update articles" ON articles;
DROP POLICY IF EXISTS "Authenticated delete articles" ON articles;

-- Ensure articles table has RLS enabled
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Articles
-- Public: view published articles only
CREATE POLICY "Public view published articles" ON articles
    FOR SELECT USING (is_published = true);

-- Admin/Authenticated: view all articles
CREATE POLICY "Authenticated view all articles" ON articles
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Admin/Authenticated: insert articles (no restrictions - ADMIN ONLY in practice)
CREATE POLICY "Authenticated insert articles" ON articles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Admin/Authenticated: update articles (no restrictions - ADMIN ONLY in practice)
CREATE POLICY "Authenticated update articles" ON articles
    FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Admin/Authenticated: delete articles (no restrictions - ADMIN ONLY in practice)
CREATE POLICY "Authenticated delete articles" ON articles
    FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Add grant to ensure proper access
GRANT SELECT, INSERT, UPDATE, DELETE ON articles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

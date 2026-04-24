-- =====================================================
-- Fix Profiles Table RLS Policies - Resolve Stack Depth Limit
-- =====================================================

-- STEP 1: Add policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
CREATE POLICY "Authenticated users can view profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON profiles;
CREATE POLICY "Authenticated users can insert profiles" ON profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;
CREATE POLICY "Authenticated users can update profiles" ON profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

-- STEP 2: Fix is_admin() function with SECURITY DEFINER
-- Use CREATE OR REPLACE to avoid dropping dependent policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    );
$$;

-- STEP 3: Ensure admin profile exists
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'admin@mekh.app'
ON CONFLICT (id) DO NOTHING;

DO $$ 
BEGIN
    RAISE NOTICE 'Migration 020 completed successfully!';
END $$;

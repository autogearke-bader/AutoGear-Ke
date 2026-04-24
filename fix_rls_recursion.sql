-- =====================================================
-- Fix Infinite Recursion in RLS Policies
-- Resolves "infinite recursion detected in policy for relation"
-- =====================================================

-- STEP 1: Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- STEP 2: Recreate profiles policies without recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;
CREATE POLICY "Admin can manage all profiles" ON profiles
    FOR ALL USING (is_admin() = true);

-- STEP 3: Ensure clients policies are correct (drop and recreate if needed)
DROP POLICY IF EXISTS "Clients can view own data" ON clients;
DROP POLICY IF EXISTS "Users can insert own client record" ON clients;
DROP POLICY IF EXISTS "Users can update own client record" ON clients;
DROP POLICY IF EXISTS "client_select_own" ON clients;
DROP POLICY IF EXISTS "client_insert_own" ON clients;
DROP POLICY IF EXISTS "client_update_own" ON clients;
DROP POLICY IF EXISTS "admin_all_clients" ON clients;

-- Recreate clients policies
CREATE POLICY "client_select_own" ON clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "client_insert_own" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "client_update_own" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "admin_all_clients" ON clients
    FOR ALL USING (is_admin() = true);

DO $$
BEGIN
    RAISE NOTICE 'Fixed infinite recursion in RLS policies!';
END $$;
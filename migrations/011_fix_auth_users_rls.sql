-- Fix: Allow authenticated users to read their own user record
-- This is needed for supabase.auth.getUser() to work

-- Enable RLS on auth.users if not already enabled
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own record
DROP POLICY IF EXISTS "Users can view their own user data" ON auth.users;
CREATE POLICY "Users can view their own user data" ON auth.users
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy to allow users to update their own record
DROP POLICY IF EXISTS "Users can update their own user data" ON auth.users;
CREATE POLICY "Users can update their own user data" ON auth.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

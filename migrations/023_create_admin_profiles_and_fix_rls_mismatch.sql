-- Ensure admin user has proper profile entry with admin role
-- This migration ensures that the admin user is properly registered in the profiles table
-- with the correct admin role for RLS policy compatibility

-- First, ensure the profiles table exists and is properly configured
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles" ON profiles
    FOR SELECT USING (is_admin() = true);

-- Update is_admin function to ensure it exists and is correct
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    );
$$ LANGUAGE sql STABLE;

-- Function to update admin user's profile with admin role
-- This should be called manually or via a database tool for the admin user
CREATE OR REPLACE FUNCTION set_user_admin_role(user_email TEXT)
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET role = 'admin'
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql;

-- Insert/update admin user profile (call this after deployment)
-- SELECT set_user_admin_role('admin@mekh.app');

-- Create a trigger to automatically create profile entry for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        CASE 
            WHEN NEW.email = 'admin@mekh.app' THEN 'admin'
            WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
            ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
        END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = CASE 
            WHEN EXCLUDED.email = 'admin@mekh.app' THEN 'admin'
            WHEN EXCLUDED.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
            ELSE COALESCE(EXCLUDED.raw_user_meta_data->>'role', profiles.role)
        END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also run the trigger for existing users (especially admin)
INSERT INTO profiles (id, email, role)
SELECT 
    id, 
    email,
    CASE 
        WHEN email = 'admin@mekh.app' THEN 'admin'
        ELSE COALESCE(raw_user_meta_data->>'role', 'user')
    END
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    role = CASE 
        WHEN EXCLUDED.email = 'admin@mekh.app' THEN 'admin'
        ELSE profiles.role
    END;

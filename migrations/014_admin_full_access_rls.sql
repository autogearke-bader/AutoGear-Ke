-- =====================================================
-- Admin Full Access RLS Policies
-- Grants admin user (email: admin@autogearke.com OR role: 'admin')
-- full SELECT, INSERT, UPDATE, DELETE access to all tables
-- =====================================================

-- =====================================================
-- STEP 1: Create profiles table if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Create/update is_admin() function
-- ONLY checks profiles.role (server-side controlled, not user-editable)
-- NOTE: Removed auth.users query - it was flagged as insecure because
-- auth.users contains user_metadata which is user-editable.
-- The profiles table is controlled server-side via the handle_new_user() trigger.
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    );
$ LANGUAGE sql STABLE;

-- =====================================================
-- STEP 3: Create admin policies for each table
-- =====================================================

-- =====================================================
-- CLIENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_clients" ON clients;
CREATE POLICY "admin_full_access_clients" ON clients
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Also keep existing client policies for regular users
DROP POLICY IF EXISTS "client_view_own" ON clients;
CREATE POLICY "client_view_own" ON clients
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_update_own" ON clients;
CREATE POLICY "client_update_own" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "clients_insert_own" ON clients;
CREATE POLICY "clients_insert_own" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view all clients" ON clients;
CREATE POLICY "Authenticated users can view all clients" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- TECHNICIANS TABLE
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_technicians" ON technicians;
CREATE POLICY "admin_full_access_technicians" ON technicians
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Keep existing technician policies
DROP POLICY IF EXISTS "public_view_live_technicians" ON technicians;
CREATE POLICY "public_view_live_technicians" ON technicians
    FOR SELECT USING (status = 'live');

DROP POLICY IF EXISTS "technician_manage_own" ON technicians;
CREATE POLICY "technician_manage_own" ON technicians
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- TECHNICIAN SERVICES TABLE
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_technician_services" ON technician_services;
CREATE POLICY "admin_full_access_technician_services" ON technician_services
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Keep existing policies
DROP POLICY IF EXISTS "public_view_services" ON technician_services;
CREATE POLICY "public_view_services" ON technician_services
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "tech_manage_services" ON technician_services;
CREATE POLICY "tech_manage_services" ON technician_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_services.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- =====================================================
-- TECHNICIAN PHOTOS TABLE
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_technician_photos" ON technician_photos;
CREATE POLICY "admin_full_access_technician_photos" ON technician_photos
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Keep existing policies
DROP POLICY IF EXISTS "public_view_photos" ON technician_photos;
CREATE POLICY "public_view_photos" ON technician_photos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "tech_manage_photos" ON technician_photos;
CREATE POLICY "tech_manage_photos" ON technician_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_photos.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- =====================================================
-- TECHNICIAN PAYMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_technician_payments" ON technician_payments;
CREATE POLICY "admin_full_access_technician_payments" ON technician_payments
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Keep existing policies
DROP POLICY IF EXISTS "public_view_payments" ON technician_payments;
CREATE POLICY "public_view_payments" ON technician_payments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "tech_manage_payments" ON technician_payments;
CREATE POLICY "tech_manage_payments" ON technician_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_payments.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- =====================================================
-- TECHNICIAN VIDEOS TABLE
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_technician_videos" ON technician_videos;
CREATE POLICY "admin_full_access_technician_videos" ON technician_videos
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Keep existing policies
DROP POLICY IF EXISTS "public_view_videos" ON technician_videos;
CREATE POLICY "public_view_videos" ON technician_videos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "tech_manage_videos" ON technician_videos;
CREATE POLICY "tech_manage_videos" ON technician_videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_videos.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- =====================================================
-- LEADS TABLE
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_leads" ON leads;
CREATE POLICY "admin_full_access_leads" ON leads
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Keep existing policies
DROP POLICY IF EXISTS "public_view_leads" ON leads;
CREATE POLICY "public_view_leads" ON leads
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "auth_insert_leads" ON leads;
CREATE POLICY "auth_insert_leads" ON leads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "tech_update_leads" ON leads;
CREATE POLICY "tech_update_leads" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = leads.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- =====================================================
-- REVIEWS TABLE
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_reviews" ON reviews;
CREATE POLICY "admin_full_access_reviews" ON reviews
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Keep existing policies
DROP POLICY IF EXISTS "public_view_visible_reviews" ON reviews;
CREATE POLICY "public_view_visible_reviews" ON reviews
    FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS "auth_insert_reviews" ON reviews;
CREATE POLICY "auth_insert_reviews" ON reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "tech_manage_reviews" ON reviews;
CREATE POLICY "tech_manage_reviews" ON reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = reviews.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_notifications" ON notifications;
CREATE POLICY "admin_full_access_notifications" ON notifications
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Keep existing policies
DROP POLICY IF EXISTS "tech_view_notifications" ON notifications;
CREATE POLICY "tech_view_notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = notifications.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tech_update_notifications" ON notifications;
CREATE POLICY "tech_update_notifications" ON notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = notifications.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "client_view_notifications" ON notifications;
CREATE POLICY "client_view_notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients
            WHERE clients.id = notifications.client_id 
            AND clients.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "client_update_notifications" ON notifications;
CREATE POLICY "client_update_notifications" ON notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM clients
            WHERE clients.id = notifications.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- =====================================================
-- ARTICLES TABLE
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_articles" ON articles;
CREATE POLICY "admin_full_access_articles" ON articles
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Keep existing policies
DROP POLICY IF EXISTS "public_view_articles" ON articles;
CREATE POLICY "public_view_articles" ON articles
    FOR SELECT USING (is_published = true);

-- =====================================================
-- PROFILES TABLE (new)
-- =====================================================
DROP POLICY IF EXISTS "admin_full_access_profiles" ON profiles;
CREATE POLICY "admin_full_access_profiles" ON profiles
    FOR ALL 
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- Users can view their own profile
DROP POLICY IF EXISTS "users_view_own_profile" ON profiles;
CREATE POLICY "users_view_own_profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- STEP 4: Create function to auto-create profile on signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        CASE 
            WHEN NEW.email = 'admin@autogearke.com' THEN 'admin'
            ELSE 'user'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 5: Ensure admin profile exists
-- =====================================================
-- This will ensure the admin user has the correct role if already signed up
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'admin@autogearke.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin'
WHERE profiles.role != 'admin';

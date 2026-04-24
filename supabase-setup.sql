-- ============================================================================
-- Mekh - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor to set up the database
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Clients table (for authenticated users who book services)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,  -- Links to Supabase auth.users
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Technicians table
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,  -- Links to Supabase auth.users
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    business_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    bio TEXT DEFAULT '',
    experience_years TEXT NOT NULL,
    county TEXT,
    area TEXT NOT NULL,
    mobile_service TEXT DEFAULT 'no' CHECK (mobile_service IN ('yes', 'no', 'both')),
    instagram TEXT,
    tiktok_link TEXT,
    youtube_link TEXT,
    pricing_notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'suspended')),
    profile_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Technician Services table
CREATE TABLE IF NOT EXISTS technician_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    price_min NUMERIC,
    price_max NUMERIC,
    negotiable BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Technician Photos table
CREATE TABLE IF NOT EXISTS technician_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Technician Payments table
CREATE TABLE IF NOT EXISTS technician_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads table (client bookings/enquiries)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    service_requested TEXT NOT NULL,
    vehicle_model TEXT,
    client_location TEXT NOT NULL,
    client_lat NUMERIC,
    client_lng NUMERIC,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'job_done', 'no_response')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    would_rebook TEXT CHECK (would_rebook IN ('yes', 'no')),
    comment TEXT DEFAULT '',
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_lead', 'new_review', 'profile_approved', 'profile_rejected', 'subscription_reminder')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Articles table (Blog posts)
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT DEFAULT '',
    content TEXT DEFAULT '',
    images JSONB DEFAULT '[]',
    meta_description TEXT DEFAULT '',
    keywords TEXT DEFAULT '',
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- CLIENTS: Users can only access their own client record
CREATE POLICY "Clients can view own data" ON clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client record" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client record" ON clients
    FOR UPDATE USING (auth.uid() = user_id);


-- TECHNICIANS: 
-- - Public can view live technicians
-- - Technicians can manage their own profile
CREATE POLICY "Anyone can view live technicians" ON technicians
    FOR SELECT USING (status = 'live');

CREATE POLICY "Technicians can view all technicians" ON technicians
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own technician record" ON technicians
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own technician record" ON technicians
    FOR UPDATE USING (auth.uid() = user_id);


-- TECHNICIAN SERVICES:
-- - Public can view services of live technicians
-- - Technicians can manage their own services
CREATE POLICY "Anyone can view technician services" ON technician_services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_services.technician_id 
            AND technicians.status = 'live'
        )
    );

CREATE POLICY "Technicians can manage own services" ON technician_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_services.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );


-- TECHNICIAN PHOTOS:
-- - Public can view photos of live technicians
-- - Technicians can manage their own photos
CREATE POLICY "Anyone can view technician photos" ON technician_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_photos.technician_id 
            AND technicians.status = 'live'
        )
    );

CREATE POLICY "Technicians can manage own photos" ON technician_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_photos.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );


-- TECHNICIAN PAYMENTS:
-- - Public can view payment methods of live technicians
-- - Technicians can manage their own payment methods
CREATE POLICY "Anyone can view payment methods" ON technician_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_payments.technician_id 
            AND technicians.status = 'live'
        )
    );

CREATE POLICY "Technicians can manage own payments" ON technician_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = technician_payments.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );


-- LEADS:
-- - Clients can view their own leads
-- - Technicians can view leads for their profile
CREATE POLICY "Anyone can view leads" ON leads
    FOR SELECT USING (true);

CREATE POLICY "Users can insert leads" ON leads
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Technicians can update own leads" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = leads.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );


-- REVIEWS:
-- - Public can view visible reviews for live technicians
-- - Anyone can insert reviews
CREATE POLICY "Anyone can view visible reviews" ON reviews
    FOR SELECT USING (
        is_visible = true 
        AND EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = reviews.technician_id 
            AND technicians.status = 'live'
        )
    );

CREATE POLICY "Anyone can view all reviews (admin)" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert reviews" ON reviews
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Technicians can manage reviews for own profile" ON reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = reviews.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );


-- NOTIFICATIONS:
-- - Technicians can view their own notifications
-- - Technicians can update their own notifications
CREATE POLICY "Technicians can view own notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = notifications.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

CREATE POLICY "Technicians can update own notifications" ON notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = notifications.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );


-- ARTICLES (Blog):
-- - Public can view published articles
-- - Authenticated users (admin) can manage all articles
CREATE POLICY "Public view published articles" ON articles
    FOR SELECT USING (is_published = true);

CREATE POLICY "Authenticated view all articles" ON articles
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated insert articles" ON articles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated update articles" ON articles
    FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated delete articles" ON articles
    FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');


-- ============================================================================
-- AUTO-CREATE CLIENT ON AUTH SIGNUP (Trigger Function)
-- ============================================================================

-- Function to create client record automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create client record for new users
    INSERT INTO public.clients (user_id, name, email, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);
CREATE INDEX IF NOT EXISTS idx_technicians_county ON technicians(county);
CREATE INDEX IF NOT EXISTS idx_technicians_slug ON technicians(slug);
CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON technicians(user_id);

CREATE INDEX IF NOT EXISTS idx_technician_services_technician_id ON technician_services(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_photos_technician_id ON technician_photos(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_payments_technician_id ON technician_payments(technician_id);

CREATE INDEX IF NOT EXISTS idx_leads_technician_id ON leads(technician_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_reviews_technician_id ON reviews(technician_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_visible ON reviews(is_visible);

CREATE INDEX IF NOT EXISTS idx_notifications_technician_id ON notifications(technician_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Articles indexes
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_is_published ON articles(is_published);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);


-- ============================================================================
-- COMPLETE
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE 'Mekh database setup completed successfully!';
END $$;

-- =====================================================
-- Add Business Hours Table
-- Allows technicians to define their weekly operating schedule
-- =====================================================

-- Create business_hours table
CREATE TABLE IF NOT EXISTS business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0 = Sunday, 6 = Saturday
    is_open BOOLEAN DEFAULT false,
    open_time TIME,
    close_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(technician_id, day_of_week)
);

-- Enable RLS
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_hours
-- Technicians can view their own business hours
DROP POLICY IF EXISTS "Technicians can view own business hours" ON business_hours;
CREATE POLICY "Technicians can view own business hours" ON business_hours
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = business_hours.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Technicians can insert their own business hours
DROP POLICY IF EXISTS "Technicians can insert own business hours" ON business_hours;
CREATE POLICY "Technicians can insert own business hours" ON business_hours
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = business_hours.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Technicians can update their own business hours
DROP POLICY IF EXISTS "Technicians can update own business hours" ON business_hours;
CREATE POLICY "Technicians can update own business hours" ON business_hours
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = business_hours.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Technicians can delete their own business hours
DROP POLICY IF EXISTS "Technicians can delete own business hours" ON business_hours;
CREATE POLICY "Technicians can delete own business hours" ON business_hours
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = business_hours.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );

-- Admin can view all business hours
DROP POLICY IF EXISTS "Admin can view all business hours" ON business_hours;
CREATE POLICY "Admin can view all business hours" ON business_hours
    FOR SELECT USING (is_admin() = true);

-- Admin can insert business hours for any technician
DROP POLICY IF EXISTS "Admin can insert business hours" ON business_hours;
CREATE POLICY "Admin can insert business hours" ON business_hours
    FOR INSERT WITH CHECK (is_admin() = true);

-- Admin can update business hours for any technician
DROP POLICY IF EXISTS "Admin can update business hours" ON business_hours;
CREATE POLICY "Admin can update business hours" ON business_hours
    FOR UPDATE USING (is_admin() = true);

-- Admin can delete business hours for any technician
DROP POLICY IF EXISTS "Admin can delete business hours" ON business_hours;
CREATE POLICY "Admin can delete business hours" ON business_hours
    FOR DELETE USING (is_admin() = true);

-- Public can view business hours for live technicians
DROP POLICY IF EXISTS "Public can view business hours for live technicians" ON business_hours;
CREATE POLICY "Public can view business hours for live technicians" ON business_hours
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = business_hours.technician_id 
            AND technicians.status = 'live'
        )
    );

DO $$ 
BEGIN
    RAISE NOTICE 'Migration 022 completed - Business hours table created!';
END $$;
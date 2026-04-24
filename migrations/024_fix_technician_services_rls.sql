-- =====================================================
-- Fix RLS Policies for technician_services
-- Ensure technicians can only manage their own services
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "admin_full_access_technician_services" ON technician_services;
DROP POLICY IF EXISTS "public_view_services" ON technician_services;
DROP POLICY IF EXISTS "tech_manage_services" ON technician_services;

-- Admin full access
CREATE POLICY "admin_full_access_technician_services" ON technician_services
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Public can view all technician services
CREATE POLICY "public_view_services" ON technician_services
    FOR SELECT USING (true);

-- Technicians can manage their own services
CREATE POLICY "tech_manage_services" ON technician_services
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM technicians
            WHERE technicians.id = technician_services.technician_id
            AND technicians.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM technicians
            WHERE technicians.id = technician_services.technician_id
            AND technicians.user_id = auth.uid()
        )
    );

DO $$
BEGIN
    RAISE NOTICE 'Migration 024 completed - technician_services RLS policies fixed!';
END $$;
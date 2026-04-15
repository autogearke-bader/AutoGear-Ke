-- =====================================================
-- Add Service Variants Table
-- Allows technicians to define variants for their services with different pricing
-- =====================================================

-- Create service_variants table
CREATE TABLE IF NOT EXISTS service_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid REFERENCES technician_services(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  price numeric,
  is_negotiable boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE service_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_variants
-- Technicians can view their own service variants
DROP POLICY IF EXISTS "Technicians can view own service variants" ON service_variants;
CREATE POLICY "Technicians can view own service variants" ON service_variants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technician_services ts
            JOIN technicians t ON t.id = ts.technician_id
            WHERE ts.id = service_variants.service_id
            AND t.user_id = auth.uid()
        )
    );

-- Technicians can insert their own service variants
DROP POLICY IF EXISTS "Technicians can insert own service variants" ON service_variants;
CREATE POLICY "Technicians can insert own service variants" ON service_variants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM technician_services ts
            JOIN technicians t ON t.id = ts.technician_id
            WHERE ts.id = service_variants.service_id
            AND t.user_id = auth.uid()
        )
    );

-- Technicians can update their own service variants
DROP POLICY IF EXISTS "Technicians can update own service variants" ON service_variants;
CREATE POLICY "Technicians can update own service variants" ON service_variants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM technician_services ts
            JOIN technicians t ON t.id = ts.technician_id
            WHERE ts.id = service_variants.service_id
            AND t.user_id = auth.uid()
        )
    );

-- Technicians can delete their own service variants
DROP POLICY IF EXISTS "Technicians can delete own service variants" ON service_variants;
CREATE POLICY "Technicians can delete own service variants" ON service_variants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM technician_services ts
            JOIN technicians t ON t.id = ts.technician_id
            WHERE ts.id = service_variants.service_id
            AND t.user_id = auth.uid()
        )
    );

-- Admin can view all service variants
DROP POLICY IF EXISTS "Admin can view all service variants" ON service_variants;
CREATE POLICY "Admin can view all service variants" ON service_variants
    FOR SELECT USING (is_admin() = true);

-- Admin can insert service variants for any technician
DROP POLICY IF EXISTS "Admin can insert service variants" ON service_variants;
CREATE POLICY "Admin can insert service variants" ON service_variants
    FOR INSERT WITH CHECK (is_admin() = true);

-- Admin can update service variants for any technician
DROP POLICY IF EXISTS "Admin can update service variants" ON service_variants;
CREATE POLICY "Admin can update service variants" ON service_variants
    FOR UPDATE USING (is_admin() = true);

-- Admin can delete service variants for any technician
DROP POLICY IF EXISTS "Admin can delete service variants" ON service_variants;
CREATE POLICY "Admin can delete service variants" ON service_variants
    FOR DELETE USING (is_admin() = true);

-- Public can view service variants for live technicians
DROP POLICY IF EXISTS "Public can view service variants for live technicians" ON service_variants;
CREATE POLICY "Public can view service variants for live technicians" ON service_variants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM technician_services ts
            JOIN technicians t ON t.id = ts.technician_id
            WHERE ts.id = service_variants.service_id
            AND t.status = 'live'
        )
    );

DO $$
BEGIN
    RAISE NOTICE 'Migration 023 completed - Service variants table created!';
END $$;
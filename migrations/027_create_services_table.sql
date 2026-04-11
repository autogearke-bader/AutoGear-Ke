-- ============================================================================
-- Create Services Table
-- ============================================================================

-- Create services table for global service list
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view services" ON services FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert services" ON services FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Insert predefined services
INSERT INTO services (name, created_by) VALUES
('Window Tinting', NULL),
('Car Wrapping', NULL),
('PPF Installation', NULL),
('Ceramic Coating', NULL),
('Car Buffing', NULL),
('Car Detailing', NULL),
('Headlight Restoration', NULL),
('Chrome Deleting', NULL),
('Rim Customization', NULL),
('Headlight Tinting', NULL),
('Car Tuning', NULL),
('FaceLifting', NULL),
('Car Riveting', NULL),
('Car Identity', NULL),
('Chrome Plate Installation', NULL),
('Tailight Smoking', NULL),
('License plate Installation', NULL)
ON CONFLICT (name) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
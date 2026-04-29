-- Add category column to technician_services table
ALTER TABLE technician_services
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
  'body_exterior',
  'car_electricals_security',
  'mechanical_repair',
  'interior_detailing'
));

-- Make category required for new services (existing ones will be updated separately)
-- We'll update existing services to have categories based on their service names
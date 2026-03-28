-- Make county column optional in technicians table
-- County is no longer required for technician profiles

ALTER TABLE technicians
ALTER COLUMN county DROP NOT NULL;

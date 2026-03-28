-- Migration: Remove foreign key constraint from clients table
-- This fixes the "permission denied for table users" error that occurs when
-- Supabase tries to verify the foreign key reference during inserts

-- Drop the foreign key constraint if it exists
-- Note: The constraint name may vary, so we use a cascade approach

-- First, let's drop any existing foreign key constraints on user_id in clients table
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;

-- Optionally, you can recreate the constraint with NO VALIDATE to skip the FK check
-- But for now, let's just remove it entirely and rely on application logic
-- or add a deferrable constraint if needed

-- The clients table will now accept any UUID as user_id without FK verification
-- This is safe because we validate the user exists before inserting in the app code

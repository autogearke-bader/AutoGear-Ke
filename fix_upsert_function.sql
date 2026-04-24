-- Drop the existing function with wrong parameter order
DROP FUNCTION IF EXISTS upsert_client_profile(UUID, TEXT, TEXT, TEXT);

-- Create the function with parameters in correct order (required params first, optional last)
CREATE OR REPLACE FUNCTION upsert_client_profile(
    p_name TEXT,
    p_phone TEXT,
    p_user_id UUID,
    p_email TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO clients (user_id, name, phone, email)
    VALUES (p_user_id, p_name, p_phone, p_email)
    ON CONFLICT (user_id)
    DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = COALESCE(EXCLUDED.email, clients.email),
        updated_at = NOW();
END;
$$;
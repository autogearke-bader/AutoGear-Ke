-- Create active_sessions table to track real-time active users
CREATE TABLE IF NOT EXISTS active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    page_url TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen ON active_sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);

-- Enable RLS
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own session
CREATE POLICY "Users can manage own session" ON active_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Admins can view all sessions
CREATE POLICY "Admins can view all sessions" ON active_sessions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.technicians WHERE user_id = auth.uid() AND status = 'live')
    );

-- Function to get active users count in last 5 minutes
CREATE OR REPLACE FUNCTION get_active_users_count()
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT user_id)
    INTO active_count
    FROM active_sessions
    WHERE last_seen > NOW() - INTERVAL '5 minutes';
    
    RETURN COALESCE(active_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert user session (called from frontend)
CREATE OR REPLACE FUNCTION update_user_session(
    p_user_id UUID,
    p_page_url TEXT DEFAULT '/'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO active_sessions (user_id, page_url, last_seen)
    VALUES (p_user_id, p_page_url, NOW())
    ON CONFLICT (id) DO UPDATE SET
        page_url = EXCLUDED.page_url,
        last_seen = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

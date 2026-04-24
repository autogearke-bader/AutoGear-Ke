-- ============================================================================
-- Migration 037: Add client update policy for hiding leads
-- ============================================================================

-- Add a policy that allows clients to hide their own completed leads from view
CREATE POLICY "clients_hide_own_leads" ON leads
    FOR UPDATE USING (
        client_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
        )
        AND status = 'job_done'
        AND hidden_from_client = false
    )
    WITH CHECK (
        client_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
        )
        AND status = 'job_done'
        AND hidden_from_client = true
    );

-- ============================================================================
-- Complete
-- ============================================================================
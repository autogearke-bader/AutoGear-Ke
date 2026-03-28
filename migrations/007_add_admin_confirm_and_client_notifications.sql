-- Migration 007: Add admin confirmation for job done and client notifications support
-- Run this SQL in your Supabase SQL Editor

-- Add admin_confirmed_job_done to leads table to track if admin confirmed job as done
ALTER TABLE leads ADD COLUMN IF NOT EXISTS admin_confirmed_job_done BOOLEAN DEFAULT false;

-- Add client_id to notifications table so we can send notifications to clients
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Create index for client notifications
CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON notifications(client_id);

-- Update notification type to include review_request
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('new_lead', 'new_review', 'profile_approved', 'profile_rejected', 'subscription_reminder', 'review_request'));

-- Add review_requested field to leads to track if review notification was already sent
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_notification_sent BOOLEAN DEFAULT false;

-- Create index for lead client and status
CREATE INDEX IF NOT EXISTS idx_leads_client_id_status ON leads(client_id, status);

-- Add is_archived column to leads table
ALTER TABLE leads ADD COLUMN is_archived boolean DEFAULT false;

-- Update existing statuses
UPDATE leads SET status = 'not_converted' WHERE status = 'no_response';
UPDATE leads SET status = 'pending' WHERE status = 'contacted';

-- Archive existing job_done leads
UPDATE leads SET is_archived = true WHERE status = 'job_done';
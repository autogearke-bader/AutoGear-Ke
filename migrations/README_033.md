# Migration 033: Automatic Booking Cleanup

## Overview
This migration adds automatic booking cleanup functionality to hide old bookings from client view after 2 days.

## What's Included

### Database Changes
1. **New Column**: `hidden_from_client` (boolean) added to `leads` table
2. **New Function**: `cleanup_old_bookings()` - Database function to perform cleanup
3. **Updated RLS Policy**: Modified to exclude hidden bookings from client view
4. **New Indexes**: Added for efficient cleanup queries

### Application Changes
1. **API Function**: `cleanupOldBookings()` in `api.ts` to trigger cleanup
2. **Updated Query**: `getMyClientLeads()` now filters out hidden bookings
3. **Automatic Trigger**: Cleanup runs when BookingsPage loads

## How to Apply Migration

Run the SQL file in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of 033_add_booking_cleanup_function.sql
```

## How It Works

### Automatic Cleanup
- Runs when a client visits their bookings page
- Hides bookings older than 2 days with status:
  - `job_done`
  - `contacted`
  - `pending`

### Soft Delete Approach
- Bookings are not deleted from the database
- They are marked as `hidden_from_client = true`
- Technicians can still see all bookings
- Preserves data for analytics and reporting

## Testing

### Manual Test
1. Create a test booking with status `job_done` or `contacted`
2. Manually update its `created_at` to be older than 2 days:
   ```sql
   UPDATE leads 
   SET created_at = NOW() - INTERVAL '3 days'
   WHERE id = 'your-test-booking-id';
   ```
3. Visit the bookings page as a client
4. The old booking should be automatically hidden

### Verify Cleanup Function
```sql
-- Run the cleanup function manually
SELECT * FROM cleanup_old_bookings();

-- Check which bookings were hidden
SELECT id, status, created_at, hidden_from_client 
FROM leads 
WHERE hidden_from_client = true;
```

## Rollback

If you need to rollback this migration:

```sql
-- Restore hidden bookings
UPDATE leads SET hidden_from_client = false WHERE hidden_from_client = true;

-- Drop the function
DROP FUNCTION IF EXISTS cleanup_old_bookings();

-- Remove the column
ALTER TABLE leads DROP COLUMN IF EXISTS hidden_from_client;

-- Restore original RLS policy
DROP POLICY IF EXISTS "Clients can view own non-hidden leads" ON leads;
CREATE POLICY "Clients can view own leads" ON leads
    FOR SELECT USING (
        client_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM technicians 
            WHERE technicians.id = leads.technician_id 
            AND technicians.user_id = auth.uid()
        )
    );
```

## Notes

- The cleanup is non-destructive (soft delete)
- Technicians retain access to all bookings
- The cleanup runs client-side when the page loads
- For production, consider adding a server-side cron job for more reliable cleanup

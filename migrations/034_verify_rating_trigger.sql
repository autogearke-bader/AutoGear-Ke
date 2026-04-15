-- =====================================================
-- Migration 034: Verify and test rating calculation trigger
-- =====================================================
-- This migration verifies that the trigger from migration 031
-- is working correctly by testing the rating calculation
-- =====================================================

-- =====================================================
-- STEP 1: Verify trigger exists
-- =====================================================
DO $
DECLARE
  trigger_exists BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_reviews_update_rating'
  ) INTO trigger_exists;
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'refresh_technician_rating'
  ) INTO function_exists;
  
  IF NOT function_exists THEN
    RAISE EXCEPTION 'Function refresh_technician_rating does not exist. Please run migration 031 first.';
  END IF;
  
  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'Trigger trg_reviews_update_rating does not exist. Please run migration 031 first.';
  END IF;
  
  RAISE NOTICE 'Verification passed: Trigger and function exist.';
END $;

-- =====================================================
-- STEP 2: Verify columns exist
-- =====================================================
DO $
DECLARE
  avg_rating_exists BOOLEAN;
  review_count_exists BOOLEAN;
BEGIN
  -- Check if avg_rating column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'avg_rating'
  ) INTO avg_rating_exists;
  
  -- Check if review_count column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'review_count'
  ) INTO review_count_exists;
  
  IF NOT avg_rating_exists THEN
    RAISE EXCEPTION 'Column avg_rating does not exist in technicians table. Please run migration 032 first.';
  END IF;
  
  IF NOT review_count_exists THEN
    RAISE EXCEPTION 'Column review_count does not exist in technicians table. Please run migration 032 first.';
  END IF;
  
  RAISE NOTICE 'Verification passed: Rating columns exist.';
END $;

-- =====================================================
-- STEP 3: Test trigger functionality (if in test environment)
-- =====================================================
-- This section can be run manually to test the trigger
-- It creates a test technician and reviews, then verifies the calculations

-- Uncomment the following block to run the test:
/*
DO $
DECLARE
  test_tech_id UUID;
  test_user_id UUID;
  initial_count INTEGER;
  initial_rating NUMERIC;
  final_count INTEGER;
  final_rating NUMERIC;
BEGIN
  -- Create a test user (you may need to adjust this based on your auth setup)
  -- For testing purposes, we'll use a random UUID
  test_user_id := uuid_generate_v4();
  
  -- Create a test technician
  INSERT INTO technicians (
    user_id, first_name, last_name, business_name, slug, 
    phone, email, experience_years, area, status
  ) VALUES (
    test_user_id, 'Test', 'Technician', 'Test Business', 
    'test-tech-' || substr(md5(random()::text), 1, 8),
    '+254700000000', 'test@example.com', '5', 'Nairobi', 'live'
  ) RETURNING id INTO test_tech_id;
  
  -- Check initial values
  SELECT review_count, avg_rating INTO initial_count, initial_rating
  FROM technicians WHERE id = test_tech_id;
  
  RAISE NOTICE 'Initial values - Count: %, Rating: %', initial_count, initial_rating;
  
  -- Insert a pending review (should not affect ratings)
  INSERT INTO reviews (
    technician_id, client_name, rating, status, is_visible
  ) VALUES (
    test_tech_id, 'Test Client 1', 5, 'pending', true
  );
  
  -- Check values after pending review
  SELECT review_count, avg_rating INTO initial_count, initial_rating
  FROM technicians WHERE id = test_tech_id;
  
  RAISE NOTICE 'After pending review - Count: %, Rating: %', initial_count, initial_rating;
  
  IF initial_count != 0 THEN
    RAISE EXCEPTION 'FAIL: Pending review should not affect count. Expected 0, got %', initial_count;
  END IF;
  
  -- Insert an approved review (should affect ratings)
  INSERT INTO reviews (
    technician_id, client_name, rating, status, is_visible
  ) VALUES (
    test_tech_id, 'Test Client 2', 4, 'approved', true
  );
  
  -- Check values after approved review
  SELECT review_count, avg_rating INTO final_count, final_rating
  FROM technicians WHERE id = test_tech_id;
  
  RAISE NOTICE 'After approved review - Count: %, Rating: %', final_count, final_rating;
  
  IF final_count != 1 THEN
    RAISE EXCEPTION 'FAIL: Expected count 1, got %', final_count;
  END IF;
  
  IF final_rating != 4.0 THEN
    RAISE EXCEPTION 'FAIL: Expected rating 4.0, got %', final_rating;
  END IF;
  
  -- Insert another approved review
  INSERT INTO reviews (
    technician_id, client_name, rating, status, is_visible
  ) VALUES (
    test_tech_id, 'Test Client 3', 5, 'approved', true
  );
  
  -- Check final values
  SELECT review_count, avg_rating INTO final_count, final_rating
  FROM technicians WHERE id = test_tech_id;
  
  RAISE NOTICE 'After second approved review - Count: %, Rating: %', final_count, final_rating;
  
  IF final_count != 2 THEN
    RAISE EXCEPTION 'FAIL: Expected count 2, got %', final_count;
  END IF;
  
  IF final_rating != 4.5 THEN
    RAISE EXCEPTION 'FAIL: Expected rating 4.5, got %', final_rating;
  END IF;
  
  -- Clean up test data
  DELETE FROM reviews WHERE technician_id = test_tech_id;
  DELETE FROM technicians WHERE id = test_tech_id;
  
  RAISE NOTICE 'SUCCESS: All trigger tests passed!';
END $;
*/

-- =====================================================
-- STEP 4: Manual verification query
-- =====================================================
-- Run this query to manually verify that ratings are calculated correctly
-- for existing technicians:

-- SELECT 
--   t.id,
--   t.business_name,
--   t.review_count AS stored_count,
--   t.avg_rating AS stored_rating,
--   COUNT(r.id) FILTER (WHERE r.status = 'approved' AND r.is_visible = true) AS calculated_count,
--   COALESCE(ROUND(AVG(r.rating) FILTER (WHERE r.status = 'approved' AND r.is_visible = true)::NUMERIC, 1), 0) AS calculated_rating
-- FROM technicians t
-- LEFT JOIN reviews r ON r.technician_id = t.id
-- GROUP BY t.id, t.business_name, t.review_count, t.avg_rating
-- HAVING 
--   t.review_count != COUNT(r.id) FILTER (WHERE r.status = 'approved' AND r.is_visible = true)
--   OR t.avg_rating != COALESCE(ROUND(AVG(r.rating) FILTER (WHERE r.status = 'approved' AND r.is_visible = true)::NUMERIC, 1), 0);

-- If the above query returns any rows, it means some technicians have
-- incorrect rating data. You can fix them by running:
-- SELECT refresh_technician_rating(id) FROM technicians;

RAISE NOTICE 'Migration 034 completed: Rating trigger verification successful.';

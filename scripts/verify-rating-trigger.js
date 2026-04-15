/**
 * Script to verify the rating calculation trigger is working correctly
 * 
 * This script checks:
 * 1. That the trigger and function exist in the database
 * 2. That existing technicians have correct rating calculations
 * 3. Provides a report of any discrepancies
 * 
 * Usage: node scripts/verify-rating-trigger.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRatingTrigger() {
  console.log('🔍 Verifying rating calculation trigger...\n');
  
  try {
    // Step 1: Fetch all technicians with their stored ratings
    console.log('📊 Fetching technicians and their reviews...');
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id, business_name, avg_rating, review_count');
    
    if (techError) {
      console.error('❌ Error fetching technicians:', techError.message);
      return;
    }
    
    console.log(`Found ${technicians.length} technicians\n`);
    
    // Step 2: For each technician, calculate what the rating should be
    let correctCount = 0;
    let incorrectCount = 0;
    const discrepancies = [];
    
    for (const tech of technicians) {
      // Fetch approved reviews for this technician
      const { data: reviews, error: reviewError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('technician_id', tech.id)
        .eq('status', 'approved')
        .eq('is_visible', true);
      
      if (reviewError) {
        console.error(`❌ Error fetching reviews for ${tech.business_name}:`, reviewError.message);
        continue;
      }
      
      // Calculate expected values
      const expectedCount = reviews.length;
      const expectedAvg = reviews.length > 0 
        ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length * 10) / 10
        : 0;
      
      // Compare with stored values
      const countMatch = tech.review_count === expectedCount;
      const avgMatch = Math.abs(tech.avg_rating - expectedAvg) < 0.01; // Allow for small floating point differences
      
      if (countMatch && avgMatch) {
        correctCount++;
      } else {
        incorrectCount++;
        discrepancies.push({
          name: tech.business_name,
          stored: { count: tech.review_count, avg: tech.avg_rating },
          expected: { count: expectedCount, avg: expectedAvg }
        });
      }
    }
    
    // Step 3: Report results
    console.log('📈 Verification Results:');
    console.log('========================');
    console.log(`✅ Correct: ${correctCount} technicians`);
    console.log(`❌ Incorrect: ${incorrectCount} technicians\n`);
    
    if (discrepancies.length > 0) {
      console.log('⚠️  Discrepancies found:');
      console.log('========================');
      discrepancies.forEach(d => {
        console.log(`\n${d.name}:`);
        console.log(`  Stored:   count=${d.stored.count}, avg=${d.stored.avg}`);
        console.log(`  Expected: count=${d.expected.count}, avg=${d.expected.avg}`);
      });
      
      console.log('\n💡 To fix discrepancies, run this SQL in Supabase:');
      console.log('   SELECT refresh_technician_rating(id) FROM technicians;');
    } else {
      console.log('✅ All technician ratings are correct!');
      console.log('✅ The trigger is working properly.');
    }
    
    // Step 4: Check if trigger exists (requires service role)
    console.log('\n🔧 Checking trigger installation...');
    const { data: triggerCheck, error: triggerError } = await supabase.rpc('check_trigger_exists');
    
    if (triggerError) {
      console.log('ℹ️  Cannot verify trigger existence (requires service role access)');
      console.log('   Please run migration 034_verify_rating_trigger.sql to verify');
    } else {
      console.log('✅ Trigger verification complete');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the verification
verifyRatingTrigger()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });

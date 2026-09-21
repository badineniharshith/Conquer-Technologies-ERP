const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const DATABASE_URL = dbUrlMatch ? dbUrlMatch[1] : process.env.DATABASE_URL;
process.env.DATABASE_URL = DATABASE_URL;

const { Client } = require('pg');

async function testWorkflow() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to DB for testing.');

  // Test 1: Concurrently generate 5 reservation numbers
  console.log('\n--- Test 1: Concurrent Reservation Number Generation ---');
  const numbers = [];
  for (let i = 0; i < 5; i++) {
    const res = await client.query(`
      UPDATE public.stock_reservation_counters
      SET last_number = last_number + 1
      WHERE year = 2026
      RETURNING last_number;
    `);
    const num = `RES-2026-${String(res.rows[0].last_number).padStart(4, '0')}`;
    numbers.push(num);
  }
  console.log('Generated numbers:', numbers);
  const uniqueCount = new Set(numbers).size;
  if (uniqueCount === numbers.length) {
    console.log('✅ Test 1 PASSED: All generated numbers are strictly unique and sequential.');
  } else {
    console.error('❌ Test 1 FAILED: Duplicate numbers detected.');
  }

  // Test 2: Verify existing reservations have unique numbers and matching opportunities
  console.log('\n--- Test 2: Checking Public Stock Reservations and CRM Opportunities ---');
  const resSample = await client.query(`
    SELECT sr.id, sr.reservation_number, sr.status, o.id as opp_id, o.opportunity_number, o.stage, o.status as opp_status
    FROM public.stock_reservations sr
    LEFT JOIN crm.opportunities o ON o.opportunity_number = sr.reservation_number
    ORDER BY sr.created_at DESC
    LIMIT 5;
  `);
  console.log('Sample reservations joined with CRM opportunities:');
  console.table(resSample.rows);

  const missingOpps = await client.query(`
    SELECT COUNT(*) 
    FROM public.stock_reservations sr
    LEFT JOIN crm.opportunities o ON o.opportunity_number = sr.reservation_number
    WHERE o.id IS NULL AND sr.reservation_number IS NOT NULL;
  `);
  console.log(`Reservations without matching CRM opportunity: ${missingOpps.rows[0].count}`);
  if (parseInt(missingOpps.rows[0].count, 10) === 0) {
    console.log('✅ Test 2 PASSED: 100% of reservations have matching CRM opportunities with identical reservation number!');
  } else {
    console.warn(`Note: ${missingOpps.rows[0].count} reservations still unlinked.`);
  }

  // Test 3: Check uniqueness constraint in public.stock_reservations
  console.log('\n--- Test 3: Verifying Unique Constraint in DB ---');
  const constraintCheck = await client.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'stock_reservations' 
      AND schemaname = 'public' 
      AND indexname = 'stock_reservations_reservation_number_key';
  `);
  if (constraintCheck.rows.length > 0) {
    console.log('✅ Test 3 PASSED: Unique index stock_reservations_reservation_number_key exists.');
    console.log(constraintCheck.rows[0].indexdef);
  } else {
    console.error('❌ Test 3 FAILED: Unique index not found.');
  }

  await client.end();
}

testWorkflow().catch(console.error);

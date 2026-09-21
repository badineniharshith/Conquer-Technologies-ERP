const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const DATABASE_URL = dbUrlMatch ? dbUrlMatch[1] : process.env.DATABASE_URL;
process.env.DATABASE_URL = DATABASE_URL;

const { Client } = require('pg');

async function testEndToEnd() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('--- Testing End-to-End Stock Reservation & CRM Sync ---');

  // Find an active customer and product in DB
  const custRes = await client.query('SELECT id, company_name, crm_customer_id FROM public.customers LIMIT 1;');
  const prodRes = await client.query('SELECT id, sku, price FROM public.products WHERE price > 0 LIMIT 1;');

  const customer = custRes.rows[0];
  const product = prodRes.rows[0];
  console.log(`Using Customer: ${customer.company_name} (${customer.id}), Product: ${product.sku}`);

  // 1. Get next reservation number
  const counterRes = await client.query(`
    UPDATE public.stock_reservation_counters
    SET last_number = last_number + 1
    WHERE year = 2026
    RETURNING last_number;
  `);
  const resNumber = `RES-2026-${String(counterRes.rows[0].last_number).padStart(4, '0')}`;
  console.log(`Generated Unique Reservation Number: ${resNumber}`);

  // 2. Insert into public.stock_reservations
  const erpRes = await client.query(`
    INSERT INTO public.stock_reservations (
      id, reservation_number, customer_id, product_id, sku, branch_code, quantity, status, notes, project, reserved_at, expires_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, 'HYD-HQ', 2, 'Pending Verification', 'E2E Test Reservation for CRM Opportunities', 'Test IT Deal', NOW(), NOW() + interval '14 days', NOW(), NOW()
    ) RETURNING id, reservation_number;
  `, [resNumber, customer.id, product.id, product.sku]);

  const newRes = erpRes.rows[0];
  console.log(`Created ERP Reservation: ID ${newRes.id}, Number: ${newRes.reservation_number}`);

  // 3. Insert reservation item
  await client.query(`
    INSERT INTO public.stock_reservation_items (
      id, reservation_id, product_id, sku, quantity, unit_price, status, reserved_qty, shortage_qty, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, 2, $4, 'Reserved', 2, 0, NOW()
    );
  `, [newRes.id, product.id, product.sku, product.price]);

  // 4. Trigger CRM sync logic
  const { syncStockReservationToCrm } = require('../src/lib/stock-reservation-service');
  await syncStockReservationToCrm(newRes.id);

  // 5. Verify record in crm.stock_reservations
  const crmResCheck = await client.query(`
    SELECT id, reservation_number, status, opportunity_id, quantity, notes
    FROM crm.stock_reservations
    WHERE reservation_number = $1;
  `, [resNumber]);
  console.log('CRM Stock Reservation record:');
  console.table(crmResCheck.rows);

  // 6. Verify record in crm.opportunities
  const crmOppCheck = await client.query(`
    SELECT id, opportunity_number, title, status, stage, probability, value, "expectedRevenue", reservation_id
    FROM crm.opportunities
    WHERE opportunity_number = $1;
  `, [resNumber]);
  console.log('CRM Opportunity record:');
  console.table(crmOppCheck.rows);

  if (crmOppCheck.rows.length > 0 && crmOppCheck.rows[0].opportunity_number === resNumber) {
    console.log('🎉 SUCCESS: CRM Opportunity is created with opportunity_number matching reservation_number exactly!');
  } else {
    console.error('❌ FAILURE: Opportunity not found with matching number.');
  }

  // 7. Clean up test reservation
  await client.query('DELETE FROM public.stock_reservation_items WHERE reservation_id = $1;', [newRes.id]);
  await client.query('DELETE FROM public.stock_reservations WHERE id = $1;', [newRes.id]);
  await client.query('DELETE FROM crm.opportunities WHERE opportunity_number = $1;', [resNumber]);
  await client.query('DELETE FROM crm.stock_reservations WHERE reservation_number = $1;', [resNumber]);
  console.log('Cleaned up test reservation and CRM opportunity records.');

  await client.end();
}

testEndToEnd().catch(console.error);

const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const DATABASE_URL = dbUrlMatch ? dbUrlMatch[1] : process.env.DATABASE_URL;
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('--- Stock Reservations ---');
  const res = await client.query(`
    SELECT id, reservation_number, status, branch_code, created_at, reserved_at
    FROM public.stock_reservations
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  console.log(res.rows);

  const resCount = await client.query(`SELECT COUNT(*) FROM public.stock_reservations;`);
  console.log('Total stock_reservations:', resCount.rows[0].count);

  console.log('\n--- Checking tables with opportunities ---');
  const tables = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name ILIKE '%opportunit%';
  `);
  console.log('Tables matching opportunit:', tables.rows);

  console.log('\n--- Checking crm.stock_reservations columns ---');
  const crmResCols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'stock_reservations';
  `);
  console.log(crmResCols.rows.map(c => c.column_name).join(', '));

  console.log('\n--- Sample crm.stock_reservations ---');
  const crmResSample = await client.query(`
    SELECT * FROM crm.stock_reservations LIMIT 5;
  `);
  console.log(crmResSample.rows);

  console.log('\n--- Checking constraints and indexes on stock_reservations ---');
  const indexes = await client.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'stock_reservations' AND schemaname = 'public';
  `);
  console.log('\n--- Checking crm.customers columns ---');
  const crmCustCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'crm' AND table_name = 'customers';
  `);
  console.log('crm.customers columns:', crmCustCols.rows.map(c => c.column_name).join(', '));

  const crmMinMax = await client.query(`
    SELECT MIN(id), MAX(id), COUNT(*) FROM crm.customers;
  `);
  console.log('crm.customers id stats:', crmMinMax.rows);

  const matchedCusts = await client.query(`
    SELECT c.id, c.crm_customer_id, c.company_name, cc.id as crm_id, cc.name as crm_name
    FROM public.customers c
    LEFT JOIN crm.customers cc ON cc.id = c.crm_customer_id
    WHERE c.crm_customer_id IS NOT NULL
    LIMIT 5;
  `);
  console.log('Matched customers:', matchedCusts.rows);

  const nameMatchedCusts = await client.query(`
    SELECT c.id, c.company_name, cc.id as crm_id, cc.name as crm_name
    FROM public.customers c
    JOIN crm.customers cc ON LOWER(TRIM(cc.name)) = LOWER(TRIM(c.company_name))
    LIMIT 5;
  `);
  console.log('Name matched customers:', nameMatchedCusts.rows);

  console.log('\n--- public.stock_reservations column details ---');
  const resColDetails = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_reservations'
      AND column_name IN ('id', 'reservation_number', 'customer_id', 'employee_id', 'status', 'reserved_at', 'expires_at', 'branch_code');
  `);
  console.log(resColDetails.rows);

  const resNumberOppSample = await client.query(`
    SELECT id, opportunity_number, title, reservation_id
    FROM crm.opportunities
    WHERE opportunity_number ILIKE 'RES-%' OR opportunity_number ILIKE 'SR-%'
    LIMIT 5;
  `);
  console.log('Opportunities with RES/SR number:', resNumberOppSample.rows);

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  console.log('has prisma.opportunity?', !!prisma.opportunity);
  console.log('has prisma.stockReservation?', !!prisma.stockReservation);
  await prisma.$disconnect();

  await client.end();
}

run().catch(console.error);

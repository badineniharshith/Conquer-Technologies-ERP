const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

let dbUrl = 'postgresql://postgres:postgres@localhost:5432/conquer_local_db';
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) dbUrl = match[1];
} catch (e) {}

async function executeSql() {
  console.log('Connecting to:', dbUrl);
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const sqlPath = path.join(process.cwd(), 'scratch_import.sql');
  console.log('Reading scratch_import.sql...');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executing SQL statements in PostgreSQL...');
  try {
    await client.query(sqlContent);
    console.log('✅ SQL script executed successfully!');
  } catch (err) {
    console.error('SQL Execution error:', err.message);
  }

  // Count imported rows
  const counts = await Promise.all([
    client.query('SELECT COUNT(*) FROM public.users;'),
    client.query('SELECT COUNT(*) FROM public.customers;'),
    client.query('SELECT COUNT(*) FROM public.products;'),
    client.query('SELECT COUNT(*) FROM public.inventories;'),
    client.query('SELECT COUNT(*) FROM public.purchase_orders;'),
    client.query('SELECT COUNT(*) FROM public.stock_reservations;')
  ]);

  console.log('\n==================================================');
  console.log('FINAL DATABASE TABLE ROW COUNTS:');
  console.log('==================================================');
  console.log(`- public.users             : ${counts[0].rows[0].count}`);
  console.log(`- public.customers         : ${counts[1].rows[0].count}`);
  console.log(`- public.products          : ${counts[2].rows[0].count}`);
  console.log(`- public.inventories       : ${counts[3].rows[0].count}`);
  console.log(`- public.purchase_orders   : ${counts[4].rows[0].count}`);
  console.log(`- public.stock_reservations: ${counts[5].rows[0].count}`);
  console.log('==================================================\n');

  await client.end();
}

executeSql();

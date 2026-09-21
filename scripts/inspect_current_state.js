const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const invRes = await client.query(`
    SELECT sku, branch_code, quantity, available_qty, available_stock, reserved_qty 
    FROM public.inventories 
    WHERE sku IN ('MACBOOK-PRO-16', 'IPAD-PRO-M4-01');
  `);
  console.log('Inventories:', invRes.rows);

  const prodRes = await client.query(`
    SELECT id, sku, name FROM public.products WHERE sku IN ('MACBOOK-PRO-16', 'IPAD-PRO-M4-01');
  `);
  console.log('Products in public:', prodRes.rows);

  const crmProdRes = await client.query(`
    SELECT id, sku, name FROM crm.products WHERE sku IN ('MACBOOK-PRO-16', 'IPAD-PRO-M4-01');
  `);
  console.log('Products in crm:', crmProdRes.rows);

  await client.end();
}

run().catch(console.error);

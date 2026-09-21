// @ts-nocheck
import { Client } from 'pg';
import path from 'path';
import fs from 'fs';

const envPath = path.join(process.cwd(), '.env');
const lines = fs.readFileSync(envPath, 'utf8').split('\n');
for (const line of lines) {
  const eq = line.indexOf('=');
  if (eq > 0) {
    const k = line.substring(0, eq).trim();
    let v = line.substring(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function removeTestPOs() {
  await client.connect();

  console.log("Finding all test POs...");

  // Match test POs: po_number with TEST, CPO-TC, po-test, etc.
  const testPos = (await client.query(`
    SELECT id, po_number, customer_name, created_at 
    FROM public.purchase_orders
    WHERE po_number ILIKE '%TEST%' 
       OR po_number ILIKE 'CPO-TC%'
       OR id ILIKE '%test%'
    ORDER BY created_at DESC;
  `)).rows;

  console.log(`Found ${testPos.length} test Purchase Orders to delete:`);
  for (const p of testPos) {
    console.log(`  - ${p.id} | ${p.po_number} | ${p.customer_name}`);
  }

  if (testPos.length === 0) {
    console.log("No test POs found to remove.");
    await client.end();
    return;
  }

  const testIds = testPos.map(p => p.id);
  const testPoNumbers = testPos.map(p => p.po_number);

  console.log("\nDeleting related records and test POs...");

  // 1. Delete purchase_order_stock_allocations
  const allocDel = await client.query(`
    DELETE FROM public.purchase_order_stock_allocations 
    WHERE purchase_order_id = ANY($1::text[]);
  `, [testIds]);
  console.log(`Deleted ${allocDel.rowCount} stock allocations.`);

  // 2. Delete purchase_order_status_history
  const histDel = await client.query(`
    DELETE FROM public.purchase_order_status_history 
    WHERE purchase_order_id = ANY($1::text[]);
  `, [testIds]);
  console.log(`Deleted ${histDel.rowCount} status history rows.`);

  // 3. Delete purchase_order_items
  const itemsDel = await client.query(`
    DELETE FROM public.purchase_order_items 
    WHERE purchase_order_id = ANY($1::text[]);
  `, [testIds]);
  console.log(`Deleted ${itemsDel.rowCount} PO line items.`);

  // 4. Delete opportunities created from test POs
  try {
    const oppDel = await client.query(`
      DELETE FROM public.opportunities 
      WHERE purchase_order_id = ANY($1::text[]);
    `, [testIds]);
    console.log(`Deleted ${oppDel.rowCount} opportunities.`);
  } catch (e) {
    console.log("No opportunities to delete or error:", e.message);
  }

  // 5. Delete stock_reservations created from test POs
  try {
    const resDel = await client.query(`
      DELETE FROM public.stock_reservations 
      WHERE purchase_order_id = ANY($1::text[]);
    `, [testIds]);
    console.log(`Deleted ${resDel.rowCount} reservations.`);
  } catch (e) {
    console.log("No reservations to delete or error:", e.message);
  }

  // 6. Delete test POs from public.purchase_orders
  const poDel = await client.query(`
    DELETE FROM public.purchase_orders 
    WHERE id = ANY($1::text[]);
  `, [testIds]);
  console.log(`Deleted ${poDel.rowCount} purchase orders from public.purchase_orders.`);

  // 7. Delete test products or test stock adjustments if any left
  try {
    const adjDel = await client.query(`
      DELETE FROM public.stock_adjustments 
      WHERE sku ILIKE 'TEST-%' OR reference_id = ANY($1::text[]);
    `, [testIds]);
    console.log(`Deleted ${adjDel.rowCount} test stock adjustments.`);

    const invDel = await client.query(`DELETE FROM public.inventories WHERE sku ILIKE 'TEST-%';`);
    console.log(`Deleted ${invDel.rowCount} test inventories.`);

    const prodDel = await client.query(`DELETE FROM public.products WHERE sku ILIKE 'TEST-%';`);
    console.log(`Deleted ${prodDel.rowCount} test products.`);
  } catch (e) {
    console.warn("Product cleanup notice:", e.message);
  }

  // 8. Reconcile allocated_qty on inventories to ensure no orphan allocations
  console.log("\nReconciling inventory allocated_qty with remaining active PO allocations...");
  await client.query(`
    UPDATE public.inventories inv
    SET allocated_qty = COALESCE(alloc.total_alloc, 0),
        available_qty = GREATEST(0, inv.quantity - COALESCE(alloc.total_alloc, 0) - COALESCE(inv.reserved_qty, 0)),
        available_stock = GREATEST(0, inv.quantity - COALESCE(alloc.total_alloc, 0) - COALESCE(inv.reserved_qty, 0))
    FROM (
      SELECT sku, branch_code, SUM(allocated_quantity) as total_alloc
      FROM public.purchase_order_stock_allocations
      GROUP BY sku, branch_code
    ) alloc
    WHERE inv.sku = alloc.sku AND (inv.branch_code = alloc.branch_code OR inv.branch_id = alloc.branch_code);
  `);
  console.log("Inventory allocated_qty reconciled successfully.");

  // Check remaining PO count
  const remainingPos = (await client.query('SELECT COUNT(*) FROM public.purchase_orders;')).rows[0].count;
  console.log(`\nRemaining production Purchase Orders in database: ${remainingPos}`);

  await client.end();
}

removeTestPOs();

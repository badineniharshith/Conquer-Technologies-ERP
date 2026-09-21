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

import { verifyPurchaseOrderAction, approvePurchaseOrderAction } from '../src/app/actions';

async function testVerifyAndApproveNoStock() {
  console.log('=== TESTING VERIFY & APPROVE WHEN STOCK IS NOT AVAILABLE ===\n');

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const timestamp = Date.now();
  const testPoId = `temp-test-no-stock-${timestamp}`;
  const testPoNumber = `TEMP-NO-STOCK-${timestamp}`;
  const branchCode = 'HYD-HQ';
  const outOfStockSku = `OUT-OF-STOCK-SKU-${timestamp}`;

  try {
    // 1. Insert product and inventory with 0 stock
    await client.query(`
      INSERT INTO public.products (id, sku, name, brand, status, created_at, updated_at)
      VALUES ($1, $2, 'Zero Stock Product', 'Conquer', 'ACTIVE', NOW(), NOW());
    `, [crypto.randomUUID(), outOfStockSku]);

    await client.query(`
      INSERT INTO public.inventories (id, sku, branch_code, quantity, available_qty, available_stock, reserved_qty, allocated_qty, created_at, updated_at)
      VALUES ($1, $2, $3, 0, 0, 0, 0, 0, NOW(), NOW());
    `, [crypto.randomUUID(), outOfStockSku, branchCode]);

    // 2. Insert PO with 0 available stock (100 requested)
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, po_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Zero Stock Customer', 50000, 'PENDING STOCK', 'Pending', 'Pending Approval', 'PENDING', $3, $4, NOW(), NOW());
    `, [testPoId, testPoNumber, branchCode, JSON.stringify([{ sku: outOfStockSku, quantity: 100, unitPrice: 500 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, allocated_quantity, remaining_quantity, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Zero Stock Product', 100, 500, 50000, 'Pending', 0, 100, NOW(), NOW());
    `, [crypto.randomUUID(), testPoId, testPoNumber, outOfStockSku]);

    console.log('1. PO created with 0 available stock (Requested = 100, Available = 0)');

    // 3. Test Verify button action
    console.log('2. Triggering verifyPurchaseOrderAction...');
    const verifyRes = await verifyPurchaseOrderAction(testPoId);
    console.log('   Verify result:', verifyRes);
    if (verifyRes.error) {
      throw new Error(`Verify failed: ${verifyRes.error}`);
    }

    const verifiedDb = (await client.query('SELECT verification_status, approval_status, stock_status FROM public.purchase_orders WHERE id = $1', [testPoId])).rows[0];
    console.log(`   DB State after verify: verification_status = ${verifiedDb.verification_status}, stock_status = ${verifiedDb.stock_status}`);
    if (verifiedDb.verification_status !== 'Verified') {
      throw new Error(`Expected verification_status = 'Verified', got '${verifiedDb.verification_status}'`);
    }

    // 4. Test Approve button action
    console.log('3. Triggering approvePurchaseOrderAction...');
    const approveRes = await approvePurchaseOrderAction(testPoId);
    console.log('   Approve result:', approveRes);
    if (approveRes.error) {
      throw new Error(`Approve failed: ${approveRes.error}`);
    }

    const approvedDb = (await client.query('SELECT verification_status, approval_status, po_status FROM public.purchase_orders WHERE id = $1', [testPoId])).rows[0];
    console.log(`   DB State after approve: approval_status = ${approvedDb.approval_status}, po_status = ${approvedDb.po_status}`);
    if (approvedDb.approval_status !== 'Approved') {
      throw new Error(`Expected approval_status = 'Approved', got '${approvedDb.approval_status}'`);
    }

    console.log('\n✅ SUCCESS: Verify and Approve both work flawlessly even when stock is NOT available!');
  } finally {
    // Clean up temporary test data immediately
    console.log('\nCleaning up temporary test record...');
    await client.query('DELETE FROM public.purchase_order_items WHERE purchase_order_id = $1', [testPoId]);
    await client.query('DELETE FROM public.purchase_orders WHERE id = $1', [testPoId]);
    await client.query('DELETE FROM public.inventories WHERE sku = $1', [outOfStockSku]);
    await client.query('DELETE FROM public.products WHERE sku = $1', [outOfStockSku]);
    await client.end();
  }
}

testVerifyAndApproveNoStock();

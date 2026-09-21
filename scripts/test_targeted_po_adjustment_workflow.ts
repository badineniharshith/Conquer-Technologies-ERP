// @ts-nocheck
import { Client } from 'pg';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local or .env
for (const envFile of ['.env.local', '.env']) {
  const fullPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(fullPath)) {
    const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import {
  executeStockAdjustment,
  allocateStockForPO,
  calculatePOStockStatus
} from '../src/lib/stock-service';

async function runTargetedPOAdjustmentTests() {
  console.log('================================================================');
  console.log('   RUNNING TARGETED PO ADJUSTMENT & ALLOCATION TEST SUITE');
  console.log('================================================================\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const branchCode = 'HYD-HQ';
  const timestamp = Date.now();
  const testSku1 = `TEST-TARGET-SKU-A-${timestamp}`;
  const testSku2 = `TEST-TARGET-SKU-B-${timestamp}`;

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Setup Test Products
    console.log('Setting up test products...');
    await client.query(`
      INSERT INTO public.products (id, sku, name, brand, status, created_at, updated_at)
      VALUES 
        ($1, $2, 'Targeted Test Product A', 'Conquer', 'ACTIVE', NOW(), NOW()),
        ($3, $4, 'Targeted Test Product B', 'Conquer', 'ACTIVE', NOW(), NOW());
    `, [crypto.randomUUID(), testSku1, crypto.randomUUID(), testSku2]);

    // 2. Setup Inventory for SKU 1: 100 units initial physical stock, 0 allocated
    await client.query(`
      INSERT INTO public.inventories (id, sku, branch_code, quantity, available_qty, available_stock, reserved_qty, allocated_qty, created_at, updated_at)
      VALUES ($1, $2, $3, 100, 100, 100, 0, 0, NOW(), NOW());
    `, [crypto.randomUUID(), testSku1, branchCode]);

    // 3. Setup Inventory for SKU 2: 0 units initial physical stock
    await client.query(`
      INSERT INTO public.inventories (id, sku, branch_code, quantity, available_qty, available_stock, reserved_qty, allocated_qty, created_at, updated_at)
      VALUES ($1, $2, $3, 0, 0, 0, 0, 0, NOW(), NOW());
    `, [crypto.randomUUID(), testSku2, branchCode]);

    // =========================================================================
    // TEST 1: Immediate Allocation on PO creation when stock is available
    // Requested = 40, Available = 100 -> Immediately Allocated = 40, Pending = 0, Available becomes 60
    // =========================================================================
    console.log('\n--- TEST 1: Immediate Allocation on Creation with Available Stock ---');
    const po1Id = `po-test-tc1-${timestamp}`;
    const po1Number = `CPO-TC1-${timestamp}`;

    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, po_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer TC1', 40000, 'PENDING STOCK', 'Pending', 'Pending Approval', 'PENDING', $3, $4, NOW(), NOW());
    `, [po1Id, po1Number, branchCode, JSON.stringify([{ sku: testSku1, quantity: 40, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, allocated_quantity, remaining_quantity, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Targeted Test Product A', 40, 1000, 40000, 'Pending', 0, 40, NOW(), NOW());
    `, [crypto.randomUUID(), po1Id, po1Number, testSku1]);

    // Trigger immediate allocation (as done in CRM sync and PO ingestion)
    const allocResult1 = await allocateStockForPO(po1Id);
    console.log(`  Immediate allocation result: allAllocated=${allocResult1.allAllocated}`);

    const po1Db = (await client.query('SELECT stock_status FROM public.purchase_orders WHERE id = $1', [po1Id])).rows[0];
    const po1Item = (await client.query('SELECT allocated_quantity, remaining_quantity, item_status FROM public.purchase_order_items WHERE purchase_order_id = $1', [po1Id])).rows[0];
    const invAfter1 = (await client.query('SELECT quantity, allocated_qty, available_stock FROM public.inventories WHERE sku = $1 AND branch_code = $2', [testSku1, branchCode])).rows[0];

    assert(po1Db.stock_status === 'ASSIGNED', `PO 1 stock status is ASSIGNED (got ${po1Db.stock_status})`);
    assert(Number(po1Item.allocated_quantity) === 40, `PO 1 item allocated quantity is 40 (got ${po1Item.allocated_quantity})`);
    assert(Number(po1Item.remaining_quantity) === 0, `PO 1 item remaining shortage is 0 (got ${po1Item.remaining_quantity})`);
    assert(Number(invAfter1.allocated_qty) === 40, `Inventory allocated_qty is 40 (got ${invAfter1.allocated_qty})`);
    assert(Number(invAfter1.available_stock) === 60, `Inventory available_stock is 60 (got ${invAfter1.available_stock})`);

    // =========================================================================
    // TEST 2: Partial Stock Allocation on Creation (Stock < Requested)
    // Available = 60, Requested = 90 -> Allocated = 60, Pending = 30, Available becomes 0
    // =========================================================================
    console.log('\n--- TEST 2: Partial Stock Allocation on Creation ---');
    const po2Id = `po-test-tc2-${timestamp}`;
    const po2Number = `CPO-TC2-${timestamp}`;

    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, po_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer TC2', 90000, 'PENDING STOCK', 'Pending', 'Pending Approval', 'PENDING', $3, $4, NOW(), NOW());
    `, [po2Id, po2Number, branchCode, JSON.stringify([{ sku: testSku1, quantity: 90, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, allocated_quantity, remaining_quantity, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Targeted Test Product A', 90, 1000, 90000, 'Pending', 0, 90, NOW(), NOW());
    `, [crypto.randomUUID(), po2Id, po2Number, testSku1]);

    const allocResult2 = await allocateStockForPO(po2Id);
    console.log(`  Partial allocation result: allAllocated=${allocResult2.allAllocated}`);

    const po2Db = (await client.query('SELECT stock_status FROM public.purchase_orders WHERE id = $1', [po2Id])).rows[0];
    const po2Item = (await client.query('SELECT allocated_quantity, remaining_quantity, item_status FROM public.purchase_order_items WHERE purchase_order_id = $1', [po2Id])).rows[0];
    const invAfter2 = (await client.query('SELECT quantity, allocated_qty, available_stock FROM public.inventories WHERE sku = $1 AND branch_code = $2', [testSku1, branchCode])).rows[0];

    assert(po2Db.stock_status === 'PARTIALLY ASSIGNED' || po2Db.stock_status === 'PARTIALLY ASSIGNED / PENDING STOCK', `PO 2 stock status is PARTIALLY ASSIGNED (got ${po2Db.stock_status})`);
    assert(Number(po2Item.allocated_quantity) === 60, `PO 2 allocated quantity is 60 (got ${po2Item.allocated_quantity})`);
    assert(Number(po2Item.remaining_quantity) === 30, `PO 2 remaining shortage is 30 (got ${po2Item.remaining_quantity})`);
    assert(Number(invAfter2.allocated_qty) === 100, `Inventory allocated_qty is 100 (got ${invAfter2.allocated_qty})`);
    assert(Number(invAfter2.available_stock) === 0, `Inventory available_stock is 0 (got ${invAfter2.available_stock})`);

    // =========================================================================
    // TEST 3: Stock Availability Calculation Check (Total = 100, Allocated = 100, Avail = 0, Pending = 30)
    // =========================================================================
    console.log('\n--- TEST 3: Stock Availability Calculation Check ---');
    const availCheck = (await client.query(`
      SELECT 
        inv.quantity AS total_stock,
        COALESCE(inv.allocated_qty, 0) AS allocated_stock,
        GREATEST(0, inv.quantity - COALESCE(inv.allocated_qty, 0) - COALESCE(inv.reserved_qty, 0)) AS available_stock,
        COALESCE(pending.demand, 0) AS pending_demand
      FROM public.inventories inv
      LEFT JOIN (
        SELECT 
          poi.sku, 
          SUM(COALESCE(poi.remaining_quantity, GREATEST(0, poi.quantity - COALESCE(poi.allocated_quantity, 0)))) as demand
        FROM public.purchase_order_items poi
        JOIN public.purchase_orders po ON po.id = poi.purchase_order_id
        WHERE po.verification_status NOT IN ('Delivered', 'Cancelled')
          AND COALESCE(poi.remaining_quantity, GREATEST(0, poi.quantity - COALESCE(poi.allocated_quantity, 0))) > 0
        GROUP BY poi.sku
      ) pending ON pending.sku = inv.sku
      WHERE inv.sku = $1 AND inv.branch_code = $2
    `, [testSku1, branchCode])).rows[0];

    console.log('  Stock availability row:', availCheck);
    assert(Number(availCheck.total_stock) === 100, `Total Stock is 100 (got ${availCheck.total_stock})`);
    assert(Number(availCheck.allocated_stock) === 100, `Allocated Stock is 100 (got ${availCheck.allocated_stock})`);
    assert(Number(availCheck.available_stock) === 0, `Available Stock is 0, NEVER shows allocated as available (got ${availCheck.available_stock})`);
    assert(Number(availCheck.pending_demand) === 30, `Pending PO Demand is 30 (got ${availCheck.pending_demand})`);

    // =========================================================================
    // TEST 4: Targeted Stock Adjustment for Specific PO (PO 2 pending = 30, New Stock = 30)
    // Should allocate exclusively to PO 2, update status to STOCK ADJUSTED & ASSIGNED, log reference_id = PO ID
    // =========================================================================
    console.log('\n--- TEST 4: Targeted Stock Adjustment for PO 2 (Exact Shortage) ---');
    const adjResult1 = await executeStockAdjustment({
      sku: testSku1,
      branchCode: branchCode,
      quantity: 30,
      type: 'STOCK_IN',
      reason: 'Inward for PO-TC2',
      performedBy: 'test-admin',
      targetPoId: po2Id
    });

    console.log(`  Adjustment ID: ${adjResult1.adjustmentNumber}, newPhysicalStock: ${adjResult1.newStock}`);
    const po2AfterAdj = (await client.query('SELECT stock_status, last_adjustment_number FROM public.purchase_orders WHERE id = $1', [po2Id])).rows[0];
    const po2ItemAfterAdj = (await client.query('SELECT allocated_quantity, remaining_quantity, item_status FROM public.purchase_order_items WHERE purchase_order_id = $1', [po2Id])).rows[0];
    const invAfterAdj = (await client.query('SELECT quantity, allocated_qty, available_stock FROM public.inventories WHERE sku = $1 AND branch_code = $2', [testSku1, branchCode])).rows[0];
    const adjRecord = (await client.query('SELECT reference_type, reference_id FROM public.stock_adjustments WHERE adjustment_number = $1', [adjResult1.adjustmentNumber])).rows[0];
    const poAllocations = (await client.query('SELECT allocated_quantity, adjustment_number FROM public.purchase_order_stock_allocations WHERE purchase_order_id = $1', [po2Id])).rows;

    assert(po2AfterAdj.stock_status === 'STOCK ADJUSTED & ASSIGNED', `PO 2 status transitioned to STOCK ADJUSTED & ASSIGNED (got ${po2AfterAdj.stock_status})`);
    assert(Number(po2ItemAfterAdj.allocated_quantity) === 90, `PO 2 allocated_quantity is now 90/90 (got ${po2ItemAfterAdj.allocated_quantity})`);
    assert(Number(po2ItemAfterAdj.remaining_quantity) === 0, `PO 2 remaining_quantity is now 0 (got ${po2ItemAfterAdj.remaining_quantity})`);
    assert(adjRecord.reference_type === 'PURCHASE_ORDER', `Stock adjustment recorded reference_type = 'PURCHASE_ORDER' (got ${adjRecord.reference_type})`);
    const adjAlloc = poAllocations.find(a => a.adjustment_number === adjResult1.adjustmentNumber);
    assert(adjAlloc && Number(adjAlloc.allocated_quantity) === 30, `PO allocations table has 30 units logged for adjustment ${adjResult1.adjustmentNumber}`);
    assert(Number(invAfterAdj.quantity) === 130, `Physical stock increased to 130 (got ${invAfterAdj.quantity})`);
    assert(Number(invAfterAdj.allocated_qty) === 130, `Allocated qty is 130 (got ${invAfterAdj.allocated_qty})`);
    assert(Number(invAfterAdj.available_stock) === 0, `Available stock remains 0 (got ${invAfterAdj.available_stock})`);

    // =========================================================================
    // TEST 5: Targeted Stock Adjustment with Surplus (Pending = 20, Added = 50)
    // PO 3 pending 20. Target PO 3 with 50 units.
    // Result: PO 3 receives exactly 20 (status STOCK ADJUSTED & ASSIGNED).
    // Remaining 30 units stay in general available stock (available_stock = 30).
    // =========================================================================
    console.log('\n--- TEST 5: Targeted Stock Adjustment with Surplus Stock ---');
    const po3Id = `po-test-tc3-${timestamp}`;
    const po3Number = `CPO-TC3-${timestamp}`;

    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, po_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer TC3', 20000, 'PENDING STOCK', 'Pending', 'Pending Approval', 'PENDING', $3, $4, NOW(), NOW());
    `, [po3Id, po3Number, branchCode, JSON.stringify([{ sku: testSku2, quantity: 20, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, allocated_quantity, remaining_quantity, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Targeted Test Product B', 20, 1000, 20000, 'Pending', 0, 20, NOW(), NOW());
    `, [crypto.randomUUID(), po3Id, po3Number, testSku2]);

    // Target PO 3 with 50 units (20 needed, 30 surplus)
    const adjResult2 = await executeStockAdjustment({
      sku: testSku2,
      branchCode: branchCode,
      quantity: 50,
      type: 'STOCK_IN',
      reason: 'Inward for PO-TC3 with surplus',
      performedBy: 'test-admin',
      targetPoId: po3Id
    });

    const po3Db = (await client.query('SELECT stock_status FROM public.purchase_orders WHERE id = $1', [po3Id])).rows[0];
    const po3Item = (await client.query('SELECT allocated_quantity, remaining_quantity, item_status FROM public.purchase_order_items WHERE purchase_order_id = $1', [po3Id])).rows[0];
    const inv2After = (await client.query('SELECT quantity, allocated_qty, available_stock FROM public.inventories WHERE sku = $1 AND branch_code = $2', [testSku2, branchCode])).rows[0];

    assert(po3Db.stock_status === 'STOCK ADJUSTED & ASSIGNED', `PO 3 status transitioned to STOCK ADJUSTED & ASSIGNED (got ${po3Db.stock_status})`);
    assert(Number(po3Item.allocated_quantity) === 20, `PO 3 allocated exactly 20 units (got ${po3Item.allocated_quantity})`);
    assert(Number(po3Item.remaining_quantity) === 0, `PO 3 remaining shortage is 0 (got ${po3Item.remaining_quantity})`);
    assert(Number(inv2After.quantity) === 50, `Physical stock for SKU 2 is 50 (got ${inv2After.quantity})`);
    assert(Number(inv2After.allocated_qty) === 20, `Allocated stock for SKU 2 is 20 (got ${inv2After.allocated_qty})`);
    assert(Number(inv2After.available_stock) === 30, `Surplus 30 units remain in available stock (got ${inv2After.available_stock})`);

    // =========================================================================
    // TEST 6: Non-targeted Stock Adjustment (FIFO loop across multiple pending POs)
    // Create PO 4 (needs 15) and PO 5 (needs 25) of SKU 1.
    // Stock-in 30 units without target PO.
    // FIFO should allocate 15 to PO 4 (completes it) and 15 to PO 5 (partial, 10 pending).
    // =========================================================================
    console.log('\n--- TEST 6: Non-targeted FIFO Stock Adjustment ---');
    const po4Id = `po-test-tc4-${timestamp}`;
    const po4Number = `CPO-TC4-${timestamp}`;
    const po5Id = `po-test-tc5-${timestamp}`;
    const po5Number = `CPO-TC5-${timestamp}`;

    // PO 4 (created earlier)
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, po_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer TC4', 15000, 'PENDING STOCK', 'Pending', 'Pending Approval', 'PENDING', $3, $4, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes');
    `, [po4Id, po4Number, branchCode, JSON.stringify([{ sku: testSku1, quantity: 15, unitPrice: 1000 }])]);
    await client.query(`
      INSERT INTO public.purchase_order_items (id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, allocated_quantity, remaining_quantity, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Targeted Test Product A', 15, 1000, 15000, 'Pending', 0, 15, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes');
    `, [crypto.randomUUID(), po4Id, po4Number, testSku1]);

    // PO 5 (created later)
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, po_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer TC5', 25000, 'PENDING STOCK', 'Pending', 'Pending Approval', 'PENDING', $3, $4, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes');
    `, [po5Id, po5Number, branchCode, JSON.stringify([{ sku: testSku1, quantity: 25, unitPrice: 1000 }])]);
    await client.query(`
      INSERT INTO public.purchase_order_items (id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, allocated_quantity, remaining_quantity, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Targeted Test Product A', 25, 1000, 25000, 'Pending', 0, 25, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes');
    `, [crypto.randomUUID(), po5Id, po5Number, testSku1]);

    // Stock in 30 units with NO target PO
    const adjResult3 = await executeStockAdjustment({
      sku: testSku1,
      branchCode: branchCode,
      quantity: 30,
      type: 'STOCK_IN',
      reason: 'General stock inward for FIFO',
      performedBy: 'test-admin',
      targetPoId: null
    });

    const po4Db = (await client.query('SELECT stock_status FROM public.purchase_orders WHERE id = $1', [po4Id])).rows[0];
    const po4Item = (await client.query('SELECT allocated_quantity, remaining_quantity FROM public.purchase_order_items WHERE purchase_order_id = $1', [po4Id])).rows[0];
    const po5Db = (await client.query('SELECT stock_status FROM public.purchase_orders WHERE id = $1', [po5Id])).rows[0];
    const po5Item = (await client.query('SELECT allocated_quantity, remaining_quantity FROM public.purchase_order_items WHERE purchase_order_id = $1', [po5Id])).rows[0];

    assert(po4Db.stock_status === 'STOCK ADJUSTED & ASSIGNED', `PO 4 fully satisfied by FIFO (got ${po4Db.stock_status})`);
    assert(Number(po4Item.allocated_quantity) === 15, `PO 4 allocated 15 (got ${po4Item.allocated_quantity})`);
    assert(po5Db.stock_status === 'PARTIALLY ASSIGNED' || po5Db.stock_status === 'PARTIALLY ASSIGNED / PENDING STOCK', `PO 5 partially satisfied by FIFO (got ${po5Db.stock_status})`);
    assert(Number(po5Item.allocated_quantity) === 15, `PO 5 allocated 15 (got ${po5Item.allocated_quantity})`);
    assert(Number(po5Item.remaining_quantity) === 10, `PO 5 remaining shortage is 10 (got ${po5Item.remaining_quantity})`);

    // =========================================================================
    // TEST 7: calculatePOStockStatus Self-healing
    // If a PO was created without allocation but free stock is available in DB,
    // calculatePOStockStatus must self-heal and assign stock rather than showing 0.
    // =========================================================================
    console.log('\n--- TEST 7: calculatePOStockStatus Self-Healing Check ---');
    // We currently have surplus 30 units of SKU 2 in stock.
    // Create PO 6 with 10 units of SKU 2, left unallocated at 0.
    const po6Id = `po-test-tc6-${timestamp}`;
    const po6Number = `CPO-TC6-${timestamp}`;

    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, po_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer TC6', 10000, 'PENDING STOCK', 'Pending', 'Pending Approval', 'PENDING', $3, $4, NOW(), NOW());
    `, [po6Id, po6Number, branchCode, JSON.stringify([{ sku: testSku2, quantity: 10, unitPrice: 1000 }])]);
    await client.query(`
      INSERT INTO public.purchase_order_items (id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, allocated_quantity, remaining_quantity, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Targeted Test Product B', 10, 1000, 10000, 'Pending', 0, 10, NOW(), NOW());
    `, [crypto.randomUUID(), po6Id, po6Number, testSku2]);

    // Run calculatePOStockStatus
    const statusReport = await calculatePOStockStatus(po6Id);
    console.log(`  calculatePOStockStatus result: isStockAvailable=${statusReport.isStockAvailable}, stockStatus=${statusReport.stockStatus}`);

    const po6Db = (await client.query('SELECT stock_status FROM public.purchase_orders WHERE id = $1', [po6Id])).rows[0];
    const po6Item = (await client.query('SELECT allocated_quantity, remaining_quantity FROM public.purchase_order_items WHERE purchase_order_id = $1', [po6Id])).rows[0];

    assert(statusReport.isStockAvailable === true, `Self-healed: isStockAvailable is true`);
    assert(po6Db.stock_status === 'ASSIGNED', `Self-healed: PO 6 status is ASSIGNED (got ${po6Db.stock_status})`);
    assert(Number(po6Item.allocated_quantity) === 10, `Self-healed: PO 6 allocated 10 units (got ${po6Item.allocated_quantity})`);
    assert(Number(po6Item.remaining_quantity) === 0, `Self-healed: PO 6 remaining shortage is 0 (got ${po6Item.remaining_quantity})`);

    console.log('\n================================================================');
    console.log(`   ALL TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Test execution failed with error:', err);
    process.exit(1);
  } finally {
    // Clean up test data
    console.log('Cleaning up test data...');
    try {
      await client.query(`DELETE FROM public.purchase_order_stock_allocations WHERE sku IN ($1, $2)`, [testSku1, testSku2]);
      await client.query(`DELETE FROM public.purchase_order_items WHERE sku IN ($1, $2)`, [testSku1, testSku2]);
      await client.query(`DELETE FROM public.purchase_orders WHERE po_number LIKE 'CPO-TC%-${timestamp}'`);
      await client.query(`DELETE FROM public.stock_adjustments WHERE sku IN ($1, $2)`, [testSku1, testSku2]);
      await client.query(`DELETE FROM public.inventories WHERE sku IN ($1, $2)`, [testSku1, testSku2]);
      await client.query(`DELETE FROM public.products WHERE sku IN ($1, $2)`, [testSku1, testSku2]);
    } catch (e: any) {
      console.warn('Cleanup warning:', e.message);
    }
    await client.end();
  }
}

runTargetedPOAdjustmentTests();

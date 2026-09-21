const { Client } = require('pg');
const { 
  allocateStockForPO, 
  processPendingPOsAfterStockIncrease, 
  executeStockAdjustment, 
  calculatePOStockStatus 
} = require('../src/lib/stock-service');

async function runPOAllocationWorkflowTests() {
  console.log('================================================================');
  console.log('=== PO STOCK ALLOCATION & PENDING FULFILLMENT TEST SUITE ===');
  console.log('================================================================\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const branchCode = 'HYD-HQ';
  const timestamp = Date.now();
  const skuA = `SKU-ACC-A-${timestamp}`;
  const skuB = `SKU-ACC-B-${timestamp}`;
  const skuC = `SKU-ACC-C-${timestamp}`;
  const skuD = `SKU-ACC-D-${timestamp}`;

  try {
    // Setup test products
    await client.query(`
      INSERT INTO public.products (id, sku, name, brand, status, created_at, updated_at)
      VALUES 
        ($1, $2, 'Acceptance Product A', 'Conquer', 'ACTIVE', NOW(), NOW()),
        ($3, $4, 'Acceptance Product B', 'Conquer', 'ACTIVE', NOW(), NOW()),
        ($5, $6, 'Acceptance Product C', 'Conquer', 'ACTIVE', NOW(), NOW()),
        ($7, $8, 'Acceptance Product D', 'Conquer', 'ACTIVE', NOW(), NOW());
    `, [
      crypto.randomUUID(), skuA,
      crypto.randomUUID(), skuB,
      crypto.randomUUID(), skuC,
      crypto.randomUUID(), skuD
    ]);

    // =========================================================================
    // CASE 1: CORE ACCEPTANCE SCENARIO (Point 10)
    // 1. Product A has 50 units in stock.
    // 2. Create PO for 100 units.
    // 3. System assigns 50 immediately.
    // 4. Remaining 50 becomes "PENDING_STOCK".
    // 5. Add 50 units of Product A to inventory.
    // 6. System automatically detects the pending PO.
    // 7. 50 units are allocated to the PO.
    // 8. Available inventory decreases by 50 (allocated_qty increases).
    // 9. PO becomes STOCK ADJUSTED & ASSIGNED.
    // 10. No pending quantity remains.
    // 11. Verify that the same 50 units cannot be allocated to another PO.
    // =========================================================================
    console.log('>>> [TEST 1] Core Acceptance Scenario (50 in stock -> PO for 100 -> shortage 50 -> stock addition 50 -> fulfilled)');

    // Step 1: Seed 50 units of Product A
    await client.query(`
      INSERT INTO public.inventories (
        id, sku, branch_code, quantity, available_qty, available_stock, reserved_qty, allocated_qty, created_at, updated_at
      ) VALUES ($1, $2, $3, 50, 50, 50, 0, 0, NOW(), NOW());
    `, [crypto.randomUUID(), skuA, branchCode]);

    // Step 2: Create PO for 100 units
    const po1Id = `po-alloc-test-1-${timestamp}`;
    const po1Number = `CPO-ALLOC-1-${timestamp}`;
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Acme Corp', 100000, 'Checking', 'Pending', 'Pending Approval', $3, $4, NOW(), NOW());
    `, [po1Id, po1Number, branchCode, JSON.stringify([{ sku: skuA, quantity: 100, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (
        id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, branch_code, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'Acceptance Product A', 100, 1000, 100000, 'Pending', $5, NOW(), NOW());
    `, [crypto.randomUUID(), po1Id, po1Number, skuA, branchCode]);

    // Step 3 & 4: Execute allocateStockForPO
    console.log('Action: System executes allocateStockForPO at PO creation...');
    const po1CreationResult = await allocateStockForPO(po1Id, client);
    console.log(`  PO 1 Stock Status at Creation: ${po1CreationResult.overallStatus}`);
    console.log(`  Allocated: ${po1CreationResult.totalAllocated}/100, Pending: ${po1CreationResult.totalRemaining}/100`);

    if (po1CreationResult.totalAllocated !== 50) {
      throw new Error(`Expected exactly 50 units allocated at creation, got ${po1CreationResult.totalAllocated}`);
    }
    if (po1CreationResult.totalRemaining !== 50) {
      throw new Error(`Expected exactly 50 units pending, got ${po1CreationResult.totalRemaining}`);
    }
    if (po1CreationResult.overallStatus !== 'PENDING_STOCK') {
      throw new Error(`Expected overallStatus = PENDING_STOCK, got ${po1CreationResult.overallStatus}`);
    }

    // Verify inventory state: available stock must be 0, allocated must be 50
    const invAfterCreation = (await client.query(
      'SELECT quantity, available_qty, allocated_qty FROM public.inventories WHERE sku = $1 AND branch_code = $2',
      [skuA, branchCode]
    )).rows[0];
    console.log(`  Inventory after PO 1 creation: Physical=${invAfterCreation.quantity}, Allocated=${invAfterCreation.allocated_qty}, Available=${invAfterCreation.available_qty}`);
    if (Number(invAfterCreation.available_qty) !== 0 || Number(invAfterCreation.allocated_qty) !== 50) {
      throw new Error('Inventory deduction error: Available stock should be 0 and Allocated should be 50');
    }

    // Step 5, 6, 7, 8: Add 50 units of Product A via executeStockAdjustment
    console.log('Action: Inward stock arrives -> adding 50 units of Product A...');
    const adj1 = await executeStockAdjustment({
      sku: skuA,
      branchCode,
      quantity: 50,
      type: 'STOCK_IN',
      reason: 'Batch arrival for PO fulfillment'
    }, { name: 'Operations Executive' });

    console.log(`  Created adjustment: ${adj1.adjustmentNumber}`);
    console.log(`  Impacted POs: ${adj1.poImpacts.length}`);

    // Verify PO 1 after stock arrival
    const po1AfterAdj = await calculatePOStockStatus(po1Id, client);
    console.log(`  PO 1 Status after stock arrival: ${po1AfterAdj.overallStatus}`);
    console.log(`  Allocated: ${po1AfterAdj.totalAllocated}/100, Remaining: ${po1AfterAdj.totalRemaining}/100`);

    if (po1AfterAdj.totalAllocated !== 100 || po1AfterAdj.totalRemaining !== 0) {
      throw new Error(`Expected 100/100 allocated, got ${po1AfterAdj.totalAllocated} allocated, ${po1AfterAdj.totalRemaining} remaining`);
    }
    if (po1AfterAdj.overallStatus !== 'STOCK ADJUSTED & ASSIGNED') {
      throw new Error(`Expected status = 'STOCK ADJUSTED & ASSIGNED', got ${po1AfterAdj.overallStatus}`);
    }

    // Verify Inventory: 50 newly added units were consumed by PO 1 (allocated_qty is now 100, available is 0)
    const invAfterAdj = (await client.query(
      'SELECT quantity, available_qty, allocated_qty FROM public.inventories WHERE sku = $1 AND branch_code = $2',
      [skuA, branchCode]
    )).rows[0];
    console.log(`  Inventory after Fulfillment: Physical=${invAfterAdj.quantity}, Allocated=${invAfterAdj.allocated_qty}, Available=${invAfterAdj.available_qty}`);
    if (Number(invAfterAdj.allocated_qty) !== 100 || Number(invAfterAdj.available_qty) !== 0) {
      throw new Error('Expected 100 allocated units in inventory and 0 available');
    }

    // Step 11: Verify that another PO cannot take the same 50 units
    console.log('Action: Creating PO 1B for 50 units to verify NO double allocation...');
    const po1BId = `po-alloc-test-1b-${timestamp}`;
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Beta Client', 50000, 'Checking', 'Pending', 'Pending Approval', $3, $4, NOW(), NOW());
    `, [po1BId, `CPO-ALLOC-1B-${timestamp}`, branchCode, JSON.stringify([{ sku: skuA, quantity: 50, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (
        id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, branch_code, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'Acceptance Product A', 50, 1000, 50000, 'Pending', $5, NOW(), NOW());
    `, [crypto.randomUUID(), po1BId, `CPO-ALLOC-1B-${timestamp}`, skuA, branchCode]);

    const po1BResult = await allocateStockForPO(po1BId, client);
    console.log(`  PO 1B Allocated: ${po1BResult.totalAllocated}/50, Pending: ${po1BResult.totalRemaining}/50 (Status: ${po1BResult.overallStatus})`);
    if (po1BResult.totalAllocated !== 0 || po1BResult.totalRemaining !== 50) {
      throw new Error('Double allocation violation: PO 1B was able to allocate stock that belongs to PO 1!');
    }
    console.log('✓ TEST 1 PASSED: Core Acceptance Scenario verified end-to-end.\n');

    // =========================================================================
    // CASE 2: SUFFICIENT STOCK AT PO CREATION
    // Requested: 50, Available: 80 -> Assigned: 50, Pending: 0 -> Status: ASSIGNED
    // =========================================================================
    console.log('>>> [TEST 2] Sufficient Stock at PO Creation');
    await client.query(`
      INSERT INTO public.inventories (
        id, sku, branch_code, quantity, available_qty, available_stock, reserved_qty, allocated_qty, created_at, updated_at
      ) VALUES ($1, $2, $3, 80, 80, 80, 0, 0, NOW(), NOW());
    `, [crypto.randomUUID(), skuB, branchCode]);

    const po2Id = `po-alloc-test-2-${timestamp}`;
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer 2', 50000, 'Checking', 'Pending', 'Pending Approval', $3, $4, NOW(), NOW());
    `, [po2Id, `CPO-ALLOC-2-${timestamp}`, branchCode, JSON.stringify([{ sku: skuB, quantity: 50, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (
        id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, branch_code, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'Acceptance Product B', 50, 1000, 50000, 'Pending', $5, NOW(), NOW());
    `, [crypto.randomUUID(), po2Id, `CPO-ALLOC-2-${timestamp}`, skuB, branchCode]);

    const po2Res = await allocateStockForPO(po2Id, client);
    console.log(`  PO 2 Allocated: ${po2Res.totalAllocated}/50, Pending: ${po2Res.totalRemaining}/50 (Status: ${po2Res.overallStatus})`);
    if (po2Res.overallStatus !== 'ASSIGNED' || po2Res.totalAllocated !== 50 || po2Res.totalRemaining !== 0) {
      throw new Error('Test 2 Failed: Expected ASSIGNED with 50 allocated and 0 pending');
    }
    console.log('✓ TEST 2 PASSED: Full immediate assignment verified.\n');

    // =========================================================================
    // CASE 3: ZERO STOCK AT PO CREATION
    // Requested: 40, Available: 0 -> Assigned: 0, Pending: 40 -> Status: PENDING_STOCK
    // =========================================================================
    console.log('>>> [TEST 3] Zero Stock at PO Creation');
    await client.query(`
      INSERT INTO public.inventories (
        id, sku, branch_code, quantity, available_qty, available_stock, reserved_qty, allocated_qty, created_at, updated_at
      ) VALUES ($1, $2, $3, 0, 0, 0, 0, 0, NOW(), NOW());
    `, [crypto.randomUUID(), skuC, branchCode]);

    const po3Id = `po-alloc-test-3-${timestamp}`;
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer 3', 40000, 'Checking', 'Pending', 'Pending Approval', $3, $4, NOW(), NOW());
    `, [po3Id, `CPO-ALLOC-3-${timestamp}`, branchCode, JSON.stringify([{ sku: skuC, quantity: 40, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (
        id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, branch_code, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'Acceptance Product C', 40, 1000, 40000, 'Pending', $5, NOW(), NOW());
    `, [crypto.randomUUID(), po3Id, `CPO-ALLOC-3-${timestamp}`, skuC, branchCode]);

    const po3Res = await allocateStockForPO(po3Id, client);
    console.log(`  PO 3 Allocated: ${po3Res.totalAllocated}/40, Pending: ${po3Res.totalRemaining}/40 (Status: ${po3Res.overallStatus})`);
    if (po3Res.overallStatus !== 'PENDING_STOCK' || po3Res.totalAllocated !== 0 || po3Res.totalRemaining !== 40) {
      throw new Error('Test 3 Failed: Expected PENDING_STOCK with 0 allocated and 40 pending');
    }
    console.log('✓ TEST 3 PASSED: Zero stock correctly marked as PENDING_STOCK.\n');

    // =========================================================================
    // CASE 4: FIFO ALLOCATION ACROSS MULTIPLE PENDING POs
    // PO 4A (created first) needs 40 units of Product D
    // PO 4B (created second) needs 40 units of Product D
    // Initial Stock: 0
    // Stock arrival: +50 units
    // Expected: PO 4A gets 40 (fully fulfilled -> STOCK ADJUSTED & ASSIGNED)
    //           PO 4B gets 10 (partially fulfilled -> PARTIALLY ASSIGNED / PENDING STOCK, 30 pending)
    // =========================================================================
    console.log('>>> [TEST 4] FIFO Allocation Across Multiple Pending POs');
    await client.query(`
      INSERT INTO public.inventories (
        id, sku, branch_code, quantity, available_qty, available_stock, reserved_qty, allocated_qty, created_at, updated_at
      ) VALUES ($1, $2, $3, 0, 0, 0, 0, 0, NOW(), NOW());
    `, [crypto.randomUUID(), skuD, branchCode]);

    const po4AId = `po-alloc-test-4a-${timestamp}`;
    const po4BId = `po-alloc-test-4b-${timestamp}`;

    // PO 4A created at timestamp - 10000
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'First In Line', 40000, 'Checking', 'Pending', 'Pending Approval', $3, $4, NOW() - INTERVAL '10 seconds', NOW());
    `, [po4AId, `CPO-ALLOC-4A-${timestamp}`, branchCode, JSON.stringify([{ sku: skuD, quantity: 40, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (
        id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, branch_code, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'Acceptance Product D', 40, 1000, 40000, 'Pending', $5, NOW() - INTERVAL '10 seconds', NOW());
    `, [crypto.randomUUID(), po4AId, `CPO-ALLOC-4A-${timestamp}`, skuD, branchCode]);

    // PO 4B created at timestamp
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Second In Line', 40000, 'Checking', 'Pending', 'Pending Approval', $3, $4, NOW(), NOW());
    `, [po4BId, `CPO-ALLOC-4B-${timestamp}`, branchCode, JSON.stringify([{ sku: skuD, quantity: 40, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (
        id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, branch_code, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'Acceptance Product D', 40, 1000, 40000, 'Pending', $5, NOW(), NOW());
    `, [crypto.randomUUID(), po4BId, `CPO-ALLOC-4B-${timestamp}`, skuD, branchCode]);

    // Allocate both initial states
    await allocateStockForPO(po4AId, client);
    await allocateStockForPO(po4BId, client);

    console.log('Action: Stock arrives -> +50 units of Product D...');
    const adj4 = await executeStockAdjustment({
      sku: skuD,
      branchCode,
      quantity: 50,
      type: 'STOCK_IN',
      reason: 'Batch arrival'
    }, { name: 'Operations Exec' });

    const po4ARes = await calculatePOStockStatus(po4AId, client);
    const po4BRes = await calculatePOStockStatus(po4BId, client);

    console.log(`  PO 4A (Older): Allocated=${po4ARes.totalAllocated}/40, Remaining=${po4ARes.totalRemaining}, Status=${po4ARes.overallStatus}`);
    console.log(`  PO 4B (Newer): Allocated=${po4BRes.totalAllocated}/40, Remaining=${po4BRes.totalRemaining}, Status=${po4BRes.overallStatus}`);

    if (po4ARes.totalAllocated !== 40 || po4ARes.totalRemaining !== 0 || po4ARes.overallStatus !== 'STOCK ADJUSTED & ASSIGNED') {
      throw new Error(`FIFO failure: Older PO 4A should be 100% fulfilled (40/40), got ${po4ARes.totalAllocated}`);
    }
    if (po4BRes.totalAllocated !== 10 || po4BRes.totalRemaining !== 30 || po4BRes.overallStatus !== 'PARTIALLY ASSIGNED / PENDING STOCK') {
      throw new Error(`FIFO failure: Newer PO 4B should have received remaining 10 units with 30 pending, got ${po4BRes.totalAllocated}`);
    }
    console.log('✓ TEST 4 PASSED: FIFO allocation order strictly respected.\n');

    // =========================================================================
    // CASE 5: STOCK ADDITION LARGER THAN REMAINING PENDING
    // PO 4B still has 30 pending units.
    // Stock arrival: +50 units.
    // Expected: PO 4B receives 30 units (now 40/40, STOCK ADJUSTED & ASSIGNED).
    //           Inventory has remaining 20 units free available stock.
    // =========================================================================
    console.log('>>> [TEST 5] Stock Addition Larger than Pending Quantity');
    const adj5 = await executeStockAdjustment({
      sku: skuD,
      branchCode,
      quantity: 50,
      type: 'STOCK_IN',
      reason: 'Surplus batch arrival'
    }, { name: 'Operations Exec' });

    const po4BFinal = await calculatePOStockStatus(po4BId, client);
    console.log(`  PO 4B Final: Allocated=${po4BFinal.totalAllocated}/40, Remaining=${po4BFinal.totalRemaining}, Status=${po4BFinal.overallStatus}`);
    if (po4BFinal.totalAllocated !== 40 || po4BFinal.totalRemaining !== 0 || po4BFinal.overallStatus !== 'STOCK ADJUSTED & ASSIGNED') {
      throw new Error('Test 5 Failed: Expected PO 4B to be fully fulfilled after surplus stock arrival');
    }

    const invDCheck = (await client.query(
      'SELECT quantity, available_qty, allocated_qty FROM public.inventories WHERE sku = $1 AND branch_code = $2',
      [skuD, branchCode]
    )).rows[0];
    console.log(`  Inventory for Product D: Total Physical=${invDCheck.quantity}, Total Allocated=${invDCheck.allocated_qty}, Free Available=${invDCheck.available_qty}`);
    if (Number(invDCheck.quantity) !== 100 || Number(invDCheck.allocated_qty) !== 80 || Number(invDCheck.available_qty) !== 20) {
      throw new Error(`Test 5 Failed: Expected 20 units free available stock in inventory, got ${invDCheck.available_qty}`);
    }
    console.log('✓ TEST 5 PASSED: Surplus stock correctly remains in free inventory.\n');

    // =========================================================================
    // CASE 6: AUDIT HISTORY TIMELINE INTEGRITY
    // Check purchase_order_status_history for PO 1 and PO 4B
    // =========================================================================
    console.log('>>> [TEST 6] Audit History Timeline Integrity');
    const historyRes = await client.query(
      'SELECT status, remarks, created_at FROM public.purchase_order_status_history WHERE purchase_order_id = $1 ORDER BY created_at ASC',
      [po1Id]
    );
    console.log(`  Audit events recorded for PO 1: ${historyRes.rows.length}`);
    for (const h of historyRes.rows) {
      console.log(`    - [${h.status}] ${h.remarks}`);
    }
    if (historyRes.rows.length < 2) {
      throw new Error('Audit history must contain both initial creation and stock arrival entries');
    }
    console.log('✓ TEST 6 PASSED: Comprehensive audit trail recorded.\n');

    console.log('================================================================');
    console.log('🎉 ALL PO STOCK ALLOCATION & PENDING FULFILLMENT TESTS PASSED!');
    console.log('================================================================');
  } finally {
    // Cleanup test artifacts
    await client.query("DELETE FROM public.purchase_orders WHERE id LIKE 'po-alloc-test%';");
    await client.query("DELETE FROM public.products WHERE sku IN ($1, $2, $3, $4);", [skuA, skuB, skuC, skuD]);
    await client.query("DELETE FROM public.inventories WHERE sku IN ($1, $2, $3, $4);", [skuA, skuB, skuC, skuD]);
    await client.query("DELETE FROM public.stock_adjustments WHERE sku IN ($1, $2, $3, $4);", [skuA, skuB, skuC, skuD]);
    await client.end();
  }
}

runPOAllocationWorkflowTests().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});

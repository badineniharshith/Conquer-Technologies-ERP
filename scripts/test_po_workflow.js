const { Client } = require('pg');
const { executeStockAdjustment, calculatePOStockStatus } = require('../src/lib/stock-service');
const { verifyPurchaseOrderAction, approvePurchaseOrderAction } = require('../src/app/actions');

async function runPoWorkflowTests() {
  console.log('=== STARTING PURCHASE ORDER WORKFLOW & ACTIONS TEST SUITE ===\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const branchCode = 'HYD-HQ';
  const testSku1 = `TEST-PO-SKU-A-${Date.now()}`;
  const testSku2 = `TEST-PO-SKU-B-${Date.now()}`;

  try {
    // Setup Test Products
    await client.query(`
      INSERT INTO public.products (id, sku, name, brand, status, created_at, updated_at)
      VALUES 
        ($1, $2, 'Test Product A', 'Conquer', 'ACTIVE', NOW(), NOW()),
        ($3, $4, 'Test Product B', 'Conquer', 'ACTIVE', NOW(), NOW());
    `, [crypto.randomUUID(), testSku1, crypto.randomUUID(), testSku2]);

    // Setup Test Inventory for SKU 1: 50 units (Available)
    await client.query(`
      INSERT INTO public.inventories (id, sku, branch_code, quantity, available_qty, available_stock, reserved_qty, created_at, updated_at)
      VALUES ($1, $2, $3, 50, 50, 50, 0, NOW(), NOW());
    `, [crypto.randomUUID(), testSku1, branchCode]);

    // Setup Test Inventory for SKU 2: 0 units (Shortage)
    await client.query(`
      INSERT INTO public.inventories (id, sku, branch_code, quantity, available_qty, available_stock, reserved_qty, created_at, updated_at)
      VALUES ($1, $2, $3, 0, 0, 0, 0, NOW(), NOW());
    `, [crypto.randomUUID(), testSku2, branchCode]);

    // =========================================================================
    // CASE A (TEST 1): STOCK ALREADY AVAILABLE
    // PO: 50, Available: 50
    // Initial: IN STOCK, VERIFY: PENDING -> Click Verify -> IN STOCK, VERIFY: VERIFIED -> Click Approve -> APPROVED
    // =========================================================================
    console.log('--- TEST 1: Workflow with Stock Available ---');
    const po1Id = `po-test-wf-1-${Date.now()}`;
    const po1Number = `CPO-TEST-1-${Date.now()}`;
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, po_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer 1', 50000, 'Available', 'Pending', 'Pending Approval', 'PENDING', $3, $4, NOW(), NOW());
    `, [po1Id, po1Number, branchCode, JSON.stringify([{ sku: testSku1, quantity: 50, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Test Product A', 50, 1000, 50000, 'Pending', NOW(), NOW());
    `, [crypto.randomUUID(), po1Id, po1Number, testSku1]);

    const initialPO1 = (await client.query('SELECT stock_status, verification_status, approval_status FROM public.purchase_orders WHERE id = $1', [po1Id])).rows[0];
    console.log(`PO 1 Initial: Stock: ${initialPO1.stock_status}, Verification: ${initialPO1.verification_status}, Approval: ${initialPO1.approval_status}`);
    if (initialPO1.verification_status !== 'Pending' || initialPO1.approval_status !== 'Pending Approval') {
      throw new Error('Test 1 failed on initial state');
    }

    // Step 1.1: Verify PO 1
    console.log('Action: User clicks [ Verify ] on PO 1...');
    const verifyRes1 = await verifyPurchaseOrderAction(po1Id);
    if (verifyRes1.error) throw new Error(`Verify failed: ${verifyRes1.error}`);

    const verifiedPO1 = (await client.query('SELECT stock_status, verification_status, approval_status, verified_by, verified_date FROM public.purchase_orders WHERE id = $1', [po1Id])).rows[0];
    console.log(`PO 1 after Verify: Stock: ${verifiedPO1.stock_status}, Verification: ${verifiedPO1.verification_status}, Approval: ${verifiedPO1.approval_status}`);
    console.log(`Verified By: ${verifiedPO1.verified_by}, Verified Date: ${verifiedPO1.verified_date}`);

    if (verifiedPO1.verification_status !== 'Verified') throw new Error('Expected verification_status = Verified');
    if (verifiedPO1.approval_status === 'Approved') throw new Error('Verification must NOT automatically approve the PO!');

    // Step 1.2: Approve PO 1
    console.log('Action: Authorized user clicks [ Approve ] on PO 1...');
    const approveRes1 = await approvePurchaseOrderAction(po1Id);
    if (approveRes1.error) throw new Error(`Approve failed: ${approveRes1.error}`);

    const approvedPO1 = (await client.query('SELECT stock_status, verification_status, approval_status, approved_by, approved_date FROM public.purchase_orders WHERE id = $1', [po1Id])).rows[0];
    console.log(`PO 1 after Approve: Stock: ${approvedPO1.stock_status}, Verification: ${approvedPO1.verification_status}, Approval: ${approvedPO1.approval_status}`);
    console.log(`Approved By: ${approvedPO1.approved_by}, Approved Date: ${approvedPO1.approved_date}`);

    if (approvedPO1.approval_status !== 'Approved') throw new Error('Expected approval_status = Approved');
    console.log('✓ TEST 1 PASSED: Complete Verify -> Approve workflow for available stock succeeded.\n');

    // =========================================================================
    // CASE B (TEST 2, 3, 4, 5): SHORTAGE -> VERIFY -> STOCK ADJUSTMENT -> APPROVE
    // PO: 50, Available: 0
    // =========================================================================
    console.log('--- TEST 2: Workflow with Shortage & Verification ---');
    const po2Id = `po-test-wf-2-${Date.now()}`;
    const po2Number = `CPO-TEST-2-${Date.now()}`;
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, po_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer 2', 50000, 'Insufficient', 'Pending', 'Pending Approval', 'PENDING', $3, $4, NOW(), NOW());
    `, [po2Id, po2Number, branchCode, JSON.stringify([{ sku: testSku2, quantity: 50, unitPrice: 1000 }])]);

    await client.query(`
      INSERT INTO public.purchase_order_items (id, purchase_order_id, po_number, sku, product_name, quantity, unit_price, total, item_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Test Product B', 50, 1000, 50000, 'Pending', NOW(), NOW());
    `, [crypto.randomUUID(), po2Id, po2Number, testSku2]);

    // Verify PO 2 while in shortage
    console.log('Action: User clicks [ Verify ] on PO 2 (shortage)...');
    const verifyRes2 = await verifyPurchaseOrderAction(po2Id);
    if (verifyRes2.error) throw new Error(`Verify failed: ${verifyRes2.error}`);

    const verifiedPO2 = (await client.query('SELECT stock_status, verification_status, approval_status FROM public.purchase_orders WHERE id = $1', [po2Id])).rows[0];
    console.log(`PO 2 after Verify: Stock: ${verifiedPO2.stock_status}, Verification: ${verifiedPO2.verification_status}, Approval: ${verifiedPO2.approval_status}`);
    if (verifiedPO2.verification_status !== 'Verified') throw new Error('Expected verification_status = Verified');
    if (verifiedPO2.approval_status === 'Approved') throw new Error('Shortage PO must NOT be auto-approved!');
    console.log('✓ TEST 2 PASSED: Verification succeeded for shortage PO without auto-approving.\n');

    // TEST 4: Partial Stock Adjustment (+20 units)
    console.log('--- TEST 4: Partial Stock Adjustment (+20 units) ---');
    const adjPartial = await executeStockAdjustment({
      sku: testSku2,
      branchCode,
      quantity: 20,
      type: 'STOCK_IN',
      reason: 'Batch 1 arrival'
    }, { name: 'Operations Exec' });

    console.log(`Created adjustment: ${adjPartial.adjustmentNumber}`);
    const po2CalcPartial = await calculatePOStockStatus(po2Id, client);
    console.log(`PO 2 Status after +20: ${po2CalcPartial.overallStatus} (Allocated: ${po2CalcPartial.totalAllocated}/50, Remaining: ${po2CalcPartial.totalRemaining})`);
    if (po2CalcPartial.overallStatus !== 'Partially Stock Adjusted' || po2CalcPartial.totalAllocated !== 20 || po2CalcPartial.totalRemaining !== 30) {
      throw new Error('Test 4 Failed: Expected Partially Stock Adjusted with 20/50 fulfilled');
    }
    console.log('✓ TEST 4 PASSED: PO correctly reflects Partially Stock Adjusted (20/50 fulfilled, 30 remaining).\n');

    // TEST 5: Complete Stock Adjustment (+30 units)
    console.log('--- TEST 5: Complete Stock Adjustment (+30 units) ---');
    const adjFull = await executeStockAdjustment({
      sku: testSku2,
      branchCode,
      quantity: 30,
      type: 'STOCK_IN',
      reason: 'Batch 2 arrival'
    }, { name: 'Operations Exec' });

    console.log(`Created adjustment: ${adjFull.adjustmentNumber}`);
    const po2CalcFull = await calculatePOStockStatus(po2Id, client);
    console.log(`PO 2 Status after +30: ${po2CalcFull.overallStatus} (Allocated: ${po2CalcFull.totalAllocated}/50, Remaining: ${po2CalcFull.totalRemaining})`);
    if (po2CalcFull.overallStatus !== 'Stock Adjusted' || po2CalcFull.totalRemaining !== 0) {
      throw new Error('Test 5 Failed: Expected Stock Adjusted with 0 remaining');
    }

    // Verify PO 2 approval status remains Pending Approval until explicitly approved!
    const po2DbCheck = (await client.query('SELECT stock_status, verification_status, approval_status FROM public.purchase_orders WHERE id = $1', [po2Id])).rows[0];
    console.log(`PO 2 in DB: Stock: ${po2DbCheck.stock_status}, Verification: ${po2DbCheck.verification_status}, Approval: ${po2DbCheck.approval_status}`);
    if (po2DbCheck.approval_status === 'Approved') {
      throw new Error('STOCK ADJUSTED != PO APPROVED! PO must remain unapproved until explicit button click.');
    }
    console.log('✓ STOCK ADJUSTED ≠ PO APPROVED confirmed! PO requires explicit approval.\n');

    // Step 5.2: Now explicitly approve PO 2
    console.log('Action: Authorized user now clicks [ Approve ] on PO 2...');
    const approveRes2 = await approvePurchaseOrderAction(po2Id);
    if (approveRes2.error) throw new Error(`Approve failed: ${approveRes2.error}`);

    const approvedPO2 = (await client.query('SELECT stock_status, verification_status, approval_status, approved_by, approved_date FROM public.purchase_orders WHERE id = $1', [po2Id])).rows[0];
    console.log(`PO 2 after Approve: Stock: ${approvedPO2.stock_status}, Verification: ${approvedPO2.verification_status}, Approval: ${approvedPO2.approval_status}`);
    if (approvedPO2.approval_status !== 'Approved') throw new Error('Expected PO 2 approval_status = Approved');
    console.log('✓ TEST 5 PASSED: PO 2 explicitly approved after stock adjustment.\n');

    // =========================================================================
    // TEST 6: APPROVAL PREREQUISITE ENFORCEMENT
    // Cannot approve an unverified PO
    // =========================================================================
    console.log('--- TEST 6: Approval Prerequisite Enforcement ---');
    const po3Id = `po-test-wf-3-${Date.now()}`;
    await client.query(`
      INSERT INTO public.purchase_orders (
        id, po_number, customer_name, total_amount, stock_status, verification_status, approval_status, po_status, branch_code, items_json, created_at, updated_at
      ) VALUES ($1, $2, 'Customer 3', 1000, 'Available', 'Pending', 'Pending Approval', 'PENDING', $3, '[]', NOW(), NOW());
    `, [po3Id, `CPO-TEST-3-${Date.now()}`, branchCode]);

    let rejectedUnverified = false;
    const approveAttempt = await approvePurchaseOrderAction(po3Id);
    if (approveAttempt.error) {
      rejectedUnverified = true;
      console.log(`Correctly rejected approval of unverified PO: "${approveAttempt.error}"`);
    }
    if (!rejectedUnverified) {
      throw new Error('Test 6 Failed: System allowed approval of an unverified PO!');
    }
    console.log('✓ TEST 6 PASSED: Approval blocked when verification is pending.\n');

    console.log('====================================================');
    console.log('ALL PO WORKFLOW & ACTIONS TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } finally {
    // Cleanup
    await client.query("DELETE FROM public.purchase_orders WHERE id LIKE 'po-test-wf%';");
    await client.query("DELETE FROM public.products WHERE sku IN ($1, $2);", [testSku1, testSku2]);
    await client.query("DELETE FROM public.inventories WHERE sku IN ($1, $2);", [testSku1, testSku2]);
    await client.query("DELETE FROM public.stock_adjustments WHERE sku IN ($1, $2);", [testSku1, testSku2]);
    await client.end();
    process.exit(0);
  }
}

runPoWorkflowTests().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});

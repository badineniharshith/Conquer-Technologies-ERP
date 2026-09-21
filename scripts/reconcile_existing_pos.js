const { Client } = require('pg');

async function reconcile() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Running Idempotent PO Reconciliation on all existing open Purchase Orders...');

  const pos = await client.query(`
    SELECT id, po_number, customer_name, stock_status, verification_status, items_json
    FROM public.purchase_orders
    ORDER BY created_at ASC;
  `);

  console.log(`Found ${pos.rows.length} purchase orders to reconcile.`);

  let updatedCount = 0;
  for (const po of pos.rows) {
    // 1. Check or load line items
    let items = (await client.query(
      `SELECT * FROM public.purchase_order_items WHERE purchase_order_id = $1;`,
      [po.id]
    )).rows;

    if (items.length === 0 && po.items_json) {
      try {
        const parsed = typeof po.items_json === 'string' ? JSON.parse(po.items_json) : po.items_json;
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const raw of parsed) {
            const itemId = crypto.randomUUID();
            const sku = raw.sku || `ITEM-${Date.now()}`;
            const name = raw.productName || raw.name || sku;
            const qty = Number(raw.quantity || raw.requestedQty || 1);
            const price = Number(raw.unitPrice || raw.price || 0);
            const disc = Number(raw.discount || 0);
            const tax = Number(raw.tax || 18);
            const tot = Number(raw.total || (qty * price * (1 - disc / 100)));

            await client.query(`
              INSERT INTO public.purchase_order_items (
                id, purchase_order_id, po_number, sku, product_name, quantity,
                unit_price, discount, tax, total, item_status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', NOW(), NOW())
              ON CONFLICT (id) DO NOTHING;
            `, [itemId, po.id, po.po_number, sku, name, qty, price, disc, tax, tot]);
          }
          items = (await client.query(
            `SELECT * FROM public.purchase_order_items WHERE purchase_order_id = $1;`,
            [po.id]
          )).rows;
        }
      } catch (err) {
        console.error(`Error parsing items_json for PO ${po.po_number}:`, err.message);
      }
    }

    // 2. For each item, compute fulfillment without double counting
    let allCovered = true;
    let anyAdjusted = false;
    let anyPartial = false;

    for (const item of items) {
      const sku = item.sku;
      const requestedQty = Number(item.quantity || 1);

      // Check allocations
      const allocRes = await client.query(`
        SELECT COALESCE(SUM(allocated_quantity), 0) as total_alloc,
               COALESCE(SUM(CASE WHEN source_type = 'STOCK_ADJUSTMENT' THEN allocated_quantity ELSE 0 END), 0) as adj_alloc
        FROM public.purchase_order_stock_allocations
        WHERE purchase_order_id = $1 AND (purchase_order_item_id = $2 OR sku = $3);
      `, [po.id, item.id, sku]);

      const allocatedQty = Number(allocRes.rows[0]?.total_alloc || 0);
      const adjustedQty = Number(allocRes.rows[0]?.adj_alloc || 0);

      if (adjustedQty > 0) anyAdjusted = true;

      // Check available inventory (subtracting reservations and allocations of other POs)
      const invRes = await client.query(`
        SELECT COALESCE(SUM(quantity), 0) as phys, COALESCE(SUM(reserved_qty), 0) as res
        FROM public.inventories WHERE sku = $1 OR sku ILIKE $1;
      `, [sku]);
      const phys = Number(invRes.rows[0]?.phys || 0);
      const resv = Number(invRes.rows[0]?.res || 0);

      const otherAllocRes = await client.query(`
        SELECT COALESCE(SUM(allocated_quantity), 0) as total_other
        FROM public.purchase_order_stock_allocations
        WHERE sku = $1 AND purchase_order_id != $2;
      `, [sku, po.id]);
      const otherAlloc = Number(otherAllocRes.rows[0]?.total_other || 0);

      const freeStock = Math.max(0, phys - resv - otherAlloc);
      const covered = Math.min(requestedQty, allocatedQty);
      const remaining = Math.max(0, requestedQty - covered);

      let itemStatus = 'NEEDS_STOCK';
      if (covered >= requestedQty && adjustedQty > 0) {
        itemStatus = 'STOCK_ADJUSTED';
      } else if (adjustedQty > 0 && remaining > 0) {
        itemStatus = 'PARTIALLY_STOCK_ADJUSTED';
        anyPartial = true;
        allCovered = false;
      } else if (covered >= requestedQty || freeStock >= remaining) {
        itemStatus = 'IN_STOCK';
      } else {
        itemStatus = 'NEEDS_STOCK';
        allCovered = false;
      }

      await client.query(`
        UPDATE public.purchase_order_items
        SET allocated_quantity = $1,
            adjusted_quantity = $2,
            remaining_quantity = $3,
            stock_status = $4,
            updated_at = NOW()
        WHERE id = $5;
      `, [covered, adjustedQty, remaining, itemStatus, item.id]);
    }

    let poStatus = 'Insufficient';
    if (allCovered && anyAdjusted) {
      poStatus = 'Stock Adjusted';
    } else if (anyPartial || (anyAdjusted && !allCovered)) {
      poStatus = 'Partially Stock Adjusted';
    } else if (allCovered) {
      poStatus = 'Available';
    } else {
      poStatus = 'Insufficient';
    }

    await client.query(`
      UPDATE public.purchase_orders
      SET stock_status = $1,
          updated_at = NOW()
      WHERE id = $2;
    `, [poStatus, po.id]);

    updatedCount++;
  }

  console.log(`Reconciliation complete! Reconciled ${updatedCount} purchase orders.`);
  await client.end();
}

reconcile().catch(console.error);

// @ts-nocheck
import { Pool, PoolClient } from "pg";

// Global connection pool using DATABASE_URL
const globalForPg = global as unknown as { pgPool?: Pool };

function createPgPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=disable") || process.env.DATABASE_URL?.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

export function getPgPool(): Pool {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = createPgPool();
  }
  return globalForPg.pgPool;
}

export const pgPool = new Proxy({} as Pool, {
  get(_target, prop) {
    const pool = getPgPool();
    const value = (pool as any)[prop];
    return typeof value === "function" ? value.bind(pool) : value;
  },
});

export interface StockAdjustmentInput {
  sku: string;
  branchCode: string;
  quantity: number;
  type: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";
  reason: string;
  notes?: string;
  userId?: string;
  targetPoId?: string | null;
}

export interface StockAdjustmentResult {
  success: boolean;
  adjustmentId: string;
  adjustmentNumber: string;
  sku: string;
  productName: string;
  branchCode: string;
  previousStock: number;
  adjustmentQuantity: number;
  newStock: number;
  adjustedBy: string;
  adjustedOn: string;
  poImpacts: Array<{
    poId: string;
    poNumber: string;
    sku: string;
    requiredQty: number;
    fulfilledQty: number;
    allocatedNow?: number;
    remainingQty: number;
    status: string;
  }>;
}

export interface POItemStockStatus {
  itemId: string;
  sku: string;
  name: string;
  requestedQty: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  initialAvailableStock: number;
  initialAssignedQty: number;
  allocatedQty: number;
  adjustedQty: number;
  remainingQty: number;
  pendingQty: number;
  branchCode?: string | null;
  status: string;
  statusDisplay: string;
  lastAdjustmentNumber?: string | null;
  lastAdjustedAt?: string | null;
  lastAdjustedBy?: string | null;
  lastBranchCode?: string | null;
}

export interface POStockCalculationResult {
  poId: string;
  poNumber: string;
  overallStatus: string;
  overallBadge: string;
  isFullyFulfilled: boolean;
  hasAdjustment: boolean;
  totalRequested: number;
  totalAvailableAtCreation: number;
  totalInitiallyAssigned: number;
  totalAllocated: number;
  totalAdjusted: number;
  totalRemaining: number;
  totalPending: number;
  lastAdjustmentNumber?: string | null;
  lastAdjustedAt?: string | null;
  lastAdjustedBy?: string | null;
  lineItems: POItemStockStatus[];
}

export interface ProcessPendingPOsInput {
  sku: string;
  branchCode?: string;
  addedQuantity: number;
  adjustmentId?: string | null;
  adjustmentNumber?: string | null;
  operatorName?: string;
  sourceType?: string;
  client?: PoolClient;
  targetPoId?: string | null;
}

export interface PendingPOImpact {
  poId: string;
  poNumber: string;
  sku: string;
  requiredQty: number;
  fulfilledQty: number;
  allocatedNow: number;
  remainingQty: number;
  status: string;
}

/**
 * Generate a sequential, gapless adjustment number: SA-YYYY-000001
 * Uses stock_adjustment_counters with row-level lock (FOR UPDATE).
 */
export async function generateNextAdjustmentNumber(client: PoolClient, year = new Date().getFullYear()): Promise<string> {
  // Ensure counter row exists
  await client.query(
    `INSERT INTO public.stock_adjustment_counters (year, last_number)
     VALUES ($1, 0)
     ON CONFLICT (year) DO NOTHING;`,
    [year]
  );

  // Lock and increment
  const res = await client.query(
    `UPDATE public.stock_adjustment_counters
     SET last_number = last_number + 1
     WHERE year = $1
     RETURNING last_number;`,
    [year]
  );

  const seq = res.rows[0].last_number;
  return `SA-${year}-${String(seq).padStart(6, "0")}`;
}

/**
 * Single authoritative backend service for PO Stock Calculation.
 * Strictly enforces NO DOUBLE COUNTING:
 * - Physical Stock = inventories.quantity
 * - Reserved Stock = active sales holds
 * - PO Allocated Stock = units locked by purchase_order_stock_allocations
 * - Available Stock = Physical Stock - Reserved Stock - PO Allocated Stock
 */
export async function calculatePOStockStatus(
  poIdentifier: string,
  providedClient?: PoolClient,
  skipAutoAllocate: boolean = false
): Promise<POStockCalculationResult | null> {
  const client = providedClient || (await pgPool.connect());
  const shouldRelease = !providedClient;

  try {
    const poRes = await client.query(
      `SELECT * FROM public.purchase_orders 
       WHERE id = $1 OR po_number = $1 OR po_number ILIKE $1 
       LIMIT 1;`,
      [poIdentifier.trim()]
    );

    if (poRes.rows.length === 0) return null;
    const po = poRes.rows[0];

    // Load PO line items from public.purchase_order_items
    const poiRes = await client.query(
      `SELECT * FROM public.purchase_order_items 
       WHERE purchase_order_id = $1 
       ORDER BY created_at ASC;`,
      [po.id]
    );

    let itemsToProcess = poiRes.rows;

    // Fallback: If no purchase_order_items exist, parse items_json
    if (itemsToProcess.length === 0 && po.items_json) {
      try {
        const parsed = typeof po.items_json === "string" ? JSON.parse(po.items_json) : po.items_json;
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const raw of parsed) {
            const itemId = crypto.randomUUID();
            const sku = raw.sku || `ITEM-${Date.now()}`;
            const name = raw.productName || raw.name || sku;
            const qty = Number(raw.quantity || raw.requestedQty || 1);
            const price = Number(raw.unitPrice || raw.price || 0);
            const disc = Number(raw.discount || 0);
            const tax = Number(raw.tax || 18);
            const tot = Number(raw.total || qty * price * (1 - disc / 100));

            await client.query(
              `INSERT INTO public.purchase_order_items (
                id, purchase_order_id, po_number, sku, product_name, quantity, 
                unit_price, discount, tax, total, item_status, branch_code, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', $11, NOW(), NOW())
              ON CONFLICT (id) DO NOTHING;`,
              [itemId, po.id, po.po_number, sku, name, qty, price, disc, tax, tot, po.branch_code || "HYD-HQ"]
            );
          }
          const reload = await client.query(
            `SELECT * FROM public.purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at ASC;`,
            [po.id]
          );
          itemsToProcess = reload.rows;
        }
      } catch (err) {
        console.error("Error parsing items_json for PO", po.po_number, err);
      }
    }

    // Self-healing check: If the PO has unfulfilled items and is open, allocate available stock immediately
    if (!skipAutoAllocate && po.verification_status !== "Cancelled" && po.verification_status !== "Delivered") {
      const hasUnfulfilled = itemsToProcess.some(
        (it) => Number(it.remaining_quantity ?? (it.quantity - (it.allocated_quantity || 0))) > 0 || !it.allocated_quantity
      );
      if (hasUnfulfilled) {
        try {
          await allocateStockForPO(po.id, client);
          // Reload items after auto-allocation
          const reloadPoi = await client.query(
            `SELECT * FROM public.purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at ASC;`,
            [po.id]
          );
          if (reloadPoi.rows.length > 0) {
            itemsToProcess = reloadPoi.rows;
          }
        } catch (e: any) {
          console.error("Auto-allocation check error:", e.message);
        }
      }
    }

    // Load all allocations for this PO
    const allocRes = await client.query(
      `SELECT * FROM public.purchase_order_stock_allocations 
       WHERE purchase_order_id = $1 
       ORDER BY created_at ASC;`,
      [po.id]
    );
    const poAllocations = allocRes.rows;

    let hasAnyShortage = false;
    let hasAnyAdjustment = false;
    let hasAnyPartiallyAdjusted = false;
    let totalRequested = 0;
    let totalAvailableAtCreation = 0;
    let totalInitiallyAssigned = 0;
    let totalAllocated = 0;
    let totalAdjusted = 0;
    let totalRemaining = 0;
    let lastAdjNumber: string | null = po.last_adjustment_number || null;
    let lastAdjDate: string | null = po.last_adjusted_at ? new Date(po.last_adjusted_at).toISOString() : null;
    const lastAdjBy: string | null = po.last_adjusted_by || null;

    const lineItems: POItemStockStatus[] = [];

    for (const item of itemsToProcess) {
      const sku = item.sku;
      const requestedQty = Number(item.quantity || 1);
      totalRequested += requestedQty;

      // 1. Sum existing allocations for this item
      const itemAllocations = poAllocations.filter(
        (a) => a.purchase_order_item_id === item.id || (!a.purchase_order_item_id && a.sku === sku)
      );

      const allocatedQty = itemAllocations.reduce((sum, a) => sum + Number(a.allocated_quantity || 0), 0);
      const adjustmentAllocations = itemAllocations.filter((a) => a.source_type === "STOCK_ADJUSTMENT" || a.source_type === "STOCK_IN" || a.source_type === "STOCK_TRANSFER");
      const adjustedQty = adjustmentAllocations.reduce((sum, a) => sum + Number(a.allocated_quantity || 0), 0);

      if (adjustmentAllocations.length > 0) {
        hasAnyAdjustment = true;
        const lastA = adjustmentAllocations[adjustmentAllocations.length - 1];
        lastAdjNumber = lastA.adjustment_number || lastAdjNumber;
        lastAdjDate = lastA.created_at ? new Date(lastA.created_at).toISOString() : lastAdjDate;
      }

      // 2. Fetch inventory for this SKU
      const invRes = await client.query(
        `SELECT 
           COALESCE(SUM(quantity), 0) as physical_stock,
           COALESCE(SUM(reserved_qty), 0) as reserved_stock,
           COALESCE(SUM(available_qty), 0) as available_stock
         FROM public.inventories 
         WHERE sku = $1 OR sku ILIKE $1;`,
        [sku]
      );
      const physicalStock = Number(invRes.rows[0]?.physical_stock || 0);
      const reservedStock = Number(invRes.rows[0]?.reserved_stock || 0);

      // NO DOUBLE COUNTING: Calculate allocations from OTHER POs for this SKU
      const otherAllocRes = await client.query(
        `SELECT COALESCE(SUM(allocated_quantity), 0) as total_other_alloc
         FROM public.purchase_order_stock_allocations
         WHERE sku = $1 AND purchase_order_id != $2;`,
        [sku, po.id]
      );
      const otherPOAllocated = Number(otherAllocRes.rows[0]?.total_other_alloc || 0);

      // Available stock free to cover requirements
      const freeAvailableStock = Math.max(0, physicalStock - reservedStock - otherPOAllocated);

      // Calculate fulfilled and remaining
      const totalCovered = Math.min(requestedQty, allocatedQty);
      const remainingQty = Math.max(0, requestedQty - totalCovered);

      const initAvail = Number(item.initial_available_stock ?? Math.max(0, physicalStock - reservedStock));
      const initAssigned = Number(item.initial_assigned_quantity ?? Math.max(0, totalCovered - adjustedQty));

      totalAvailableAtCreation += initAvail;
      totalInitiallyAssigned += initAssigned;
      totalAllocated += totalCovered;
      totalAdjusted += Math.min(requestedQty, adjustedQty);
      totalRemaining += remainingQty;

      // Determine item status adhering to required workflow statuses
      let status: string;
      let statusDisplay: string;

      if (totalCovered >= requestedQty && adjustedQty > 0) {
        status = "STOCK ADJUSTED & ASSIGNED";
        statusDisplay = `✓ Stock Adjusted & Assigned (${adjustedQty} units covered)`;
      } else if (totalCovered >= requestedQty) {
        status = "ASSIGNED";
        statusDisplay = "Assigned";
      } else if (adjustedQty > 0 && remainingQty > 0) {
        status = "PARTIALLY ASSIGNED / PENDING STOCK";
        statusDisplay = `Partially Assigned (${totalCovered}/${requestedQty} fulfilled, ${remainingQty} pending)`;
        hasAnyPartiallyAdjusted = true;
        hasAnyShortage = true;
      } else {
        status = "PENDING_STOCK";
        statusDisplay = `Pending Stock (${remainingQty} units shortage)`;
        hasAnyShortage = true;
      }

      lineItems.push({
        itemId: item.id,
        sku,
        name: item.product_name || sku,
        requestedQty,
        unitPrice: Number(item.unit_price || 0),
        discount: Number(item.discount || 0),
        tax: Number(item.tax || 18),
        total: Number(item.total || 0),
        currentStock: physicalStock,
        reservedStock,
        availableStock: freeAvailableStock,
        initialAvailableStock: initAvail,
        initialAssignedQty: initAssigned,
        allocatedQty: totalCovered,
        adjustedQty,
        remainingQty,
        pendingQty: remainingQty,
        branchCode: item.branch_code || po.branch_code || "HYD-HQ",
        status,
        statusDisplay,
        lastAdjustmentNumber: lastAdjNumber,
        lastAdjustedAt: lastAdjDate,
        lastAdjustedBy: lastAdjBy,
      });

      // Update purchase_order_items row
      await client.query(
        `UPDATE public.purchase_order_items
         SET allocated_quantity = $1,
             adjusted_quantity = $2,
             remaining_quantity = $3,
             stock_status = $4,
             last_adjustment_number = $5,
             last_adjusted_at = $6,
             updated_at = NOW()
         WHERE id = $7;`,
        [totalCovered, adjustedQty, remainingQty, status, lastAdjNumber, lastAdjDate ? new Date(lastAdjDate) : null, item.id]
      );
    }

    // Determine Overall PO Status
    let overallStatus: string;
    let overallBadge: string;

    if (!hasAnyShortage && (hasAnyAdjustment || po.stock_status === "STOCK ADJUSTED & ASSIGNED")) {
      overallStatus = "STOCK ADJUSTED & ASSIGNED";
      overallBadge = "bg-emerald-100 text-emerald-800 border-emerald-300";
    } else if (!hasAnyShortage) {
      overallStatus = "ASSIGNED";
      overallBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (totalAllocated > 0 || hasAnyAdjustment) {
      overallStatus = "PARTIALLY ASSIGNED";
      overallBadge = "bg-amber-100 text-amber-800 border-amber-300";
    } else {
      overallStatus = "PENDING STOCK";
      overallBadge = "bg-rose-50 text-rose-700 border-rose-200";
    }

    // Update public.purchase_orders
    await client.query(
      `UPDATE public.purchase_orders
       SET stock_status = $1,
           last_adjustment_number = $2,
           last_adjusted_at = $3,
           last_adjusted_by = $4,
           updated_at = NOW()
       WHERE id = $5;`,
      [overallStatus, lastAdjNumber, lastAdjDate ? new Date(lastAdjDate) : null, lastAdjBy, po.id]
    );

    return {
      poId: po.id,
      poNumber: po.po_number,
      overallStatus,
      stockStatus: overallStatus,
      overallBadge,
      isFullyFulfilled: !hasAnyShortage,
      isStockAvailable: !hasAnyShortage,
      hasAdjustment: hasAnyAdjustment,
      totalRequested,
      totalAvailableAtCreation,
      totalInitiallyAssigned,
      totalAllocated,
      totalAdjusted,
      totalRemaining,
      totalPending: totalRemaining,
      lastAdjustmentNumber: lastAdjNumber,
      lastAdjustedAt: lastAdjDate,
      lastAdjustedBy: lastAdjBy,
      lineItems,
    };
  } finally {
    if (shouldRelease) client.release();
  }
}

/**
 * 1. PO Creation Allocation Service
 * When a Purchase Order is created:
 * - Compares requestedQuantity with availableStock for every PO line.
 * - If sufficient stock is available:
 *   - Immediately assigns required quantity.
 *   - Deducts allocated quantity from available stock.
 *   - Marks line as ASSIGNED.
 * - If sufficient stock is NOT available:
 *   - Allocates whatever stock is available.
 *   - Keeps remaining quantity pending.
 *   - Marks line as PENDING_STOCK.
 * - Enforces DB transactions and row locking.
 */
export async function allocateStockForPO(
  poIdentifier: string,
  providedClient?: PoolClient
): Promise<POStockCalculationResult | null> {
  const client = providedClient || (await pgPool.connect());
  const shouldRelease = !providedClient;
  let inTransaction = false;

  try {
    if (!providedClient) {
      await client.query("BEGIN;");
      inTransaction = true;
    }

    const poRes = await client.query(
      `SELECT * FROM public.purchase_orders 
       WHERE id = $1 OR po_number = $1 OR po_number ILIKE $1 
       FOR UPDATE;`,
      [poIdentifier.trim()]
    );

    if (poRes.rows.length === 0) {
      if (inTransaction) await client.query("ROLLBACK;");
      return null;
    }
    const po = poRes.rows[0];

    // Load PO line items
    let poiRes = await client.query(
      `SELECT * FROM public.purchase_order_items 
       WHERE purchase_order_id = $1 
       ORDER BY created_at ASC 
       FOR UPDATE;`,
      [po.id]
    );

    // If items_json exists but no purchase_order_items rows, create them idempotently
    if (poiRes.rows.length === 0 && po.items_json) {
      try {
        const parsed = typeof po.items_json === "string" ? JSON.parse(po.items_json) : po.items_json;
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const raw of parsed) {
            const itemId = crypto.randomUUID();
            const sku = raw.sku || `ITEM-${Date.now()}`;
            const name = raw.productName || raw.name || sku;
            const qty = Number(raw.quantity || raw.requestedQty || 1);
            const price = Number(raw.unitPrice || raw.price || 0);
            const disc = Number(raw.discount || 0);
            const tax = Number(raw.tax || 18);
            const tot = Number(raw.total || qty * price * (1 - disc / 100));

            await client.query(
              `INSERT INTO public.purchase_order_items (
                id, purchase_order_id, po_number, sku, product_name, quantity, 
                unit_price, discount, tax, total, item_status, branch_code, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', $11, NOW(), NOW())
              ON CONFLICT (id) DO NOTHING;`,
              [itemId, po.id, po.po_number, sku, name, qty, price, disc, tax, tot, po.branch_code || "HYD-HQ"]
            );
          }
          poiRes = await client.query(
            `SELECT * FROM public.purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at ASC FOR UPDATE;`,
            [po.id]
          );
        }
      } catch (err) {
        console.error("Error parsing items_json for PO", po.po_number, err);
      }
    }

    const branchCode = (po.branch_code || "HYD-HQ").trim();
    let totalRequested = 0;
    let totalAssigned = 0;
    let totalPending = 0;
    let hasShortage = false;

    for (const item of poiRes.rows) {
      const sku = item.sku.trim();
      const reqQty = Number(item.quantity || 1);
      totalRequested += reqQty;

      // Lock inventory row for this SKU and branch
      const invRes = await client.query(
        `SELECT * FROM public.inventories 
         WHERE (sku = $1 OR sku ILIKE $1) AND (branch_code = $2 OR branch_id = $2)
         FOR UPDATE;`,
        [sku, branchCode]
      );

      let invRecordId: string;
      let physicalStock = 0;
      let reservedStock = 0;
      let allocatedStock = 0;

      if (invRes.rows.length === 0) {
        const prodRes = await client.query(
          `SELECT id, name FROM public.products WHERE sku = $1 OR sku ILIKE $1 LIMIT 1;`,
          [sku]
        );
        const prodName = prodRes.rows[0]?.name || item.product_name || sku;
        const prodId = prodRes.rows[0]?.id || null;

        invRecordId = crypto.randomUUID();
        await client.query(
          `INSERT INTO public.inventories (
            id, product_id, branch_id, branch_code, sku, item_name,
            quantity, available_qty, available_stock, reserved_qty, allocated_qty, created_at, updated_at
          ) VALUES ($1, $2, $3, $3, $4, $5, 0, 0, 0, 0, 0, NOW(), NOW());`,
          [invRecordId, prodId, branchCode, sku, prodName]
        );
      } else {
        const inv = invRes.rows[0];
        invRecordId = inv.id;
        physicalStock = Number(inv.quantity || 0);
        reservedStock = Number(inv.reserved_qty || 0);
        allocatedStock = Number(inv.allocated_qty || 0);
      }

      // Available free stock
      const availableStock = Math.max(0, physicalStock - reservedStock - allocatedStock);

      const currAllocated = Number(item.allocated_quantity || 0);
      const remainingNeeded = Math.max(0, reqQty - currAllocated);

      if (remainingNeeded <= 0) {
        totalAssigned += currAllocated;
        continue;
      }

      const assignUnits = Math.min(remainingNeeded, availableStock);
      const newTotalAllocated = currAllocated + assignUnits;
      const newPending = reqQty - newTotalAllocated;
      if (newPending > 0) hasShortage = true;

      totalAssigned += newTotalAllocated;
      totalPending += newPending;

      // Deduct assigned units from available stock by increasing inventory allocated_qty
      if (assignUnits > 0) {
        const newAllocated = allocatedStock + assignUnits;
        const newAvailable = Math.max(0, physicalStock - reservedStock - newAllocated);
        await client.query(
          `UPDATE public.inventories 
           SET allocated_qty = $1,
               available_qty = $2,
               available_stock = $2,
               updated_at = NOW()
           WHERE id = $3;`,
          [newAllocated, newAvailable, invRecordId]
        );

        // Record stock allocation row
        const allocId = crypto.randomUUID();
        await client.query(
          `INSERT INTO public.purchase_order_stock_allocations (
            id, purchase_order_id, purchase_order_item_id, sku,
            branch_code, allocated_quantity, source_type, source_reference, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'INITIAL_CREATION', 'PO_CREATION', NOW());`,
          [allocId, po.id, item.id, sku, branchCode, assignUnits]
        );
      }

      const lineStatus = newPending === 0 ? "ASSIGNED" : (newTotalAllocated > 0 ? "PARTIALLY ASSIGNED" : "PENDING STOCK");
      const initAvailVal = Number(item.initial_available_stock ?? availableStock);
      const initAssignedVal = Number(item.initial_assigned_quantity ?? (currAllocated > 0 ? item.initial_assigned_quantity : assignUnits));

      // Update purchase_order_items row
      await client.query(
        `UPDATE public.purchase_order_items
         SET initial_available_stock = $1,
             initial_assigned_quantity = $2,
             allocated_quantity = $3,
             remaining_quantity = $4,
             stock_status = $5,
             item_status = $5,
             branch_code = $6,
             updated_at = NOW()
         WHERE id = $7;`,
        [initAvailVal, initAssignedVal, newTotalAllocated, newPending, lineStatus, branchCode, item.id]
      );
    }

    // Determine overall PO status per requirements:
    // PENDING STOCK, PARTIALLY ASSIGNED, ASSIGNED, STOCK ADJUSTED & ASSIGNED
    let overallStatus: string;
    let remarks: string;

    if (!hasShortage && totalPending === 0) {
      overallStatus = "ASSIGNED";
      remarks = `Allocated → ${totalAssigned}/${totalRequested} assigned immediately. Status: ASSIGNED.`;
    } else if (totalAssigned > 0) {
      overallStatus = "PARTIALLY ASSIGNED";
      remarks = `Allocated → ${totalAssigned} assigned, ${totalPending} pending (Requested: ${totalRequested}). Status: PARTIALLY ASSIGNED.`;
    } else {
      overallStatus = "PENDING STOCK";
      remarks = `Allocated → 0 assigned, ${totalPending} pending (Requested: ${totalRequested}, Available: 0). Status: PENDING STOCK.`;
    }

    await client.query(
      `UPDATE public.purchase_orders
       SET stock_status = $1,
           updated_at = NOW()
       WHERE id = $2;`,
      [overallStatus, po.id]
    );

    // Insert timeline history log
    const histId = crypto.randomUUID();
    await client.query(
      `INSERT INTO public.purchase_order_status_history (
        id, purchase_order_id, status, remarks, updated_by_name, created_at
      ) VALUES ($1, $2, $3, $4, 'System Stock Engine', NOW());`,
      [histId, po.id, overallStatus, remarks]
    );

    if (inTransaction) {
      await client.query("COMMIT;");
      inTransaction = false;
    }

    return await calculatePOStockStatus(po.id, client, true);
  } catch (err) {
    if (inTransaction) {
      await client.query("ROLLBACK;");
    }
    throw err;
  } finally {
    if (shouldRelease) client.release();
  }
}

/**
 * 3. Automatic Adjustment When New Stock Arrives Handler
 * Triggered on every stock receipt, manual adjustment, transfer, or inventory increase:
 * - Finds pending PO lines for that product in FIFO order (oldest created_at first).
 * - Allocates newly available quantity to pending orders.
 * - Increases assignedQuantity (allocated_quantity) and adjusted_quantity.
 * - Decreases pendingQuantity (remaining_quantity).
 * - Decreases available inventory by the allocated amount (increases allocated_qty).
 * - Updates PO and PO line statuses atomically.
 */
export async function processPendingPOsAfterStockIncrease(
  input: ProcessPendingPOsInput
): Promise<{
  allocatedUnits: number;
  unallocatedRemaining: number;
  poImpacts: PendingPOImpact[];
}> {
  const client = input.client || (await pgPool.connect());
  const shouldRelease = !input.client;
  let inTransaction = false;

  const sku = input.sku.trim();
  const branchCode = (input.branchCode || "HYD-HQ").trim();
  const addedQuantity = Number(input.addedQuantity);
  const operatorName = input.operatorName || "Operations Executive";
  const adjustmentId = input.adjustmentId || null;
  const adjustmentNumber = input.adjustmentNumber || "INWARD-STOCK";
  const sourceType = input.sourceType || "STOCK_ADJUSTMENT";

  const targetPoId = input.targetPoId?.trim() || null;

  const poImpacts: PendingPOImpact[] = [];
  let unallocatedUnits = addedQuantity;

  if (addedQuantity <= 0) {
    return { allocatedUnits: 0, unallocatedRemaining: 0, poImpacts: [] };
  }

  try {
    if (!input.client) {
      await client.query("BEGIN;");
      inTransaction = true;
    }

    // 1. Lock inventory row for this SKU and branch
    const invRes = await client.query(
      `SELECT * FROM public.inventories 
       WHERE (sku = $1 OR sku ILIKE $1) AND (branch_code = $2 OR branch_id = $2)
       FOR UPDATE;`,
      [sku, branchCode]
    );

    let currentPhysical = 0;
    let currentReserved = 0;
    let currentAllocated = 0;
    let invRecordId: string | null = null;

    if (invRes.rows.length > 0) {
      const inv = invRes.rows[0];
      invRecordId = inv.id;
      currentPhysical = Number(inv.quantity || 0);
      currentReserved = Number(inv.reserved_qty || 0);
      currentAllocated = Number(inv.allocated_qty || 0);
    }

    let openPoItems: any[] = [];

    if (targetPoId) {
      // 2a. TARGETED PO: Prioritize the selected PO strictly
      const targetRes = await client.query(
        `SELECT poi.id as item_id, poi.quantity as requested_qty, poi.allocated_quantity,
                poi.adjusted_quantity, poi.remaining_quantity, poi.initial_assigned_quantity,
                po.id as po_id, po.po_number, po.date_received, po.created_at, po.stock_status as po_stock_status,
                po.verification_status
         FROM public.purchase_order_items poi
         JOIN public.purchase_orders po ON po.id = poi.purchase_order_id
         WHERE (po.id = $1 OR po.po_number = $1 OR po.po_number ILIKE $1)
           AND (poi.sku = $2 OR poi.sku ILIKE $2)
         ORDER BY poi.created_at ASC
         FOR UPDATE OF poi, po;`,
        [targetPoId, sku]
      );

      if (targetRes.rows.length === 0) {
        throw new Error(`Selected Purchase Order does not contain product ${sku}.`);
      }

      const targetRow = targetRes.rows[0];
      if (['Delivered', 'Cancelled'].includes(targetRow.verification_status)) {
        throw new Error(`Purchase Order ${targetRow.po_number} is ${targetRow.verification_status} and cannot receive stock.`);
      }

      const reqQty = Number(targetRow.requested_qty || 1);
      const currAlloc = Number(targetRow.allocated_quantity || 0);
      const shortage = Number(targetRow.remaining_quantity ?? Math.max(0, reqQty - currAlloc));

      if (shortage <= 0) {
        throw new Error(`Purchase Order ${targetRow.po_number} has no pending requirement for product ${sku}. Already assigned ${currAlloc}/${reqQty}.`);
      }

      openPoItems = [targetRow];
    } else {
      // 2b. NO PO SELECTED: Query open PO lines needing this SKU FIFO
      const openPoItemsRes = await client.query(
        `SELECT poi.id as item_id, poi.quantity as requested_qty, poi.allocated_quantity,
                poi.adjusted_quantity, poi.remaining_quantity, poi.initial_assigned_quantity,
                po.id as po_id, po.po_number, po.date_received, po.created_at, po.stock_status as po_stock_status
         FROM public.purchase_order_items poi
         JOIN public.purchase_orders po ON po.id = poi.purchase_order_id
         WHERE (poi.sku = $1 OR poi.sku ILIKE $1)
           AND COALESCE(poi.remaining_quantity, poi.quantity - COALESCE(poi.allocated_quantity, 0)) > 0
           AND po.verification_status NOT IN ('Delivered', 'Cancelled')
         ORDER BY po.created_at ASC 
         FOR UPDATE OF poi;`,
        [sku]
      );
      openPoItems = openPoItemsRes.rows;
    }

    let totalAllocatedNow = 0;

    for (const poItem of openPoItems) {
      if (unallocatedUnits <= 0) break;

      const reqQty = Number(poItem.requested_qty || 1);
      const currAlloc = Number(poItem.allocated_quantity || 0);
      const currAdj = Number(poItem.adjusted_quantity || 0);
      const shortage = Number(poItem.remaining_quantity ?? Math.max(0, reqQty - currAlloc));

      if (shortage <= 0) continue;

      const allocateUnits = Math.min(shortage, unallocatedUnits);
      unallocatedUnits -= allocateUnits;
      totalAllocatedNow += allocateUnits;

      const newAllocated = currAlloc + allocateUnits;
      const newAdjusted = currAdj + allocateUnits;
      const newRemaining = Math.max(0, reqQty - newAllocated);

      const newItemStatus = newRemaining === 0 ? "STOCK ADJUSTED & ASSIGNED" : "PARTIALLY ASSIGNED";

      // Update purchase_order_items row
      await client.query(
        `UPDATE public.purchase_order_items
         SET allocated_quantity = $1,
             adjusted_quantity = $2,
             remaining_quantity = $3,
             stock_status = $4,
             item_status = $4,
             last_adjustment_number = $5,
             last_adjusted_at = NOW(),
             last_adjusted_by = $6,
             updated_at = NOW()
         WHERE id = $7;`,
        [newAllocated, newAdjusted, newRemaining, newItemStatus, adjustmentNumber, operatorName, poItem.item_id]
      );

      // Insert purchase_order_stock_allocations record
      const allocId = crypto.randomUUID();
      await client.query(
        `INSERT INTO public.purchase_order_stock_allocations (
          id, purchase_order_id, purchase_order_item_id, adjustment_id,
          adjustment_number, sku, branch_code, allocated_quantity,
          source_type, source_reference, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW());`,
        [
          allocId,
          poItem.po_id,
          poItem.item_id,
          adjustmentId,
          adjustmentNumber,
          sku,
          branchCode,
          allocateUnits,
          sourceType,
          adjustmentNumber,
        ]
      );

      // Check overall status of this purchase order
      const allItemsRes = await client.query(
        `SELECT quantity, allocated_quantity, adjusted_quantity, remaining_quantity 
         FROM public.purchase_order_items 
         WHERE purchase_order_id = $1;`,
        [poItem.po_id]
      );

      let allItemsDone = true;
      let anyItemAdjusted = false;
      let totalAllocatedForPO = 0;

      for (const it of allItemsRes.rows) {
        const rem = Number(it.remaining_quantity ?? Math.max(0, (it.quantity || 0) - (it.allocated_quantity || 0)));
        if (rem > 0) {
          allItemsDone = false;
        }
        if (Number(it.adjusted_quantity || 0) > 0) {
          anyItemAdjusted = true;
        }
        totalAllocatedForPO += Number(it.allocated_quantity || 0);
      }

      let newPoStatus: string;
      if (allItemsDone) {
        newPoStatus = anyItemAdjusted ? "STOCK ADJUSTED & ASSIGNED" : "ASSIGNED";
      } else {
        newPoStatus = totalAllocatedForPO > 0 ? "PARTIALLY ASSIGNED" : "PENDING STOCK";
      }

      await client.query(
        `UPDATE public.purchase_orders
         SET stock_status = $1,
             last_adjustment_number = $2,
             last_adjusted_at = NOW(),
             last_adjusted_by = $3,
             updated_at = NOW()
         WHERE id = $4;`,
        [newPoStatus, adjustmentNumber, operatorName, poItem.po_id]
      );

      // Insert into purchase_order_status_history
      const histId = crypto.randomUUID();
      const statusLabel = newPoStatus;
      const remarks = `Stock adjustment (${adjustmentNumber}) added ${addedQuantity} units → ${allocateUnits} allocated to ${poItem.po_number}. Remaining pending: ${newRemaining}. Status: ${newPoStatus}`;

      await client.query(
        `INSERT INTO public.purchase_order_status_history (
          id, purchase_order_id, status, remarks, updated_by_name, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW());`,
        [histId, poItem.po_id, statusLabel, remarks, operatorName]
      );

      poImpacts.push({
        poId: poItem.po_id,
        poNumber: poItem.po_number,
        sku,
        requiredQty: reqQty,
        fulfilledQty: newAllocated,
        allocatedNow: allocateUnits,
        remainingQty: newRemaining,
        status: newPoStatus,
      });

      // If a specific PO was selected, do not allocate surplus to unrelated POs
      if (targetPoId) {
        break;
      }
    }

    // Update inventory allocated_qty to prevent double allocation
    if (invRecordId && totalAllocatedNow > 0) {
      const updatedAllocated = currentAllocated + totalAllocatedNow;
      const updatedAvailable = Math.max(0, currentPhysical - currentReserved - updatedAllocated);
      await client.query(
        `UPDATE public.inventories
         SET allocated_qty = $1,
             available_qty = $2,
             available_stock = $2,
             updated_at = NOW()
         WHERE id = $3;`,
        [updatedAllocated, updatedAvailable, invRecordId]
      );
    }

    if (inTransaction) {
      await client.query("COMMIT;");
      inTransaction = false;
    }

    return {
      allocatedUnits: totalAllocatedNow,
      unallocatedRemaining: unallocatedUnits,
      poImpacts,
    };
  } catch (err) {
    if (inTransaction) {
      await client.query("ROLLBACK;");
    }
    throw err;
  } finally {
    if (shouldRelease) client.release();
  }
}

/**
 * Execute an atomic stock adjustment in PostgreSQL.
 * Safe, concurrency-guaranteed via row-locking (FOR UPDATE), and reconciles with open POs.
 */
export async function executeStockAdjustment(
  input: StockAdjustmentInput,
  currentUser?: { email?: string; name?: string }
): Promise<StockAdjustmentResult> {
  const client = await pgPool.connect();
  const operatorName = currentUser?.name || currentUser?.email || (input as any).performedBy || "Operations Executive";
  const userIdentifier = currentUser?.email || input.userId || "operations@conquererp.com";

  try {
    await client.query("BEGIN;");

    const sku = input.sku.trim();
    const branchCode = (input.branchCode || "HYD-HQ").trim();
    const quantity = Number(input.quantity);
    const type = input.type;

    if (!sku) throw new Error("SKU is required.");
    if (!quantity || quantity <= 0) throw new Error("Quantity must be greater than 0.");
    if (!input.reason?.trim()) throw new Error("Reason is required for audit.");

    // 1. Resolve product
    const prodRes = await client.query(
      `SELECT id, name FROM public.products WHERE sku = $1 OR sku ILIKE $1 LIMIT 1;`,
      [sku]
    );
    const product = prodRes.rows[0];
    const productName = product?.name || sku;
    const productId = product?.id || null;

    // 2. Resolve branch ID
    const branchRes = await client.query(
      `SELECT id, name FROM public.branches WHERE name = $1 OR id::text = $1 LIMIT 1;`,
      [branchCode]
    );
    const branchId = branchRes.rows[0]?.id || null;
    const canonicalBranchCode = branchRes.rows[0]?.name || branchCode;

    // 3. Lock inventory row FOR UPDATE
    const invRes = await client.query(
      `SELECT * FROM public.inventories 
       WHERE (sku = $1 OR sku ILIKE $1) AND (branch_code = $2 OR branch_id = $3)
       FOR UPDATE;`,
      [sku, canonicalBranchCode, branchId]
    );

    let currentPhysical = 0;
    let currentReserved = 0;
    let currentAllocated = 0;
    let invRecordId: string;

    if (invRes.rows.length === 0) {
      invRecordId = crypto.randomUUID();
      await client.query(
        `INSERT INTO public.inventories (
          id, product_id, branch_id, branch_code, sku, item_name,
          quantity, available_qty, available_stock, reserved_qty, allocated_qty, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0, 0, 0, NOW(), NOW());`,
        [invRecordId, productId, branchId, canonicalBranchCode, sku, productName]
      );
    } else {
      const inv = invRes.rows[0];
      invRecordId = inv.id;
      currentPhysical = Number(inv.quantity || 0);
      currentReserved = Number(inv.reserved_qty || 0);
      currentAllocated = Number(inv.allocated_qty || 0);
    }

    // 4. Calculate new stock quantity
    let newPhysical: number;
    if (type === "STOCK_IN") {
      newPhysical = currentPhysical + quantity;
    } else if (type === "STOCK_OUT") {
      const availableToReduce = currentPhysical - currentReserved - currentAllocated;
      if (availableToReduce < quantity) {
        throw new Error(
          `Insufficient available stock for Stock Out. Physical: ${currentPhysical}, Reserved: ${currentReserved}, Allocated: ${currentAllocated}, Free: ${availableToReduce}, Requested: ${quantity}`
        );
      }
      newPhysical = currentPhysical - quantity;
    } else {
      // ADJUSTMENT (level reset)
      newPhysical = quantity;
    }

    const newAvailable = Math.max(0, newPhysical - currentReserved - currentAllocated);

    // 5. Update inventories
    await client.query(
      `UPDATE public.inventories
       SET quantity = $1,
           available_qty = $2,
           available_stock = $2,
           branch_code = $3,
           updated_at = NOW()
       WHERE id = $4;`,
      [newPhysical, newAvailable, canonicalBranchCode, invRecordId]
    );

    // 6. Generate sequential adjustment number
    const adjustmentNumber = await generateNextAdjustmentNumber(client);
    const adjustmentId = crypto.randomUUID();

    // 7. Insert stock_adjustments record
    const refType = input.targetPoId ? "PURCHASE_ORDER" : "MANUAL_ADJUSTMENT";
    const refId = input.targetPoId ? input.targetPoId.trim() : null;

    await client.query(
      `INSERT INTO public.stock_adjustments (
        id, adjustment_number, sku, product_id, branch_id, branch_code,
        adjustment_type, quantity, previous_quantity, new_quantity,
        reason, notes, reference_type, reference_id, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW());`,
      [
        adjustmentId,
        adjustmentNumber,
        sku,
        productId,
        branchId,
        canonicalBranchCode,
        type,
        quantity,
        currentPhysical,
        newPhysical,
        input.reason.trim(),
        input.notes?.trim() || null,
        refType,
        refId,
        operatorName,
      ]
    );

    // 8. Insert inventory_movements record
    await client.query(
      `INSERT INTO public.inventory_movements (
        sku, branch_code, type, quantity, details, user_id, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW());`,
      [
        sku,
        canonicalBranchCode,
        type === "STOCK_IN" ? "ADDITION" : type === "STOCK_OUT" ? "REDUCTION" : "ADJUSTMENT",
        type === "STOCK_OUT" ? -quantity : quantity,
        `[${adjustmentNumber}] ${input.reason.trim()}${input.notes ? " - " + input.notes.trim() : ""}`,
        userIdentifier,
      ]
    );

    // 9. RECONCILIATION WITH OPEN PURCHASE ORDERS (Targeted PO or FIFO)
    let poImpacts: any[] = [];
    if (type === "STOCK_IN" || (type === "ADJUSTMENT" && newPhysical > currentPhysical)) {
      const addedQuantity = type === "STOCK_IN" ? quantity : newPhysical - currentPhysical;
      const processRes = await processPendingPOsAfterStockIncrease({
        sku,
        branchCode: canonicalBranchCode,
        addedQuantity,
        adjustmentId,
        adjustmentNumber,
        operatorName,
        sourceType: "STOCK_ADJUSTMENT",
        client,
        targetPoId: input.targetPoId || null,
      });
      poImpacts = processRes.poImpacts;
    }

    await client.query("COMMIT;");

    const nowFormatted = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());

    return {
      success: true,
      adjustmentId,
      adjustmentNumber,
      sku,
      productName,
      branchCode: canonicalBranchCode,
      previousStock: currentPhysical,
      adjustmentQuantity: quantity,
      newStock: newPhysical,
      adjustedBy: operatorName,
      adjustedOn: nowFormatted,
      poImpacts,
    };
  } catch (err) {
    await client.query("ROLLBACK;");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Idempotent One-Time and On-Demand Reconciliation for all existing open Purchase Orders.
 */
export async function reconcileAllOpenPurchaseOrders(): Promise<{
  scanned: number;
  adjustedCount: number;
  inStockCount: number;
  shortageCount: number;
}> {
  const client = await pgPool.connect();
  let adjustedCount = 0;
  let inStockCount = 0;
  let shortageCount = 0;

  try {
    const pos = await client.query(
      `SELECT id, po_number FROM public.purchase_orders 
       WHERE verification_status NOT IN ('Delivered', 'Cancelled')
       ORDER BY created_at ASC;`
    );

    for (const po of pos.rows) {
      const result = await calculatePOStockStatus(po.id, client);
      if (result) {
        if (result.overallStatus === "STOCK ADJUSTED & ASSIGNED" || result.overallStatus === "Stock Adjusted" || result.overallStatus === "Partially Stock Adjusted" || result.overallStatus === "PARTIALLY ASSIGNED / PENDING STOCK") {
          adjustedCount++;
        } else if (result.overallStatus === "ASSIGNED" || result.overallStatus === "Available") {
          inStockCount++;
        } else {
          shortageCount++;
        }
      }
    }

    return {
      scanned: pos.rows.length,
      adjustedCount,
      inStockCount,
      shortageCount,
    };
  } finally {
    client.release();
  }
}

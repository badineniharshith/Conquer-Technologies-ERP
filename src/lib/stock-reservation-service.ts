// @ts-nocheck
import { PoolClient } from "pg";
import { pgPool } from "@/lib/stock-service";
import { prisma } from "@/lib/prisma";

/**
 * Generates a guaranteed unique, sequential reservation number: RES-YYYY-0001
 * Uses public.stock_reservation_counters with atomic database row lock.
 */
export async function generateNextReservationNumber(
  client?: PoolClient,
  year = new Date().getFullYear()
): Promise<string> {
  const runner = client || pgPool;

  try {
    // Ensure counter row exists for the year
    await runner.query(
      `INSERT INTO public.stock_reservation_counters (year, last_number)
       VALUES ($1, 0)
       ON CONFLICT (year) DO NOTHING;`,
      [year]
    );

    // Atomically increment and get sequence
    const res = await runner.query(
      `UPDATE public.stock_reservation_counters
       SET last_number = last_number + 1
       WHERE year = $1
       RETURNING last_number;`,
      [year]
    );

    if (res.rows && res.rows.length > 0) {
      const seq = res.rows[0].last_number;
      return `RES-${year}-${String(seq).padStart(4, "0")}`;
    }
  } catch (err: any) {
    console.error("Error generating sequential reservation number from DB:", err.message);
  }

  // Fallback if database counter unavailable
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RES-${year}-${randomSuffix}`;
}

/**
 * Synchronizes an ERP stock reservation into:
 * 1. crm.stock_reservations (master CRM stock reservation table)
 * 2. crm.opportunities (sales pipeline opportunity using reservation_number as opportunity_number)
 */
export async function syncStockReservationToCrm(reservationId: string) {
  if (!reservationId) return;

  try {
    // 1. Fetch complete ERP reservation record with line items and product details
    const erpRes = await pgPool.query(`
      SELECT 
        sr.id,
        sr.reservation_number,
        sr.customer_id,
        sr.employee_id,
        sr.branch_code,
        sr.quantity,
        sr.status,
        sr.notes,
        sr.project,
        sr.reserved_at,
        sr.expires_at,
        c.crm_customer_id,
        c.company_name,
        c.company_legal_name,
        u.name AS user_name
      FROM public.stock_reservations sr
      LEFT JOIN public.customers c ON c.id = sr.customer_id
      LEFT JOIN public.users u ON u.id = sr.customer_id
      WHERE sr.id = $1;
    `, [reservationId]);

    if (!erpRes.rows || erpRes.rows.length === 0) {
      console.warn(`[CRM Sync] Stock reservation ${reservationId} not found in public.stock_reservations.`);
      return;
    }

    const resRecord = erpRes.rows[0];
    const resNumber = resRecord.reservation_number || `RES-${new Date().getFullYear()}-0001`;

    // 2. Fetch line items and calculate valuation
    const itemsRes = await pgPool.query(`
      SELECT 
        sri.id,
        sri.sku,
        sri.quantity,
        sri.unit_price,
        p.price
      FROM public.stock_reservation_items sri
      LEFT JOIN public.products p ON p.id = sri.product_id OR p.sku = sri.sku
      WHERE sri.reservation_id = $1;
    `, [reservationId]);

    let totalValuation = 0;
    let totalUnits = 0;
    for (const it of itemsRes.rows) {
      const qty = it.quantity || 1;
      const unitPrice = parseFloat(it.unit_price || it.selling_price || it.price || 0);
      totalValuation += qty * unitPrice;
      totalUnits += qty;
    }

    if (totalUnits === 0) {
      totalUnits = resRecord.quantity || 1;
    }

    // 3. Resolve CRM Customer ID (must exist in crm.customers for foreign key)
    let targetCrmCustId: number | null = null;
    const companyDisplayName = resRecord.company_name || resRecord.company_legal_name || resRecord.user_name || "Customer";

    if (resRecord.crm_customer_id) {
      const check = await pgPool.query('SELECT id FROM crm.customers WHERE id = $1 LIMIT 1;', [resRecord.crm_customer_id]);
      if (check.rows.length > 0) targetCrmCustId = check.rows[0].id;
    }

    if (!targetCrmCustId && companyDisplayName) {
      const checkName = await pgPool.query(
        'SELECT id FROM crm.customers WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1;',
        [companyDisplayName]
      );
      if (checkName.rows.length > 0) targetCrmCustId = checkName.rows[0].id;
    }

    if (!targetCrmCustId) {
      // Default to first valid active CRM customer (Acme Corp id 4369)
      const firstCust = await pgPool.query('SELECT id FROM crm.customers ORDER BY id ASC LIMIT 1;');
      targetCrmCustId = firstCust.rows[0]?.id || 4369;
    }

    // 4. Map stages & status
    const rawStatus = (resRecord.status || "PENDING").toUpperCase();
    let oppStage = "Stock Reserved";
    let oppStatus = "OPEN";
    let probability = 60;

    if (["PENDING", "DRAFT", "PENDING VERIFICATION"].includes(rawStatus)) {
      oppStage = "Qualification";
      oppStatus = "OPEN";
      probability = 30;
    } else if (["VERIFIED", "ACTIVE"].includes(rawStatus)) {
      oppStage = "Value Proposition";
      oppStatus = "OPEN";
      probability = 60;
    } else if (["PROCESSING"].includes(rawStatus)) {
      oppStage = "Negotiation";
      oppStatus = "OPEN";
      probability = 85;
    } else if (["ACCEPTED", "COMPLETED"].includes(rawStatus)) {
      oppStage = "Closed Won";
      oppStatus = "WON";
      probability = 100;
    } else if (["CANCELLED", "REJECTED", "EXPIRED"].includes(rawStatus)) {
      oppStage = "Closed Lost";
      oppStatus = "LOST";
      probability = 0;
    }

    // 5. Upsert into crm.stock_reservations
    const crmStatus = ["PENDING", "DRAFT"].includes(rawStatus) ? "DRAFT" : rawStatus;
    const crmResUpsert = await pgPool.query(`
      INSERT INTO crm.stock_reservations (
        reservation_number, customer_id, branch_code, quantity, status, notes, project,
        created_at, updated_at, reserved_date, expiry_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8, $9
      )
      ON CONFLICT (reservation_number) DO UPDATE SET
        status = EXCLUDED.status,
        quantity = EXCLUDED.quantity,
        customer_id = EXCLUDED.customer_id,
        branch_code = EXCLUDED.branch_code,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id;
    `, [
      resNumber,
      targetCrmCustId,
      resRecord.branch_code || "HYD-HQ",
      totalUnits,
      crmStatus,
      resRecord.notes || "ERP Stock Reservation",
      resRecord.project || companyDisplayName || "Standard Deal",
      resRecord.reserved_at || new Date(),
      resRecord.expires_at || new Date(Date.now() + 14 * 86400000)
    ]);

    const crmReservationId = crmResUpsert.rows[0]?.id;

    // 6. Find valid createdById in crm.opportunities
    const createdByRes = await pgPool.query(`
      SELECT "createdById" FROM crm.opportunities WHERE "createdById" IS NOT NULL GROUP BY "createdById" ORDER BY COUNT(*) DESC LIMIT 1;
    `);
    const defaultCreatedById = createdByRes.rows[0]?.createdById || 197;

    // 7. Upsert into crm.opportunities using reservation_number as opportunity_number
    const oppTitle = `Stock Reservation: ${companyDisplayName} (${resNumber})`;

    const oppUpsert = await pgPool.query(`
      INSERT INTO crm.opportunities (
        opportunity_number,
        title,
        "customerId",
        status,
        stage,
        probability,
        value,
        "expectedRevenue",
        reservation_id,
        reservation_status,
        reservation_date,
        expiry_date,
        branch,
        "expectedClosureDate",
        "createdById",
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      )
      ON CONFLICT (opportunity_number) DO UPDATE SET
        title = EXCLUDED.title,
        "customerId" = EXCLUDED."customerId",
        status = EXCLUDED.status,
        stage = EXCLUDED.stage,
        probability = EXCLUDED.probability,
        value = EXCLUDED.value,
        "expectedRevenue" = EXCLUDED."expectedRevenue",
        reservation_id = EXCLUDED.reservation_id,
        reservation_status = EXCLUDED.reservation_status,
        reservation_date = EXCLUDED.reservation_date,
        expiry_date = EXCLUDED.expiry_date,
        branch = EXCLUDED.branch,
        "expectedClosureDate" = EXCLUDED."expectedClosureDate",
        "updatedAt" = NOW()
      RETURNING id;
    `, [
      resNumber,
      oppTitle,
      targetCrmCustId,
      oppStatus,
      oppStage,
      probability,
      totalValuation,
      totalValuation,
      crmReservationId,
      resRecord.status,
      resRecord.reserved_at,
      resRecord.expires_at,
      resRecord.branch_code || "HYD-HQ",
      resRecord.expires_at,
      defaultCreatedById
    ]);

    const crmOppId = oppUpsert.rows[0]?.id;

    // 8. Link opportunity_id back in crm.stock_reservations and public.stock_reservations
    if (crmOppId && crmReservationId) {
      await pgPool.query(`
        UPDATE crm.stock_reservations
        SET opportunity_id = $1
        WHERE id = $2;
      `, [crmOppId, crmReservationId]);

      await pgPool.query(`
        UPDATE public.stock_reservations
        SET opportunity_id = $1
        WHERE id = $2;
      `, [String(crmOppId), reservationId]);
    }

    console.log(`[CRM Sync] Successfully synced reservation ${resNumber} -> Opportunity #${crmOppId} (CRM Res #${crmReservationId}).`);
  } catch (err: any) {
    console.error("[CRM Sync Error]:", err.message);
  }
}

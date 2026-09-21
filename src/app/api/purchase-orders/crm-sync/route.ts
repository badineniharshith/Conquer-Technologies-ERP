import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/purchase-orders/crm-sync
 * 
 * Called by the CRM system to sync a newly created Purchase Order into the ERP.
 * Also handles manual re-sync from the ERP UI.
 * 
 * Body: { poNumber: string } OR called with no body to sync ALL unsynced CRM POs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { poNumber } = body;

    // Build query filter
    const whereClause = poNumber
      ? `WHERE p.po_number = '${poNumber.replace(/'/g, "''")}'`
      : `WHERE p.po_number NOT IN (SELECT po_number FROM public.purchase_orders WHERE erp_sync_status = 'SYNCED')`;

    // Query CRM POs
    const crmPOs: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        p.id, p.po_number, p.company_name, p.customer_id, p.gst_number,
        p.primary_contact_name, p.phone, p.email,
        p.billing_address, p.shipping_address,
        p.subtotal, p."taxAmount", p."freightAmount", p."grandTotal",
        p.currency, p.po_status, p.erp_sync_status, p.erp_reference_id,
        p.expected_delivery, p.lead_id, p.quotation_id, p.created_at,
        p.erp_verification_status, p.approval_status
      FROM crm.purchase_orders p
      ${whereClause}
      ORDER BY p.id ASC
    `);

    if (crmPOs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No CRM POs to sync", 
        synced: 0 
      });
    }

    const syncedPOs: string[] = [];
    const errors: string[] = [];

    for (const po of crmPOs) {
      try {
        // Find or create ERP customer linked to this CRM customer
        let erpCustomerId: string | null = null;

        const existingCust: any[] = await prisma.$queryRawUnsafe(
          `SELECT id FROM public.customers WHERE crm_customer_id = $1 LIMIT 1`,
          po.customer_id
        );

        if (existingCust.length > 0) {
          erpCustomerId = existingCust[0].id;
        } else {
          // Fetch CRM customer details
          const crmCusts: any[] = await prisma.$queryRawUnsafe(
            `SELECT id, name, email, phone, gst_number, billing_address, shipping_address FROM crm.customers WHERE id = $1 LIMIT 1`,
            po.customer_id
          );
          const crmCust = crmCusts[0];

          if (crmCust) {
            const newCustId = crypto.randomUUID();
            await prisma.$executeRawUnsafe(`
              INSERT INTO public.customers (
                id, company_name, crm_customer_id, email, phone, gst_number,
                billing_address, shipping_address, status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', NOW(), NOW())
              ON CONFLICT (crm_customer_id) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                email = EXCLUDED.email,
                updated_at = NOW()
            `,
              newCustId,
              crmCust.name || po.company_name || "Unknown Customer",
              po.customer_id,
              po.email,
              po.phone,
              po.gst_number,
              po.billing_address,
              po.shipping_address
            );

            const upserted: any[] = await prisma.$queryRawUnsafe(
              `SELECT id FROM public.customers WHERE crm_customer_id = $1 LIMIT 1`,
              po.customer_id
            );
            erpCustomerId = upserted[0]?.id || newCustId;
          }
        }

        // Get PO items from CRM
        const crmItems: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM crm.purchase_order_items WHERE purchase_order_id = $1`,
          po.id
        );

        const itemsJson = JSON.stringify(
          crmItems.map((item: any) => ({
            sku: item.sku || `CRM-ITEM-${item.id}`,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice || item.unitprice || 0),
            tax: parseFloat(item.tax || 0),
            discount: parseFloat(item.discount || 0),
            total: parseFloat(item.total || 0),
            uom: item.uom,
            oem: item.oem,
            category: item.category,
            businessUnitId: item.business_unit_id,
            businessUnitName: item.business_unit_name,
            description: item.description || "",
          }))
        );

        // Use a stable, deterministic ID for the ERP PO
        const erpPoId = `po-${po.po_number.toLowerCase()}`;

        // Upsert the PO into public.purchase_orders
        await prisma.$executeRawUnsafe(`
          INSERT INTO public.purchase_orders (
            id, po_number, customer_id, customer_name, company_name,
            gst_number, primary_contact_name, phone, email,
            billing_address, shipping_address,
            subtotal, grand_total, total_amount, currency,
            po_status, verification_status, erp_sync_status,
            erp_verification_status, approval_status,
            items_json, date_received, expected_delivery, total_items,
            stock_status, branch_code, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, NOW(), NOW()
          )
          ON CONFLICT (po_number) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            company_name = EXCLUDED.company_name,
            total_amount = EXCLUDED.total_amount,
            grand_total = EXCLUDED.grand_total,
            subtotal = EXCLUDED.subtotal,
            items_json = EXCLUDED.items_json,
            erp_sync_status = 'SYNCED',
            updated_at = NOW()
        `,
          erpPoId,
          po.po_number,
          erpCustomerId,
          po.primary_contact_name || po.company_name,
          po.company_name,
          po.gst_number,
          po.primary_contact_name,
          po.phone,
          po.email,
          po.billing_address,
          po.shipping_address,
          parseFloat(String(po.subtotal || 0)),
          parseFloat(String(po.grandTotal || po.grandtotal || 0)),
          parseFloat(String(po.grandTotal || po.grandtotal || 0)),
          po.currency || "INR",
          po.po_status || "Pending_Verification",
          po.erp_verification_status || "Pending",
          "SYNCED",
          po.erp_verification_status || "Pending",
          po.approval_status || "Pending Approval",
          itemsJson,
          po.created_at,
          po.expected_delivery,
          crmItems.length || 1,
          "Checking",
          "HYD-HQ"
        );

        // Delete existing items and re-insert fresh (no unique constraint on items beyond PK)
        await prisma.$executeRawUnsafe(
          `DELETE FROM public.purchase_order_items WHERE purchase_order_id = $1`,
          erpPoId
        );

        for (const item of crmItems) {
          const itemId = crypto.randomUUID();
          await prisma.$executeRawUnsafe(`
            INSERT INTO public.purchase_order_items (
              id, purchase_order_id, po_number, product_name, sku, quantity,
              unit_price, tax, discount, total, uom, oem, category,
              description, business_unit_id, business_unit_name, item_status,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
            )
          `,
            itemId,
            erpPoId,
            po.po_number,
            item.product_name,
            item.sku || `CRM-ITEM-${item.id}`,
            item.quantity,
            parseFloat(String(item.unitPrice || item.unitprice || 0)),
            parseFloat(String(item.tax || 0)),
            parseFloat(String(item.discount || 0)),
            parseFloat(String(item.total || 0)),
            item.uom,
            item.oem,
            item.category,
            item.description || "",
            item.business_unit_id,
            item.business_unit_name,
            "Pending"
          ).catch(() => {/* ignore dup item errors */});
        }

        // Update CRM erp_reference_id to the actual stable ERP PO ID
        await prisma.$executeRawUnsafe(`
          UPDATE crm.purchase_orders 
          SET erp_reference_id = $1, erp_sync_status = 'SYNCED', updated_at = NOW()
          WHERE po_number = $2
        `, erpPoId, po.po_number);

        // Immediate stock allocation: assign available inventory directly to this PO
        try {
          const { allocateStockForPO } = await import("@/lib/stock-service");
          await allocateStockForPO(erpPoId);
        } catch (allocErr: any) {
          console.error(`Error auto-allocating stock for synced PO ${po.po_number}:`, allocErr.message);
        }

        syncedPOs.push(po.po_number);
      } catch (err: any) {
        console.error(`Error syncing PO ${po.po_number}:`, err.message);
        errors.push(`${po.po_number}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedPOs.length} PO(s) from CRM to ERP`,
      synced: syncedPOs.length,
      syncedPOs,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("CRM sync error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/purchase-orders/crm-sync
 * Returns all CRM POs with their sync status vs ERP
 */
export async function GET(_req: NextRequest) {
  try {
    const crmPOs: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        p.id, p.po_number, p.company_name, p.po_status,
        p.erp_sync_status, p.erp_reference_id,
        p."grandTotal" as grand_total, p.created_at,
        CASE WHEN erp.po_number IS NOT NULL THEN true ELSE false END as in_erp
      FROM crm.purchase_orders p
      LEFT JOIN public.purchase_orders erp ON erp.po_number = p.po_number
      ORDER BY p.id DESC
    `);

    return NextResponse.json({ success: true, data: crmPOs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

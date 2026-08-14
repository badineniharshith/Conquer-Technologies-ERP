import { prisma } from "@/lib/db";

/**
 * Generates the next sequential Purchase Order Number in the standard format CPO-YYYY-XXXXXXXX
 * e.g., CPO-2026-00000004
 */
export async function generateNextPoNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CPO-${currentYear}-`;

  try {
    // 1. Query ERP purchase_orders for max suffix
    const erpPos = await prisma.purchaseOrder.findMany({
      select: { poNumber: true }
    });

    // 2. Query CRM purchase_orders directly via raw SQL
    let crmPoNumbers: string[] = [];
    try {
      const crmRows: any[] = await prisma.$queryRawUnsafe('SELECT po_number FROM crm.purchase_orders');
      crmPoNumbers = crmRows.map(r => r.po_number);
    } catch {}

    const allPoNumbers = [
      ...erpPos.map((p) => p.poNumber),
      ...crmPoNumbers
    ].filter(Boolean);

    let maxSeq = 0;
    for (const num of allPoNumbers) {
      if (num.startsWith(prefix) || num.startsWith("CPO-")) {
        const parts = num.split("-");
        const lastPart = parts[parts.length - 1];
        const parsed = parseInt(lastPart, 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(8, "0")}`;
  } catch (err) {
    console.error("Error generating next PO number:", err);
    return `${prefix}00000001`;
  }
}

/**
 * Syncs an ERP Purchase Order to CRM table (crm.purchase_orders & crm.purchase_order_items)
 */
export async function syncErpPoToCrm(erpPoId: string) {
  try {
    const erpPo = await prisma.purchaseOrder.findUnique({
      where: { id: erpPoId },
      include: { poItems: true }
    });

    if (!erpPo) return;

    let items: any[] = [];
    try {
      items = JSON.parse(erpPo.itemsJson || "[]");
    } catch {
      items = erpPo.poItems || [];
    }

    const customerIdInt = 5876;
    const createdByInt = 187;

    const isVerified = erpPo.verificationStatus === "Verified";
    const isApproved = erpPo.approvalStatus === "Approved" || erpPo.approvalStatus === "APPROVED";
    const poStatus = (isVerified && isApproved) ? "Cleared" : (isVerified ? "Verified" : "Pending_Verification");
    const erpSyncStatus = "SYNCED";
    const erpVerificationStatus = erpPo.verificationStatus || "Pending";
    const approvalStatus = erpPo.approvalStatus || "Pending Approval";

    // Upsert into crm.purchase_orders via raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO crm.purchase_orders (
        po_number, customer_po_number, lead_id, customer_id, company_name, gst_number,
        primary_contact_name, phone, email, billing_address, shipping_address, subtotal,
        "taxAmount", "freightAmount", "grandTotal", currency, po_status, erp_sync_status,
        erp_verification_status, approval_status, erp_reference_id, created_by_id,
        assigned_sales_executive_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
      ) ON CONFLICT (po_number) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        subtotal = EXCLUDED.subtotal,
        "grandTotal" = EXCLUDED."grandTotal",
        po_status = EXCLUDED.po_status,
        erp_sync_status = 'SYNCED',
        erp_verification_status = EXCLUDED.erp_verification_status,
        approval_status = EXCLUDED.approval_status,
        erp_reference_id = EXCLUDED.erp_reference_id,
        updated_at = NOW();
    `,
      erpPo.poNumber,
      null,
      20,
      customerIdInt,
      erpPo.companyName || erpPo.customerName || "Enterprise",
      erpPo.gstNumber || null,
      erpPo.primaryContactName || erpPo.customerName || "Contact",
      erpPo.phone || null,
      erpPo.email || null,
      erpPo.billingAddress || null,
      erpPo.shippingAddress || null,
      Number(erpPo.subtotal || erpPo.totalAmount || 0),
      0,
      0,
      Number(erpPo.grandTotal || erpPo.totalAmount || 0),
      erpPo.currency || "INR",
      poStatus,
      erpSyncStatus,
      erpVerificationStatus,
      approvalStatus,
      erpPo.id,
      createdByInt,
      createdByInt
    );

    // Upsert items into crm.purchase_order_items
    for (const item of items) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO crm.purchase_order_items (
          purchase_order_id, po_number, product_name, sku, description, quantity, uom, "unitPrice", discount, tax, total, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        );
      `,
        erpPo.id,
        erpPo.poNumber,
        item.productName || item.sku || "Product",
        item.sku || "SKU",
        "",
        Number(item.quantity || 1),
        "Unit",
        Number(item.unitPrice || 0),
        0,
        0,
        Number((item.unitPrice || 0) * (item.quantity || 1))
      ).catch(() => {});
    }
  } catch (err: any) {
    console.error("Error in syncErpPoToCrm:", err.message);
  }
}

/**
 * Creates or updates a linked Stock Reservation in public.stock_reservations when a PO stock is verified
 */
export async function syncPoStockReservation(poId: string) {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId }
    });

    if (!po || po.verificationStatus !== "Verified") return;

    let items: any[] = [];
    try {
      items = JSON.parse(po.itemsJson || "[]");
    } catch {}

    const firstItem = items[0] || {};
    const sku = firstItem.sku || "PROD-DELL-XPS15";
    const totalQty = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || po.totalItems || 1;

    const resNumber = `RES-${po.poNumber.replace("CPO-", "")}`;
    const resId = `res-${po.poNumber.toLowerCase()}`;

    // Check if reservation already exists
    const existingRes = await prisma.stockReservation.findFirst({
      where: {
        OR: [
          { id: resId },
          { reservationNumber: resNumber },
          { purchaseOrderId: po.id }
        ]
      }
    });

    if (existingRes) {
      await prisma.stockReservation.update({
        where: { id: existingRes.id },
        data: {
          status: "ACCEPTED",
          quantity: totalQty,
          notes: `Stock reserved for Verified PO ${po.poNumber} (${po.companyName || po.customerName})`,
          updatedAt: new Date()
        }
      });
    } else {
      await prisma.stockReservation.create({
        data: {
          id: resId,
          reservationNumber: resNumber,
          customerId: po.customerId,
          purchaseOrderId: po.id,
          sku: sku,
          branchCode: po.branchCode || "HYD-HQ",
          quantity: totalQty,
          status: "ACCEPTED",
          notes: `Stock reserved for Verified PO ${po.poNumber} (${po.companyName || po.customerName})`,
          project: po.companyName || po.customerName || "Standard Order",
          reservedAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  } catch (err: any) {
    console.error("Error in syncPoStockReservation:", err.message);
  }
}

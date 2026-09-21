import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculatePOStockStatus, pgPool } from "@/lib/stock-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const searchStr = String(id).trim();

  try {
    // 1. Authoritative central calculation
    const calcResult = await calculatePOStockStatus(searchStr);

    if (!calcResult) {
      return NextResponse.json(
        { success: false, reason: `Purchase order '${searchStr}' not found.` },
        { status: 404 }
      );
    }

    // 2. Fetch full PO record details for client metadata
    const poRecord = await prisma.purchaseOrder.findFirst({
      where: {
        OR: [
          { id: calcResult.poId },
          { poNumber: calcResult.poNumber },
          { poNumber: { equals: calcResult.poNumber, mode: "insensitive" } },
        ],
      },
      include: {
        customer: true,
        vendor: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!poRecord) {
      return NextResponse.json(
        { success: false, reason: `Purchase order record not found.` },
        { status: 404 }
      );
    }

    // Also fetch any allocations with adjustment metadata
    const allocRes = await pgPool.query(
      `SELECT 
         posa.*,
         sa.adjustment_type,
         sa.reason as adjustment_reason,
         sa.created_by as adjusted_by,
         sa.created_at as adjusted_at
       FROM public.purchase_order_stock_allocations posa
       LEFT JOIN public.stock_adjustments sa ON sa.id = posa.adjustment_id
       WHERE posa.purchase_order_id = $1
       ORDER BY posa.created_at DESC;`,
      [poRecord.id]
    );

    const cust = poRecord.customer;
    const vend = poRecord.vendor;

    const lineItemsFormatted = calcResult.lineItems.map((item) => {
      const itemAllocs = allocRes.rows.filter(
        (a: any) => a.purchase_order_item_id === item.itemId || a.sku === item.sku
      );
      const latestAlloc = itemAllocs[0];

      return {
        id: item.itemId,
        sku: item.sku,
        name: item.name,
        requestedQty: item.requestedQty,
        unitPrice: item.unitPrice,
        discount: item.discount,
        tax: item.tax,
        total: item.total,
        currentStock: item.currentStock,
        reservedStock: item.reservedStock,
        availableStock: item.availableStock,
        initialAvailableStock: item.initialAvailableStock ?? 0,
        initialAssignedQty: item.initialAssignedQty ?? 0,
        allocatedQty: item.allocatedQty,
        adjustedQty: item.adjustedQty,
        needToOrder: item.remainingQty,
        remainingQty: item.remainingQty,
        pendingQty: item.pendingQty ?? item.remainingQty,
        branchCode: item.branchCode || poRecord.branchCode || "HYD-HQ",
        status: item.status,
        statusDisplay: item.statusDisplay,
        lastAdjustmentNumber: latestAlloc?.adjustment_number || item.lastAdjustmentNumber || poRecord.lastAdjustmentNumber,
        lastAdjustedAt: latestAlloc?.adjusted_at || item.lastAdjustedAt || poRecord.lastAdjustedAt,
        lastAdjustedBy: latestAlloc?.adjusted_by || item.lastAdjustedBy || poRecord.lastAdjustedBy,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        id: poRecord.id,
        poNumber: poRecord.poNumber,
        customerId: poRecord.customerId || cust?.id || "",
        customerName: poRecord.customerName || cust?.name || cust?.companyLegalName || "Customer",
        companyName: poRecord.companyName || cust?.companyLegalName || cust?.name || "",
        customerCode: cust?.customerCode || "",
        gstNumber: poRecord.gstNumber || cust?.gstNumber || "N/A",
        panNumber: cust?.panNumber || "N/A",
        billingAddress: poRecord.billingAddress || cust?.billingAddress || cust?.billingStreet || "N/A",
        shippingAddress:
          poRecord.shippingAddress || cust?.shippingAddress || cust?.shippingStreet || poRecord.billingAddress || "N/A",
        primaryContactName: poRecord.primaryContactName || cust?.name || "Primary Contact",
        email: poRecord.email || cust?.email || "N/A",
        phone: poRecord.phone || cust?.phone || "N/A",
        vendor: vend
          ? {
              id: vend.id,
              name: vend.name,
              contactPerson: vend.contactPerson,
              email: vend.email,
              phone: vend.phone,
              gstNumber: vend.gstNumber,
              address: vend.address,
            }
          : null,
        dateReceived: poRecord.dateReceived,
        expectedDelivery: poRecord.expectedDelivery,
        branchCode: poRecord.branchCode || "HYD-HQ",
        currentStatus: poRecord.verificationStatus || "Pending",
        verificationStatus: poRecord.verificationStatus || "Pending",
        approvalStatus: poRecord.approvalStatus || "Pending Approval",
        verifiedBy: poRecord.verifiedBy,
        verifiedDate: poRecord.verifiedDate,
        approvedBy: (poRecord as any).approvedBy,
        approvedDate: (poRecord as any).approvedDate || (poRecord as any).approvedAt,
        poStatus: poRecord.poStatus || "PENDING",
        stockStatus: calcResult.overallStatus,
        lastAdjustmentNumber: calcResult.lastAdjustmentNumber || poRecord.lastAdjustmentNumber,
        lastAdjustedAt: calcResult.lastAdjustedAt || poRecord.lastAdjustedAt,
        lastAdjustedBy: calcResult.lastAdjustedBy || poRecord.lastAdjustedBy,
        subtotal: Number(poRecord.subtotal || poRecord.totalAmount || 0),
        grandTotal: Number(poRecord.grandTotal || poRecord.totalAmount || 0),
        totalAmount: Number(poRecord.totalAmount || 0),
        isStockAvailable: calcResult.isFullyFulfilled,
        hasAdjustment: calcResult.hasAdjustment,
        totalRequested: calcResult.totalRequested,
        totalAvailableAtCreation: calcResult.totalAvailableAtCreation ?? 0,
        totalInitiallyAssigned: calcResult.totalInitiallyAssigned ?? 0,
        totalAllocated: calcResult.totalAllocated,
        totalAdjusted: calcResult.totalAdjusted,
        totalRemaining: calcResult.totalRemaining,
        totalPending: calcResult.totalPending ?? calcResult.totalRemaining,
        lineItems: lineItemsFormatted,
        allocations: allocRes.rows,
        statusHistory: poRecord.statusHistory || [],
      },
    });
  } catch (err: any) {
    console.error("Error in PO audit API:", err);
    return NextResponse.json(
      { success: false, reason: "Data pipeline exception", error: err.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma, erpDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params if promise
  const resolvedParams = await params;
  const { id } = resolvedParams;

  if (erpDb.isMock()) {
    // Mock database logic
    const poRecord = await erpDb.purchaseOrders.findUnique({ where: { id } });
    if (!poRecord) {
      return NextResponse.json(
        { success: false, reason: "Purchase order not found." },
        { status: 404 }
      );
    }
    
    let requestedProducts: { sku: string; quantity: number }[] = [];
    try {
      requestedProducts = typeof poRecord.itemsJson === 'string' 
        ? JSON.parse(poRecord.itemsJson) 
        : poRecord.itemsJson;
      if (!Array.isArray(requestedProducts)) requestedProducts = [];
    } catch {
      requestedProducts = [];
    }

    let stockSufficient = true;
    const lineItemsAudit = [];

    const mockStore = (global as any).mockDb;
    for (const item of requestedProducts) {
      const invItems = mockStore.inventory.filter((inv: any) => inv.sku === item.sku);
      const totalAvailable = invItems.reduce((sum: number, inv: any) => sum + (inv.availableStock || inv.quantity || 0), 0);
      const name = invItems.length > 0 ? invItems[0].itemName : item.sku;

      if (totalAvailable < item.quantity) {
        stockSufficient = false;
      }

      lineItemsAudit.push({
        sku: item.sku,
        name,
        requestedQty: item.quantity,
        currentStock: totalAvailable
      });
    }

    const computedStockState = stockSufficient ? 'Available' : 'Insufficient';
    await erpDb.purchaseOrders.update({
      where: { id },
      data: { stockStatus: computedStockState }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: poRecord.id,
        poNumber: poRecord.poNumber,
        customerName: poRecord.customerName,
        currentStatus: poRecord.verificationStatus,
        isStockAvailable: stockSufficient,
        lineItems: lineItemsAudit
      }
    });
  } else {
    // Real PostgreSQL / Prisma database logic
    try {
      const result = await prisma.$transaction(async (tx) => {
        const poRecord = await tx.purchaseOrder.findUnique({
          where: { id },
          include: { user: true }
        });

        if (!poRecord) {
          throw new Error("NOT_FOUND");
        }

        let requestedProducts: { sku: string; quantity: number }[] = [];
        try {
          requestedProducts = typeof poRecord.itemsJson === 'string' 
            ? JSON.parse(poRecord.itemsJson) 
            : (poRecord.itemsJson as any);
          if (!Array.isArray(requestedProducts)) requestedProducts = [];
        } catch {
          requestedProducts = [];
        }

        let stockSufficient = true;
        const lineItemsAudit = [];

        for (const item of requestedProducts) {
          const invSum = await tx.inventory.aggregate({
            _sum: {
              availableStock: true
            },
            where: {
              sku: item.sku
            }
          });

          const itemNameRes = await tx.inventory.findFirst({
            where: { sku: item.sku },
            select: { itemName: true }
          });

          const totalAvailable = invSum._sum.availableStock || 0;
          if (totalAvailable < item.quantity) {
            stockSufficient = false;
          }

          lineItemsAudit.push({
            sku: item.sku,
            name: itemNameRes?.itemName || item.sku,
            requestedQty: item.quantity,
            currentStock: totalAvailable
          });
        }

        const computedStockState = stockSufficient ? 'Available' : 'Insufficient';
        await tx.purchaseOrder.update({
          where: { id },
          data: { stockStatus: computedStockState }
        });

        return {
          id: poRecord.id,
          poNumber: poRecord.poNumber,
          customerName: poRecord.customerName || poRecord.user?.name || "Premium Customer",
          currentStatus: poRecord.verificationStatus,
          isStockAvailable: stockSufficient,
          lineItems: lineItemsAudit
        };
      }, {
        isolationLevel: "RepeatableRead" // Enforce Repeatable Read snapshot isolation
      });

      return NextResponse.json({
        success: true,
        data: result
      });
    } catch (err: any) {
      if (err.message === "NOT_FOUND") {
        return NextResponse.json(
          { success: false, reason: "Purchase order not found." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, reason: "Data pipeline bottleneck", error: err.message },
        { status: 500 }
      );
    }
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma, erpDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  if (erpDb.isMock()) {
    const poRecord = await erpDb.purchaseOrders.findUnique({ where: { id } });
    if (!poRecord) {
      return NextResponse.json(
        { success: false, reason: "Purchase order not found." },
        { status: 404 }
      );
    }
    
    let requestedProducts: any[] = [];
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
      const invItems = mockStore?.inventory?.filter((inv: any) => inv.sku === item.sku) || [];
      const totalAvailable = invItems.reduce((sum: number, inv: any) => sum + (inv.availableStock || inv.quantity || 0), 0);
      const name = item.productName || item.name || (invItems.length > 0 ? invItems[0].itemName : item.sku);
      const requestedQty = Number(item.quantity || item.requestedQty || 1);
      const unitPrice = Number(item.unitPrice || item.price || 0);
      const discount = Number(item.discount || 0);
      const tax = Number(item.tax || 18);
      const lineTotal = Number(item.total || (requestedQty * unitPrice * (1 - discount / 100)));
      const needToOrder = Math.max(0, requestedQty - totalAvailable);

      if (totalAvailable < requestedQty) {
        stockSufficient = false;
      }

      lineItemsAudit.push({
        sku: item.sku,
        name,
        requestedQty,
        unitPrice,
        discount,
        tax,
        total: lineTotal,
        currentStock: totalAvailable,
        needToOrder
      });
    }

    const computedStockState = stockSufficient ? 'Available' : 'Insufficient';

    return NextResponse.json({
      success: true,
      data: {
        id: poRecord.id,
        poNumber: poRecord.poNumber,
        customerId: poRecord.customerId || "",
        customerName: poRecord.customerName || "Customer",
        companyName: poRecord.companyName || poRecord.customerName || "",
        gstNumber: poRecord.gstNumber || "36AAACG1234A1Z5",
        billingAddress: poRecord.billingAddress || "Plot No 42, Hitec City, Hyderabad, TS",
        shippingAddress: poRecord.shippingAddress || poRecord.billingAddress || "Plot No 42, Hitec City, Hyderabad, TS",
        primaryContactName: poRecord.primaryContactName || poRecord.customerName || "Contact Person",
        email: poRecord.email || "client@conquer.in",
        phone: poRecord.phone || "+91 98765 43210",
        dateReceived: poRecord.dateReceived,
        expectedDelivery: poRecord.expectedDelivery,
        branchCode: poRecord.branchCode || "HYD-HQ",
        currentStatus: poRecord.verificationStatus || "Pending",
        verificationStatus: poRecord.verificationStatus || "Pending",
        approvalStatus: poRecord.approvalStatus || "Pending Approval",
        poStatus: poRecord.poStatus || "PENDING",
        subtotal: poRecord.subtotal || poRecord.totalAmount || 0,
        grandTotal: poRecord.grandTotal || poRecord.totalAmount || 0,
        totalAmount: poRecord.totalAmount || 0,
        isStockAvailable: stockSufficient,
        lineItems: lineItemsAudit
      }
    });
  } else {
    try {
      const searchStr = String(id).trim();
      const poRecord = await prisma.purchaseOrder.findFirst({
        where: {
          OR: [
            { id: searchStr },
            { poNumber: searchStr },
            { poNumber: { equals: searchStr, mode: "insensitive" } }
          ]
        },
        include: {
          customer: true,
          vendor: true,
          poItems: {
            include: { product: true }
          }
        }
      });

      if (!poRecord) {
        return NextResponse.json(
          { success: false, reason: `Purchase order '${searchStr}' not found.` },
          { status: 404 }
        );
      }

      let requestedProducts: any[] = [];
      if (poRecord.poItems && poRecord.poItems.length > 0) {
        requestedProducts = poRecord.poItems.map(pi => ({
          sku: pi.sku,
          productName: pi.productName || pi.product?.name || pi.sku,
          quantity: pi.quantity,
          unitPrice: Number(pi.unitPrice || 0),
          discount: Number(pi.discount || 0),
          tax: Number(pi.tax || 18),
          total: Number(pi.total || (pi.quantity * Number(pi.unitPrice || 0)))
        }));
      } else {
        try {
          requestedProducts = typeof poRecord.itemsJson === 'string' 
            ? JSON.parse(poRecord.itemsJson) 
            : (poRecord.itemsJson as any);
          if (!Array.isArray(requestedProducts)) requestedProducts = [];
        } catch {
          requestedProducts = [];
        }
      }

      let stockSufficient = true;
      const lineItemsAudit = [];

      for (const item of requestedProducts) {
        const itemSku = item.sku || null;
        const name = item.productName || item.name || (itemSku ? itemSku : "Generic Item");
        const sku = itemSku || `ITEM-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
        const requestedQty = Number(item.quantity || item.requestedQty || 1);

        let totalAvailable = 0;
        let invFirst = null;
        let prodFirst = null;

        if (itemSku) {
          const invSum = await prisma.inventory.aggregate({
            _sum: { availableStock: true, availableQty: true, quantity: true },
            where: {
              OR: [
                { sku: itemSku },
                { sku: { equals: itemSku, mode: "insensitive" } }
              ]
            }
          });

          const sStock = Number(invSum._sum?.availableStock || 0);
          const sQty = Number(invSum._sum?.availableQty || 0);
          const sTotal = Number(invSum._sum?.quantity || 0);
          totalAvailable = Math.max(sStock, sQty, sTotal);

          // Fallback to CRM products stock if inventory record is missing or 0
          if (totalAvailable === 0) {
            try {
              const crmP = await prisma.$queryRawUnsafe(
                "SELECT stock FROM crm.products WHERE sku = $1 OR sku ILIKE $1 LIMIT 1",
                itemSku
              );
              if (Array.isArray(crmP) && crmP.length > 0 && crmP[0].stock) {
                totalAvailable = Number(crmP[0].stock || 0);
              }
            } catch {}
          }

          invFirst = await prisma.inventory.findFirst({
            where: { OR: [ { sku: itemSku }, { sku: { equals: itemSku, mode: "insensitive" } } ] },
            select: { itemName: true }
          });

          prodFirst = await prisma.product.findFirst({
            where: { OR: [ { sku: itemSku }, { sku: { equals: itemSku, mode: "insensitive" } } ] },
            select: { name: true, sellingPrice: true, taxPercent: true }
          });
        } else if (name) {
          const invSum = await prisma.inventory.aggregate({
            _sum: { availableStock: true, availableQty: true, quantity: true },
            where: { itemName: { equals: name, mode: "insensitive" } }
          });
          const sStock = Number(invSum._sum?.availableStock || 0);
          const sQty = Number(invSum._sum?.availableQty || 0);
          const sTotal = Number(invSum._sum?.quantity || 0);
          totalAvailable = Math.max(sStock, sQty, sTotal);
        }

        const needToOrder = Math.max(0, requestedQty - totalAvailable);

        if (totalAvailable < requestedQty) {
          stockSufficient = false;
        }

        const unitPrice = Number(item.unitPrice || prodFirst?.sellingPrice || 0);
        const discount = Number(item.discount || 0);
        const tax = Number(item.tax || prodFirst?.taxPercent || 18);
        const total = Number(item.total || (requestedQty * unitPrice * (1 - discount / 100)));

        lineItemsAudit.push({
          sku,
          name: name || invFirst?.itemName || prodFirst?.name || sku,
          requestedQty,
          unitPrice,
          discount,
          tax,
          total,
          currentStock: totalAvailable,
          needToOrder
        });
      }

      const computedStockState = stockSufficient ? 'Available' : 'Insufficient';

      // Update stock status asynchronously if changed
      prisma.purchaseOrder.update({
        where: { id: poRecord.id },
        data: { stockStatus: computedStockState }
      }).catch(() => {});

      const cust = poRecord.customer;
      const vend = poRecord.vendor;

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
          shippingAddress: poRecord.shippingAddress || cust?.shippingAddress || cust?.shippingStreet || poRecord.billingAddress || "N/A",
          primaryContactName: poRecord.primaryContactName || cust?.name || "Primary Contact",
          email: poRecord.email || cust?.email || "N/A",
          phone: poRecord.phone || cust?.phone || "N/A",
          vendor: vend ? {
            id: vend.id,
            name: vend.name,
            contactPerson: vend.contactPerson,
            email: vend.email,
            phone: vend.phone,
            gstNumber: vend.gstNumber,
            address: vend.address
          } : null,
          dateReceived: poRecord.dateReceived,
          expectedDelivery: poRecord.expectedDelivery,
          branchCode: poRecord.branchCode || "HYD-HQ",
          currentStatus: poRecord.verificationStatus || "Pending",
          verificationStatus: poRecord.verificationStatus || "Pending",
          approvalStatus: poRecord.approvalStatus || "Pending Approval",
          poStatus: poRecord.poStatus || "PENDING",
          stockStatus: computedStockState,
          subtotal: Number(poRecord.subtotal || poRecord.totalAmount || 0),
          grandTotal: Number(poRecord.grandTotal || poRecord.totalAmount || 0),
          totalAmount: Number(poRecord.totalAmount || 0),
          isStockAvailable: stockSufficient,
          lineItems: lineItemsAudit
        }
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, reason: "Data pipeline exception", error: err.message },
        { status: 500 }
      );
    }
  }
}

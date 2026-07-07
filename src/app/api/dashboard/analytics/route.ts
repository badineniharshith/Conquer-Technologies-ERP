import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { erpDb } from "@/lib/db";
import { getCached, setCached } from "@/lib/cache";
import { getSeasonalPredictions } from "@/lib/predictions";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = `dashboard-analytics-${user.id}-${user.roleId}`;
  const cachedData = getCached<any>(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  try {
    const products = await erpDb.products.findMany();
    const categories = await erpDb.categories.findMany();
    const inventory = await erpDb.inventory.findMany();
    const prices = await erpDb.productPrices.findMany();
    const movements = await erpDb.inventoryMovements.findMany({
      orderBy: { timestamp: "desc" },
      take: 20
    });
    const alerts = await erpDb.stockAlerts.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const minimalInventory = inventory.map((i: any) => ({
      id: i.id,
      sku: i.sku,
      branchCode: i.branchCode,
      quantity: i.quantity,
      availableQty: i.availableQty,
      reservedQty: i.reservedQty || 0,
      allocatedQty: i.allocatedQty || 0,
      damagedQty: i.damagedQty || 0,
      returnedQty: i.returnedQty || 0,
      transitQty: i.transitQty || 0,
      incomingQty: i.incomingQty || 0,
      outgoingQty: i.outgoingQty || 0,
      deadQty: i.deadQty || 0,
      minStock: i.minStock || 5,
      ageingDays: i.ageingDays || 0,
      itemName: i.itemName
    }));

    const minimalProducts = products.map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      categoryId: p.categoryId,
      status: p.status,
      reorderLevel: p.reorderLevel,
      safetyStock: p.safetyStock
    }));

    const minimalPrices = prices.map((pr: any) => ({
      sku: pr.sku,
      branchCode: pr.branchCode,
      sellingPrice: pr.sellingPrice,
      costPrice: pr.costPrice || pr.sellingPrice * 0.72,
      mrp: pr.mrp,
      margin: pr.margin
    }));

    const predictions = getSeasonalPredictions(minimalProducts, categories);

    const responseData = {
      inventory: minimalInventory,
      prices: minimalPrices,
      categories,
      movements,
      alerts,
      predictions
    };

    // Cache the response for 30 seconds
    setCached(cacheKey, responseData, 30000);

    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

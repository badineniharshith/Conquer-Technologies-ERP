import { erpDb } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { redirect } from "next/navigation";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  // Verify access level
  const cookieStore = await cookies();
  const token = cookieStore.get("erp-session-token")?.value;
  if (!token) {
    redirect("/login");
  }

  const payload = await verifyJwt(token);
  if (!payload || payload.role === "CUSTOMER") {
    redirect("/403");
  }

  const [products, prices, inventory, categories] = await Promise.all([
    erpDb.products.findMany(),
    erpDb.productPrices.findMany(),
    erpDb.inventory.findMany(),
    erpDb.categories.findMany()
  ]);

  let priceHistory: any[] = [];
  if (!erpDb.isMock()) {
    try {
      const { prisma: localPrisma } = await import("@/lib/db");
      priceHistory = await (localPrisma as any).productPriceHistory.findMany({
        orderBy: { updatedAt: "asc" }
      });
    } catch (e) {
      priceHistory = [];
    }
  } else {
    // Fallback Mock data
    priceHistory = [
      { updatedAt: new Date("2026-06-01"), branchCode: "HYD-HQ", sku: "APP-IP16", sellingPrice: 79000 },
      { updatedAt: new Date("2026-06-08"), branchCode: "HYD-HQ", sku: "APP-IP16", sellingPrice: 81000 },
      { updatedAt: new Date("2026-06-15"), branchCode: "HYD-HQ", sku: "APP-IP16", sellingPrice: 79500 },
      { updatedAt: new Date("2026-06-22"), branchCode: "HYD-HQ", sku: "APP-IP16", sellingPrice: 82000 },
      { updatedAt: new Date("2026-06-28"), branchCode: "HYD-HQ", sku: "APP-IP16", sellingPrice: 79900 },
    ];
  }

  const minimalProducts = products.map((p: any) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    categoryId: p.categoryId
  }));

  const minimalPrices = prices.map((pr: any) => ({
    sku: pr.sku,
    branchCode: pr.branchCode,
    sellingPrice: pr.sellingPrice,
    costPrice: pr.costPrice
  }));

  const minimalInventory = inventory.map((i: any) => ({
    sku: i.sku,
    quantity: i.quantity,
    branchCode: i.branchCode
  }));

  const minimalHistory = priceHistory.map((h: any) => ({
    sku: h.sku,
    branchCode: h.branchCode,
    sellingPrice: h.sellingPrice,
    mrp: h.mrp || 0,
    updatedAt: h.updatedAt
  }));

  return (
    <AnalyticsClient
      products={minimalProducts}
      prices={minimalPrices}
      inventory={minimalInventory}
      categories={categories}
      priceHistory={minimalHistory}
    />
  );
}

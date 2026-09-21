import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import StockMovementClient from "./StockMovementClient";

export const dynamic = "force-dynamic";

export default async function StockMovementPage() {
  const [movements, adjustments, products, branches, inventories] = await Promise.all([
    prisma.inventoryMovement.findMany({ orderBy: { timestamp: "desc" }, take: 150 }),
    (prisma as any).stockAdjustment
      ? (prisma as any).stockAdjustment.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => [])
      : [],
    prisma.product.findMany({ 
      select: { id: true, sku: true, name: true, brand: true },
      orderBy: { name: "asc" }
    }),
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.inventory.findMany({
      select: {
        sku: true,
        branchCode: true,
        branchId: true,
        quantity: true,
        reservedQty: true,
        allocatedQty: true,
        availableQty: true
      }
    })
  ]);

  // Build inventory lookup map: `${sku}_${branchCode}` -> { physical, allocated, reserved, available }
  const inventoryMap: Record<string, { physical: number; allocated: number; reserved: number; available: number }> = {};
  for (const inv of inventories) {
    const bCode = inv.branchCode || "HYD-HQ";
    const key = `${inv.sku}_${bCode}`;
    const physical = Number(inv.quantity || 0);
    const reserved = Number(inv.reservedQty || 0);
    const allocated = Number(inv.allocatedQty || 0);
    const available = Math.max(0, physical - reserved - allocated);
    inventoryMap[key] = { physical, allocated, reserved, available };

    // Also map by branchId if branchCode differs
    if (inv.branchId && inv.branchId !== bCode) {
      inventoryMap[`${inv.sku}_${inv.branchId}`] = { physical, allocated, reserved, available };
    }
  }

  return (
    <StockMovementClient
      initialMovements={serializeData(movements)}
      initialAdjustments={serializeData(adjustments)}
      products={serializeData(products)}
      branches={serializeData(branches)}
      inventoryMap={inventoryMap}
    />
  );
}

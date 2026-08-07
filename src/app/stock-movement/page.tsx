import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import StockMovementClient from "./StockMovementClient";

export const dynamic = "force-dynamic";

export default async function StockMovementPage() {
  const [movements, products, branches] = await Promise.all([
    prisma.inventoryMovement.findMany({ orderBy: { timestamp: "desc" }, take: 100 }),
    prisma.product.findMany({ select: { id: true, sku: true, name: true } }),
    prisma.branch.findMany({ select: { id: true, name: true } }),
  ]);

  return (
    <StockMovementClient
      initialMovements={serializeData(movements)}
      products={serializeData(products)}
      branches={serializeData(branches)}
    />
  );
}

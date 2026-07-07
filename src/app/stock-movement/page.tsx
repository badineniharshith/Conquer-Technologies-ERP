import { erpDb } from "@/lib/db";
import StockMovementClient from "./StockMovementClient";

export const dynamic = "force-dynamic";

export default async function StockMovementPage() {
  const [movements, products, branches] = await Promise.all([
    erpDb.inventoryMovements.findMany(),
    erpDb.products.findMany(),
    erpDb.branches.findMany(),
  ]);

  return (
    <StockMovementClient
      initialMovements={movements}
      products={products}
      branches={branches}
    />
  );
}

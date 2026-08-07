import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [inventory, products, categories, reservations, purchaseOrders, alerts, movements] = await Promise.all([
    prisma.inventory.findMany({ take: 100 }),
    prisma.product.findMany({ take: 100 }),
    prisma.category.findMany(),
    prisma.stockReservation.findMany({ take: 50, orderBy: { createdAt: "desc" } }),
    prisma.purchaseOrder.findMany({ take: 50, orderBy: { createdAt: "desc" } }),
    prisma.stockAlert.findMany({ take: 20, orderBy: { createdAt: "desc" } }),
    prisma.inventoryMovement.findMany({ take: 50, orderBy: { timestamp: "desc" } }),
  ]);

  return (
    <DashboardClient
      inventory={serializeData(inventory)}
      products={serializeData(products)}
      categories={serializeData(categories)}
      reservations={serializeData(reservations)}
      transfers={serializeData(purchaseOrders)}
      alerts={serializeData(alerts)}
      prices={[]}
      movements={serializeData(movements)}
      auditLogs={[]}
      predictions={[]}
    />
  );
}

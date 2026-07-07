import { erpDb } from "@/lib/db";
import PurchaseOrdersClient from "@/components/purchase-orders/PurchaseOrdersClient";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const purchaseOrders = await erpDb.purchaseOrders.findMany();
  const users = await erpDb.users.findMany();
  const branches = await erpDb.branches.findMany();
  const products = await erpDb.products.findMany();

  return (
    <PurchaseOrdersClient
      initialPurchaseOrders={purchaseOrders}
      users={users}
      branches={branches}
      products={products}
    />
  );
}

import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import PurchaseOrdersClient from "@/components/purchase-orders/PurchaseOrdersClient";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const [purchaseOrders, customers, branches, products, vendors] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { dateReceived: "desc" },
      take: 50,
      include: {
        customer: true,
        poItems: true,
        attachments: true,
        statusHistory: true
      }
    }),
    prisma.customer.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        gstNumber: true,
        companyLegalName: true,
        phone: true,
        billingAddress: true
      }
    }),
    prisma.branch.findMany({
      select: {
        id: true,
        name: true
      }
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        sku: true,
        name: true
      }
    }),
    prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        contactPerson: true,
        email: true,
        phone: true,
        address: true,
        gstNumber: true
      }
    })
  ]);

  return (
    <PurchaseOrdersClient
      initialPurchaseOrders={serializeData(purchaseOrders)}
      users={serializeData(customers)}
      branches={serializeData(branches)}
      products={serializeData(products)}
      vendors={serializeData(vendors)}
    />
  );
}

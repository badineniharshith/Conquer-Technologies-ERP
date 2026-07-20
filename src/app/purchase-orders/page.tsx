import { erpDb } from "@/lib/db";
import PurchaseOrdersClient from "@/components/purchase-orders/PurchaseOrdersClient";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  // Load data in parallel, selecting only the necessary columns for faster query performance and limiting POs to 50
  const [purchaseOrders, users, branches, products, vendors] = await Promise.all([
    erpDb.purchaseOrders.findMany({
      orderBy: { dateReceived: "desc" },
      take: 50,
      select: {
        id: true,
        poNumber: true,
        customerId: true,
        customerName: true,
        companyName: true,
        vendorId: true,
        totalAmount: true,
        dateReceived: true,
        expectedDelivery: true,
        totalItems: true,
        verificationStatus: true,
        stockStatus: true,
        branchCode: true,
        itemsJson: true
      }
    }),
    erpDb.users.findMany({
      where: { roleId: "CUSTOMER", status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true
      }
    }),
    erpDb.branches.findMany({
      select: {
        id: true,
        name: true
      }
    }),
    erpDb.products.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        sku: true,
        name: true
      }
    }),
    erpDb.vendors.findMany({
      where: { status: "ACTIVE" },
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
      initialPurchaseOrders={purchaseOrders}
      users={users}
      branches={branches}
      products={products}
      vendors={vendors}
    />
  );
}

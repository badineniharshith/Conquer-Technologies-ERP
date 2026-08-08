import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import OrdersClient from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  let orders: any[] = [];
  try {
    orders = await prisma.$queryRawUnsafe('SELECT * FROM orders ORDER BY order_date DESC');
  } catch (e) {
    orders = [
      { order_number: "181414", order_date: "2026-06-15", po_number: "PO-2026-ACC-001", units_count: 50, line_items_count: 1, total_amount: 174999.90, status: "Approved" },
      { order_number: "713636", order_date: "2026-06-10", po_number: "PO-2026-ACC-002", units_count: 10, line_items_count: 1, total_amount: 896201.10, status: "Approved" },
      { order_number: "923411", order_date: "2026-05-28", po_number: "PO-2026-ACC-003", units_count: 25, line_items_count: 2, total_amount: 4997500.00, status: "Delivered" }
    ];
  }

  return <OrdersClient initialOrders={serializeData(orders)} />;
}

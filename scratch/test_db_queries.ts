import { erpDb, prisma } from '../src/lib/db';

async function testSelectBug() {
  console.log("=== TESTING SELECT BUG IN PURCHASE ORDERS ===");
  try {
    const res = await prisma.purchaseOrder.findMany({
      take: 2,
      select: { id: true, poNumber: true },
      // include: { user: true } // If include is added, Prisma throws!
    });
    console.log("Prisma with select only succeeds:", res);
  } catch (err: any) {
    console.error("Prisma select failed:", err.message);
  }

  try {
    const dbPos = await erpDb.purchaseOrders.findMany({
      take: 2,
      select: { id: true, poNumber: true }
    });
    console.log("erpDb purchaseOrders with select result:", dbPos);
  } catch (err: any) {
    console.error("erpDb purchaseOrders failed:", err);
  }
}

testSelectBug();

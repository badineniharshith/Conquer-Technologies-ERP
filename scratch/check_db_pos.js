const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const crmPos = await prisma.$queryRawUnsafe('SELECT * FROM crm.crm_purchase_orders LIMIT 10');
    console.log('--- CRM POs (crm.crm_purchase_orders) ---');
    console.log('Count:', crmPos.length);
    console.log(JSON.stringify(crmPos, null, 2));

    const crmPoItems = await prisma.$queryRawUnsafe('SELECT * FROM crm.crm_purchase_order_items LIMIT 10');
    console.log('--- CRM PO Items (crm.crm_purchase_order_items) ---');
    console.log(JSON.stringify(crmPoItems, null, 2));

    const erpPos = await prisma.purchaseOrder.findMany({ take: 10, include: { poItems: true } });
    console.log('--- ERP POs (public.purchase_orders) ---');
    console.log('Count:', erpPos.length);
    console.log(JSON.stringify(erpPos, null, 2));

    const stockRes = await prisma.stockReservation.findMany({ take: 10, include: { items: true } });
    console.log('--- Stock Reservations (public.stock_reservations) ---');
    console.log('Count:', stockRes.length);
    console.log(JSON.stringify(stockRes, null, 2));
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

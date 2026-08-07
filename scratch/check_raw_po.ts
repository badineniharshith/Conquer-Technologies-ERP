import { prisma } from '../src/lib/db';

async function checkPo() {
  const po = await prisma.purchaseOrder.findFirst({
    include: {
      poItems: true,
      customer: true,
      statusHistory: true
    }
  });
  console.log("Raw DB PurchaseOrder:", JSON.stringify(po, null, 2));
}

checkPo();

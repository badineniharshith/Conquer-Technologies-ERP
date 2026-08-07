import { erpDb } from '../src/lib/db';

async function testFullPo() {
  const pos = await erpDb.purchaseOrders.findMany({ take: 3 });
  console.log("Full POs from erpDb:");
  pos.forEach((po: any) => {
    console.log({
      id: po.id,
      poNumber: po.poNumber,
      customerName: po.customerName,
      companyName: po.companyName,
      totalAmount: po.totalAmount,
      verificationStatus: po.verificationStatus,
      stockStatus: po.stockStatus,
      itemsJson: po.itemsJson
    });
  });
}

testFullPo();

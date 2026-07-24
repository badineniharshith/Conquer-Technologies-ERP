const { erpDb } = require('../src/lib/db');

async function main() {
  console.log("Testing erpDb.purchaseOrders.findMany()...");
  const pos = await erpDb.purchaseOrders.findMany();
  console.log(`Found ${pos.length} purchase orders:`);
  console.log(JSON.stringify(pos, null, 2));
}

main().catch(err => console.error("Error:", err));

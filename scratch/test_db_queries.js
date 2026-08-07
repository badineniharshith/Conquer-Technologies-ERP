const { erpDb } = require('../src/lib/db');

async function testQueries() {
  console.log("=== TESTING ERP DB QUERIES FROM NEON DB ===");

  try {
    const products = await erpDb.products.findMany({ take: 5 });
    console.log("Products count returned:", products?.length);
    if (products?.length > 0) {
      console.log("Sample product:", { id: products[0].id, sku: products[0].sku, name: products[0].name });
    }

    const inventories = await erpDb.inventories.findMany({ take: 5 });
    console.log("\nInventories count returned:", inventories?.length);
    if (inventories?.length > 0) {
      console.log("Sample inventory item:", inventories[0]);
    }

    const pos = await erpDb.purchaseOrders.findMany({ take: 5 });
    console.log("\nPurchase Orders count returned:", pos?.length);
    if (pos?.length > 0) {
      console.log("Sample PO:", { id: pos[0].id, poNumber: pos[0].poNumber, status: pos[0].status, itemsCount: pos[0].poItems?.length });
    }

    const alerts = await erpDb.stockAlerts.findMany();
    console.log("\nStock Alerts count returned:", alerts?.length);

    console.log("\n✓ ALL QUERIES SUCCESSFUL!");
  } catch (err) {
    console.error("Query test failed:", err);
  }
}

testQueries();

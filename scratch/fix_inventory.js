const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInventoryQuantities() {
  console.log("=== FIXING INVENTORY QUANTITIES IN NEON DB ===");
  try {
    const updated = await prisma.$executeRawUnsafe(`
      UPDATE "inventories" 
      SET "quantity" = CASE WHEN "available_stock" > 0 THEN "available_stock" ELSE 50 END,
          "available_qty" = CASE WHEN "available_stock" > 0 THEN "available_stock" ELSE 50 END
      WHERE "quantity" = 0 OR "available_qty" = 0
    `);
    console.log("Updated inventory rows:", updated);

    const inv = await prisma.inventory.findMany();
    console.log("Updated Inventory:", inv.map(i => ({ id: i.id, sku: i.sku, quantity: i.quantity, availableQty: i.availableQty, availableStock: i.availableStock })));

  } catch (err) {
    console.error("Error fixing inventory:", err);
  } finally {
    await prisma.$disconnect();
  }
}

fixInventoryQuantities();

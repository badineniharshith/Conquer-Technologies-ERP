import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateLargeDatabase } from "../src/lib/largeCatalog";

const prisma = new PrismaClient();
const hashPassword = (plain: string) => bcrypt.hashSync(plain, 10);

async function main() {
  console.log("Seeding Conquer_DB database with catalog and master records...");

  // 1. Branches
  const branches = [
    { id: "HYD-HQ", name: "Hyderabad Corporate Office" },
    { id: "HYD-THUB", name: "Hyderabad T-Hub Experience Center" },
    { id: "HYD-JH", name: "Hyderabad Jubilee Hills" },
    { id: "BLR", name: "Bengaluru HSR Layout" },
    { id: "CHN", name: "Chennai Anna Nagar" },
    { id: "MUM", name: "Mumbai Worli" },
    { id: "DEL", name: "Gurgaon Delhi NCR" },
    { id: "VZG", name: "Visakhapatnam" },
    { id: "VJA", name: "Vijayawada" }
  ];

  for (const b of branches) {
    await (prisma as any).branch.upsert({
      where: { id: b.id },
      update: { name: b.name },
      create: { id: b.id, name: b.name }
    });
  }
  console.log("Seeded Branches.");

  // 2. Large Catalog Data
  const {
    categories: catalogCategories,
    products: catalogProducts,
    inventory: catalogInventory
  } = generateLargeDatabase();

  for (const cat of catalogCategories) {
    await (prisma as any).category.upsert({
      where: { id: cat.id },
      update: { name: cat.name },
      create: { id: cat.id, name: cat.name }
    });
  }
  console.log(`Seeded ${catalogCategories.length} Categories.`);

  for (const prod of catalogProducts) {
    await (prisma as any).product.upsert({
      where: { sku: prod.sku },
      update: {
        name: prod.name,
        brand: prod.brand,
        categoryId: prod.categoryId,
        reorderLevel: prod.reorderLevel,
        safetyStock: prod.safetyStock
      },
      create: {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        brand: prod.brand,
        categoryId: prod.categoryId,
        serialTracking: prod.serialTracking || false,
        barcode: prod.barcode || `890${Math.floor(Math.random() * 100000000)}`,
        reorderLevel: prod.reorderLevel,
        safetyStock: prod.safetyStock,
        status: "ACTIVE"
      }
    });
  }
  console.log(`Seeded ${catalogProducts.length} Products.`);

  for (const inv of catalogInventory.slice(0, 500)) {
    await (prisma as any).inventory.upsert({
      where: { id: inv.id },
      update: {
        availableStock: inv.availableStock || inv.quantity || 0,
        reservedStock: inv.reservedStock || 0
      },
      create: {
        id: inv.id,
        productId: inv.productId,
        branchId: inv.branchId || "HYD-HQ",
        sku: inv.sku,
        branchCode: inv.branchCode || "HYD-HQ",
        itemName: inv.itemName || inv.sku,
        availableStock: inv.availableStock || inv.quantity || 0,
        reservedStock: inv.reservedStock || 0,
        reorderLevel: inv.reorderLevel || 8
      }
    });
  }
  console.log("Seeded Inventory records.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

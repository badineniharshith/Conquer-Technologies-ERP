const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectDb() {
  console.log("=== INSPECTING CURRENT DATABASE DATA ===");
  try {
    const roles = await prisma.role.findMany();
    console.log("ROLES:", roles);

    const superAdmin = await prisma.user.findFirst({
      where: { email: 'superadmin@conquererp.com' },
      include: { role: true, branch: true }
    });
    console.log("SUPER ADMIN USER FROM PRISMA:", JSON.stringify(superAdmin, null, 2));

    const allProducts = await prisma.product.findMany();
    console.log("PRODUCTS COUNT:", allProducts.length, allProducts);

    const inventory = await prisma.inventory.findMany();
    console.log("INVENTORY COUNT:", inventory.length, inventory);

  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDb();

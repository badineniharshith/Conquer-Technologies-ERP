const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNeon() {
  console.log("=== CHECKING NEON DATABASE TABLES & COUNTS ===");
  try {
    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    const branchCount = await prisma.branch.count();
    const productCount = await prisma.product.count();
    const inventoryCount = await prisma.inventory.count();

    console.log(`Users: ${userCount}, Roles: ${roleCount}, Branches: ${branchCount}, Products: ${productCount}, Inventory: ${inventoryCount}`);

    const users = await prisma.user.findMany({
      take: 10,
      include: { role: true, branch: true }
    });
    console.log("Sample Users:", users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role?.name, branch: u.branch?.name })));

  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkNeon();

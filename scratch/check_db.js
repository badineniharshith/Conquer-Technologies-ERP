const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    const productCount = await prisma.product.count();
    console.log('Product count:', productCount);

    const branchCount = await prisma.branch.count();
    console.log('Branch count:', branchCount);

    const inventoryCount = await prisma.inventory.count();
    console.log('Inventory count:', inventoryCount);
  } catch (error) {
    console.error('Error connecting or querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

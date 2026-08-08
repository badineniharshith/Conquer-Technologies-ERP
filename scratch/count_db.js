const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const custCount = await prisma.customer.count();
  const prodCount = await prisma.product.count();
  const catCount = await prisma.category.count();
  console.log('--- NEON DB STATS ---');
  console.log('Customers:', custCount);
  console.log('Products:', prodCount);
  console.log('Categories:', catCount);
}

check().finally(() => prisma.$disconnect());

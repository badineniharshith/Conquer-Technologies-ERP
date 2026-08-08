const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log("=== VERIFYING NEON DATABASE INTEGRITY ===");

  const userCount = await prisma.user.count();
  console.log(`✅ Users count: ${userCount}`);

  const testUser = await prisma.user.findFirst({
    where: { email: 'superadmin@conquererp.com' },
    include: { role: true, branch: true }
  });
  console.log("✅ Sample User lookup (prisma.user.findUnique / findFirst):");
  console.log({
    id: testUser.id,
    name: testUser.name,
    email: testUser.email,
    role: testUser.role.name,
    branch: testUser.branch ? testUser.branch.name : null
  });

  const customerCount = await prisma.customer.count();
  console.log(`\n✅ Customers count: ${customerCount}`);
  const sampleCustomer = await prisma.customer.findFirst({
    include: { assignedManager: true, assignedExecutive: true, branch: true }
  });
  console.log("✅ Sample Customer lookup:", {
    name: sampleCustomer.name,
    email: sampleCustomer.email,
    manager: sampleCustomer.assignedManager ? sampleCustomer.assignedManager.name : null,
    executive: sampleCustomer.assignedExecutive ? sampleCustomer.assignedExecutive.name : null
  });

  const productCount = await prisma.product.count();
  console.log(`\n✅ Products count: ${productCount}`);

  const poCount = await prisma.purchaseOrder.count();
  console.log(`\n✅ Purchase Orders count: ${poCount}`);

  const reservationCount = await prisma.stockReservation.count();
  console.log(`\n✅ Stock Reservations count: ${reservationCount}`);

  console.log("\n🎉 ALL PRISMA DATABASE QUERIES EXECUTED WITH ZERO ERRORS!");
}

verify()
  .catch(err => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

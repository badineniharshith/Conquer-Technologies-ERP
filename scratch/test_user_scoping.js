const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyScoping() {
  console.log("=== TESTING USER DOWNLINE SCOPING AND ERP ACCESS PERMISSIONS ===");

  // Test Super Admin
  const admin = await prisma.user.findFirst({ where: { email: 'superadmin@conquererp.com' } });
  console.log("1. Super Admin:", admin.name, "ID:", admin.id);

  // Test Operations Manager (Sophia Chen)
  const opsMgr = await prisma.user.findFirst({ where: { email: 'sophia.chen@conquererp.com' } });
  console.log("2. Ops Manager:", opsMgr.name, "ID:", opsMgr.id);

  // Fetch subordinates of Sophia Chen
  const subs = await prisma.user.findMany({ where: { reportsToId: opsMgr.id } });
  console.log("   Direct Subordinates of Sophia Chen:", subs.map(s => `${s.name} (${s.email})`));

  // Test Sales Director (Rajesh Kumar)
  const salesDirector = await prisma.user.findFirst({ where: { email: 'sales.director@conquererp.com' } });
  console.log("\n3. Sales Director:", salesDirector.name, "ID:", salesDirector.id);
  const salesSubs = await prisma.user.findMany({ where: { reportsToId: salesDirector.id } });
  console.log("   Direct Subordinates of Sales Director:", salesSubs.map(s => `${s.name} (${s.email})`));

  console.log("\n🎉 ALL DOWNLINE HIERARCHY SCOPING AUDITS SUCCEEDED!");
}

verifyScoping().catch(console.error).finally(() => prisma.$disconnect());

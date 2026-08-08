const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  console.log("=== TESTING USER AUTH & LOOKUP FOR ALL SEEDED ACCOUNTS ===");

  const emails = [
    "superadmin@conquererp.com",
    "marcus.sterling@conquererp.com",
    "sophia.chen@conquererp.com",
    "vikram.rao@conquererp.com",
    "ananya.sharma@conquererp.com",
    "david.reynolds@conquererp.com",
    "jessica.taylor@conquererp.com",
    "karan.patel@conquererp.com",
    "network@cisco.com",
    "enterprise@dell.com",
    "asset@ibm.com",
    "supplychain@infosys.com",
    "orders@microsoft.com",
    "procurement@oracle.com",
    "hardware@tcs.com",
    "procurement@wipro.com"
  ];

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, branch: true }
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      continue;
    }

    const isPassValid = bcrypt.compareSync("Admin@123", user.passwordHash);
    console.log(`✅ [${user.name}] (${user.email}) | Role: ${user.role.name} | Pass Match: ${isPassValid}`);
  }
}

testAuth().catch(console.error).finally(() => prisma.$disconnect());

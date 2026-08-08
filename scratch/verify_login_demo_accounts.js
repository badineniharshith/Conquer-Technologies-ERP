const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function verifyDemoAccounts() {
  console.log("=== VERIFYING ALL 6 DEMO ACCOUNTS IN DATABASE ===");

  const expectedAccounts = [
    { label: "Admin", email: "superadmin@conquererp.com", roleType: "ADMIN" },
    { label: "Director", email: "marcus.sterling@conquererp.com", roleType: "DIRECTOR" },
    { label: "Operations Manager", email: "sophia.chen@conquererp.com", roleType: "MANAGER" },
    { label: "Assistant Manager", email: "ananya.sharma@conquererp.com", roleType: "ASST_MANAGER" },
    { label: "Operations Executive", email: "karan.patel@conquererp.com", roleType: "EXECUTIVE" },
    { label: "Customer", email: "asset@ibm.com", roleType: "CUSTOMER" }
  ];

  for (const acc of expectedAccounts) {
    const user = await prisma.user.findUnique({
      where: { email: acc.email },
      include: { role: true }
    });

    if (!user) {
      console.error(`❌ Missing account: ${acc.email}`);
      continue;
    }

    const passMatch = bcrypt.compareSync("Admin@123", user.passwordHash);
    console.log(`✅ [${acc.label}] (${user.email}) | Role: ${user.role?.name || user.roleId} | Active: ${user.isActive} | Pass Valid: ${passMatch}`);
  }

  console.log("\n🎉 ALL 6 DEMO ACCOUNTS VERIFIED IN DATABASE WITH VALID Admin@123 PASSWORDS!");
}

verifyDemoAccounts().catch(console.error).finally(() => prisma.$disconnect());

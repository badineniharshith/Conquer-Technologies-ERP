const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testHierarchyIntegrity() {
  console.log("=== TESTING FULL HIERARCHY ACCOUNT AUDIT ===");

  const testAccounts = [
    { email: "superadmin@conquererp.com", expectedRole: "SUPER_ADMIN" },
    { email: "admin@conquererp.com", expectedRole: "ADMIN" },
    { email: "sales.director@conquererp.com", expectedRole: "SALES_DIRECTOR" },
    { email: "tech.director@conquererp.com", expectedRole: "DIRECTOR_OF_TECHNOLOGY" },
    { email: "mktg.manager@conquererp.com", expectedRole: "MARKETING_MANAGER" },
    { email: "postsales.manager@conquererp.com", expectedRole: "POST_SALES_MANAGER" },
    { email: "marcus.sterling@conquererp.com", expectedRole: "DIRECTOR_OPERATIONS" },
    { email: "biz.manager@conquererp.com", expectedRole: "BUSINESS_MANAGER" },
    { email: "presales.manager@conquererp.com", expectedRole: "PRESALES_MANAGER" },
    { email: "sophia.chen@conquererp.com", expectedRole: "OPERATIONS_MANAGER" },
    { email: "rsm.south@conquererp.com", expectedRole: "REGIONAL_SALES_MANAGER" },
    { email: "ananya.sharma@conquererp.com", expectedRole: "ASSISTANT_MANAGER" },
    { email: "kam.sales@conquererp.com", expectedRole: "KEY_ACCOUNT_MANAGER" },
    { email: "karan.patel@conquererp.com", expectedRole: "OPERATIONS_EXECUTIVE" },
    { email: "inside.sales@conquererp.com", expectedRole: "INSIDE_SALES_MANAGER" }
  ];

  for (const acc of testAccounts) {
    const user = await prisma.user.findUnique({
      where: { email: acc.email },
      include: { role: true, reportsTo: true }
    });

    if (!user) {
      console.error(`❌ Missing user: ${acc.email}`);
      continue;
    }

    const passMatch = bcrypt.compareSync("Admin@123", user.passwordHash);
    console.log(`✅ [${user.name}] (${user.email}) | Role: ${user.role.name} | Reports To: ${user.reportsTo ? user.reportsTo.name : 'Top Level'} | Pass: ${passMatch}`);
  }
}

testHierarchyIntegrity().catch(console.error).finally(() => prisma.$disconnect());

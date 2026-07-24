// scripts/backfill-customer-ids.js
// Backfills customerId (CUS000001 format) and companyName for existing CUSTOMER users

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Backfilling Customer IDs and Company Names...");

  const customers = await prisma.user.findMany({
    where: { roleId: "CUSTOMER", customerId: null },
    orderBy: { createdAt: "asc" },
  });

  if (customers.length === 0) {
    console.log("✅ No customers need backfill.");
    return;
  }

  // Find the highest existing customerId to continue from
  const lastCustomer = await prisma.user.findFirst({
    where: { customerId: { not: null } },
    orderBy: { customerId: "desc" },
  });

  let nextNum = 1;
  if (lastCustomer?.customerId) {
    const match = lastCustomer.customerId.match(/CUS(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  console.log(`Found ${customers.length} customers without IDs. Starting from CUS${String(nextNum).padStart(6, "0")}`);

  for (const customer of customers) {
    const customerId = `CUS${String(nextNum).padStart(6, "0")}`;
    const companyName = customer.companyName || customer.name || "";

    await prisma.user.update({
      where: { id: customer.id },
      data: {
        customerId,
        companyName: companyName || customer.name,
      },
    });

    console.log(`  ✅ ${customerId} → ${customer.name} (${customer.email})`);
    nextNum++;
  }

  console.log(`\n✅ Backfill complete. ${customers.length} customers updated.`);
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

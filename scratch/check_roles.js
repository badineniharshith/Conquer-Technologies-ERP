const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoles() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, roleId: true, status: true, reportsToId: true }, orderBy: { createdAt: 'asc' } });
  const roleCounts = {};
  users.forEach(u => {
    roleCounts[u.roleId] = (roleCounts[u.roleId] || 0) + 1;
  });
  console.log("=== ROLE DISTRIBUTION ===");
  Object.entries(roleCounts).forEach(([role, count]) => console.log(`  ${role}: ${count} users`));

  console.log("\n=== ALL USERS ===");
  users.forEach(u => console.log(`  [${u.roleId}] ${u.name} | ${u.email} | status=${u.status} | reportsTo=${u.reportsToId || 'ROOT'}`));

  const topLevel = users.filter(u => !u.reportsToId);
  console.log(`\n=== TOP-LEVEL USERS (no reportsTo): ${topLevel.length} ===`);
  topLevel.forEach(u => console.log(`  [${u.roleId}] ${u.name}`));
}

checkRoles().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoleTable() {
  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  console.log("=== ROLES TABLE ===");
  roles.forEach(r => console.log(`  id=${r.id} | name=${r.name}`));
  
  // Also check a sample ERP user's role
  const directorUser = await prisma.user.findFirst({
    where: { email: 'marcus.sterling@conquererp.com' },
    include: { role: true, branch: true }
  });
  console.log("\n=== DIRECTOR USER ===");
  if (directorUser) {
    console.log(`  User: ${directorUser.name}`);
    console.log(`  roleId: ${directorUser.roleId}`);
    console.log(`  role.name: ${directorUser.role?.name}`);
    console.log(`  role.id: ${directorUser.role?.id}`);
  }

  const superadmin = await prisma.user.findFirst({
    where: { email: 'superadmin@conquererp.com' },
    include: { role: true }
  });
  console.log("\n=== SUPERADMIN USER ===");
  if (superadmin) {
    console.log(`  roleId: ${superadmin.roleId}`);
    console.log(`  role.name: ${superadmin.role?.name}`);
  }

  const customer = await prisma.user.findFirst({
    where: { email: 'asset@ibm.com' },
    include: { role: true }
  });
  console.log("\n=== CUSTOMER USER ===");
  if (customer) {
    console.log(`  roleId: ${customer.roleId}`);
    console.log(`  role.name: ${customer.role?.name}`);
  }
}

checkRoleTable().catch(console.error).finally(() => prisma.$disconnect());

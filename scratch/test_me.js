const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mapDbUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    branch: user.branchName || (typeof user.branch === "string" ? user.branch : user.branch?.name) || "Head Office",
    status: user.status || (user.isActive ? "ACTIVE" : "PENDING"),
    assignedEmployeeId: user.assignedEmployeeId || null
  };
};

async function testMe() {
  const superadmin = await prisma.user.findFirst({
    where: { email: 'superadmin@conquererp.com' }
  });
  
  const rawDbUser = await prisma.user.findUnique({
    where: { id: superadmin.id },
    include: { role: true, branch: true }
  });
  console.log("rawDbUser.role:", rawDbUser.role);

  const mapped = mapDbUser(rawDbUser);
  console.log("mapped.role:", mapped.role);
  console.log("mapped.role?.name:", mapped.role?.name);
  console.log("mapped.roleId:", mapped.roleId);

  const resultUser = {
    id: mapped.id,
    customerId: mapped.customerId || null,
    name: mapped.name,
    companyName: mapped.companyName || mapped.name,
    email: mapped.email,
    role: mapped.role?.name || (mapped.roleId === "RSM" ? "REGIONAL_SALES_MANAGER" : mapped.roleId),
    branch: mapped.branch || "Head Office",
    status: mapped.status
  };

  console.log("RESULT USER FOR /api/auth/me:", resultUser);
}

testMe().then(() => prisma.$disconnect());

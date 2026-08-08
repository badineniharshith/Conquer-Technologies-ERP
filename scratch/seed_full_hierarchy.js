const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const defaultPasswordHash = bcrypt.hashSync('Admin@123', 10);

async function seedFullHierarchy() {
  console.log("🚀 Starting Full L0-L5 Organizational Hierarchy Seeding...");

  // 1. Roles Definition
  const rolesList = [
    // L0
    { name: 'SUPER_ADMIN', level: 100 },
    { name: 'ADMIN', level: 95 },
    { name: 'MANAGING_DIRECTOR', level: 95 },
    // L1
    { name: 'SALES_DIRECTOR', level: 90 },
    { name: 'DIRECTOR_OF_TECHNOLOGY', level: 90 },
    { name: 'MARKETING_MANAGER', level: 90 },
    { name: 'POST_SALES_MANAGER', level: 90 },
    { name: 'DIRECTOR_OPERATIONS', level: 90 },
    // L2
    { name: 'BUSINESS_MANAGER', level: 80 },
    { name: 'PRESALES_MANAGER', level: 80 },
    { name: 'ASST_MARKETING_MANAGER', level: 80 },
    { name: 'TEAM_LEAD', level: 80 },
    { name: 'OPERATIONS_MANAGER', level: 80 },
    // L3
    { name: 'REGIONAL_SALES_MANAGER', level: 70 },
    { name: 'SENIOR_PRESALES_LEAD', level: 70 },
    { name: 'TELECALLER', level: 70 },
    { name: 'FRONT_END_OPERATOR', level: 70 },
    { name: 'ASSISTANT_MANAGER', level: 70 },
    // L4
    { name: 'KEY_ACCOUNT_MANAGER', level: 60 },
    { name: 'PRESALES_CONSULTANT', level: 60 },
    { name: 'OPERATIONS_EXECUTIVE', level: 60 },
    // L5
    { name: 'INSIDE_SALES_MANAGER', level: 50 },
    // External
    { name: 'CUSTOMER', level: 10 }
  ];

  const rolesMap = {};
  for (const r of rolesList) {
    let role = await prisma.role.findUnique({ where: { name: r.name } });
    if (!role) {
      role = await prisma.role.create({ data: { name: r.name, level: r.level, isActive: true } });
    }
    rolesMap[r.name] = role.id;
  }

  // Get Branch
  let branch = await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({ data: { name: 'HYD-HQ' } });
  }

  // Helper to upsert user
  async function createUserNode({ email, name, roleKey, department, designation, employeeId, reportsToId = null }) {
    const roleId = rolesMap[roleKey];
    return await prisma.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash: defaultPasswordHash,
        roleId,
        department,
        designation,
        employeeId,
        reportsToId,
        branchId: branch.id,
        isActive: true,
        status: 'ACTIVE'
      },
      create: {
        email,
        name,
        passwordHash: defaultPasswordHash,
        roleId,
        department,
        designation,
        employeeId,
        reportsToId,
        branchId: branch.id,
        isActive: true,
        status: 'ACTIVE'
      }
    });
  }

  // L0 - Super Admin / MD
  const superAdmin = await createUserNode({
    email: 'superadmin@conquererp.com',
    name: 'Eleanor Vance',
    roleKey: 'SUPER_ADMIN',
    department: 'Management',
    designation: 'Super Admin / MD (L0)',
    employeeId: 'EMP-L0-001'
  });

  // System Admin
  const sysAdmin = await createUserNode({
    email: 'admin@conquererp.com',
    name: 'System Admin',
    roleKey: 'ADMIN',
    department: 'Management',
    designation: 'System Administrator (L0)',
    employeeId: 'EMP-L0-002',
    reportsToId: superAdmin.id
  });

  // L1 - Directors
  const salesDirector = await createUserNode({
    email: 'sales.director@conquererp.com',
    name: 'Rajesh Kumar',
    roleKey: 'SALES_DIRECTOR',
    department: 'Sales',
    designation: 'Sales Director (L1)',
    employeeId: 'EMP-L1-SALES',
    reportsToId: superAdmin.id
  });

  const techDirector = await createUserNode({
    email: 'tech.director@conquererp.com',
    name: 'Priya Sharma',
    roleKey: 'DIRECTOR_OF_TECHNOLOGY',
    department: 'Presales',
    designation: 'Director of Technology (L1)',
    employeeId: 'EMP-L1-TECH',
    reportsToId: superAdmin.id
  });

  const mktgManager = await createUserNode({
    email: 'mktg.manager@conquererp.com',
    name: 'Amitabh Sen',
    roleKey: 'MARKETING_MANAGER',
    department: 'Marketing',
    designation: 'Marketing Manager (L1)',
    employeeId: 'EMP-L1-MKTG',
    reportsToId: superAdmin.id
  });

  const postSalesManager = await createUserNode({
    email: 'postsales.manager@conquererp.com',
    name: 'Sunita Reddy',
    roleKey: 'POST_SALES_MANAGER',
    department: 'Post Sales',
    designation: 'Post Sales Manager (L1)',
    employeeId: 'EMP-L1-POST',
    reportsToId: superAdmin.id
  });

  const opsDirector = await createUserNode({
    email: 'marcus.sterling@conquererp.com',
    name: 'Marcus Sterling',
    roleKey: 'DIRECTOR_OPERATIONS',
    department: 'Operations',
    designation: 'Director of Operations (L1)',
    employeeId: 'EMP-L1-OPS',
    reportsToId: superAdmin.id
  });

  // L2 - Business & Department Managers
  const bizManager = await createUserNode({
    email: 'biz.manager@conquererp.com',
    name: 'Arjun Mehta',
    roleKey: 'BUSINESS_MANAGER',
    department: 'Sales',
    designation: 'Business Manager (L2)',
    employeeId: 'EMP-L2-SALES',
    reportsToId: salesDirector.id
  });

  const presalesMgr = await createUserNode({
    email: 'presales.manager@conquererp.com',
    name: 'Sneha Gupta',
    roleKey: 'PRESALES_MANAGER',
    department: 'Presales',
    designation: 'Presales Manager (L2)',
    employeeId: 'EMP-L2-TECH',
    reportsToId: techDirector.id
  });

  const opsMgr1 = await createUserNode({
    email: 'sophia.chen@conquererp.com',
    name: 'Sophia Chen',
    roleKey: 'OPERATIONS_MANAGER',
    department: 'Operations',
    designation: 'Operations Manager (L2)',
    employeeId: 'EMP-L2-OPS1',
    reportsToId: opsDirector.id
  });

  const opsMgr2 = await createUserNode({
    email: 'vikram.rao@conquererp.com',
    name: 'Vikramaditya Rao',
    roleKey: 'OPERATIONS_MANAGER',
    department: 'Operations',
    designation: 'Operations Manager (L2)',
    employeeId: 'EMP-L2-OPS2',
    reportsToId: opsDirector.id
  });

  // L3 - Regional Managers & Assistant Managers
  const regSalesMgr = await createUserNode({
    email: 'rsm.south@conquererp.com',
    name: 'Rohan Verma',
    roleKey: 'REGIONAL_SALES_MANAGER',
    department: 'Sales',
    designation: 'Regional Sales Manager (L3)',
    employeeId: 'EMP-L3-SALES',
    reportsToId: bizManager.id
  });

  const asstMgr1 = await createUserNode({
    email: 'ananya.sharma@conquererp.com',
    name: 'Ananya Sharma',
    roleKey: 'ASSISTANT_MANAGER',
    department: 'Operations',
    designation: 'Assistant Manager (L3)',
    employeeId: 'EMP-L3-OPS1',
    reportsToId: opsMgr2.id
  });

  const asstMgr2 = await createUserNode({
    email: 'david.reynolds@conquererp.com',
    name: 'David Reynolds',
    roleKey: 'ASSISTANT_MANAGER',
    department: 'Operations',
    designation: 'Assistant Manager (L3)',
    employeeId: 'EMP-L3-OPS2',
    reportsToId: opsMgr1.id
  });

  // L4 - Key Account Managers & Executives
  const kamSales = await createUserNode({
    email: 'kam.sales@conquererp.com',
    name: 'Kavita Nair',
    roleKey: 'KEY_ACCOUNT_MANAGER',
    department: 'Sales',
    designation: 'Key Account Manager (L4)',
    employeeId: 'EMP-L4-SALES',
    reportsToId: regSalesMgr.id
  });

  const opsExec1 = await createUserNode({
    email: 'jessica.taylor@conquererp.com',
    name: 'Jessica Taylor',
    roleKey: 'OPERATIONS_EXECUTIVE',
    department: 'Operations',
    designation: 'Operations Executive (L4)',
    employeeId: 'EMP-L4-OPS1',
    reportsToId: asstMgr2.id
  });

  const opsExec2 = await createUserNode({
    email: 'karan.patel@conquererp.com',
    name: 'Karan Patel',
    roleKey: 'OPERATIONS_EXECUTIVE',
    department: 'Operations',
    designation: 'Operations Executive (L4)',
    employeeId: 'EMP-L4-OPS2',
    reportsToId: asstMgr1.id
  });

  // L5 - Inside Sales Manager
  const insideSales = await createUserNode({
    email: 'inside.sales@conquererp.com',
    name: 'Deepak Patel',
    roleKey: 'INSIDE_SALES_MANAGER',
    department: 'Sales',
    designation: 'Inside Sales Manager (L5)',
    employeeId: 'EMP-L5-SALES',
    reportsToId: kamSales.id
  });

  console.log("✅ Seeding of Full L0-L5 Hierarchy Completed Successfully!");
}

seedFullHierarchy()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

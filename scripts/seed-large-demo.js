const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

const companies = [
  "Oracle", "Microsoft", "Google", "IBM", "Cisco",
  "Dell", "Infosys", "TCS", "Wipro", "Accenture",
  "Capgemini", "Cognizant", "SAP", "Adobe", "Intel"
];

const firstNames = [
  "Liam", "Noah", "Oliver", "James", "Elijah", "William", "Henry", "Lucas", "Benjamin", "Theodore",
  "Olivia", "Emma", "Charlotte", "Amelia", "Sophia", "Isabella", "Mia", "Evelyn", "Harper", "Luna",
  "Alexander", "Daniel", "Michael", "Ethan", "Matthew", "Aria", "Ella", "Avery", "Scarlett", "Grace"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"
];

function generateName() {
  const f = firstNames[Math.floor(Math.random() * firstNames.length)];
  const l = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${f} ${l}`;
}

async function main() {
  console.log("🌱 Seeding large realistic employee/customer demo dataset...");

  // Clear dependent tables first to avoid RESTRICT fkey fkey errors
  await prisma.opportunity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.stockReservation.deleteMany();
  await prisma.purchaseOrder.deleteMany();

  // Clear existing users except SUPER_ADMIN
  const count = await prisma.user.deleteMany({
    where: {
      roleId: {
        not: "SUPER_ADMIN"
      }
    }
  });
  console.log(`Cleared ${count.count} old non-admin users.`);

  // Find active branches
  const branches = await prisma.branch.findMany();
  if (branches.length === 0) {
    await prisma.branch.createMany({
      data: [
        { name: "HYD-HQ" },
        { name: "BLR-OFFICE" },
        { name: "MUM-HUB" }
      ]
    });
  }
  const activeBranches = await prisma.branch.findMany();

  // Find Super Admin
  const superAdmin = await prisma.user.findFirst({
    where: { roleId: "SUPER_ADMIN" }
  });
  if (!superAdmin) {
    throw new Error("Super Admin not found. Run base seed script first.");
  }

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const custPasswordHash = await bcrypt.hash("Admin@123", 10);

  let empCounter = 1;
  function nextEmpId() {
    const id = `EMP${String(empCounter).padStart(6, '0')}`;
    empCounter++;
    return id;
  }

  // 1. Create L1 Directors (3)
  const directors = [];
  for (let i = 0; i < 3; i++) {
    const name = generateName();
    const email = `director.${i}.${name.toLowerCase().replace(" ", ".")}@conquererp.com`;
    const u = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: "DIRECTOR_OPERATIONS",
        employeeId: nextEmpId(),
        reportsToId: superAdmin.id,
        branchId: activeBranches[i % activeBranches.length].id,
        branchName: activeBranches[i % activeBranches.length].name,
        status: "ACTIVE"
      }
    });
    directors.push(u);
  }
  console.log(`Created ${directors.length} Directors.`);

  // 2. Create L2 SCM Managers (15)
  const managers = [];
  for (let i = 0; i < 15; i++) {
    const name = generateName();
    const email = `manager.${i}.${name.toLowerCase().replace(" ", ".")}@conquererp.com`;
    const boss = directors[i % directors.length];
    const u = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: "OPERATIONS_MANAGER",
        employeeId: nextEmpId(),
        reportsToId: boss.id,
        branchId: boss.branchId,
        branchName: boss.branchName,
        status: "ACTIVE"
      }
    });
    managers.push(u);
  }
  console.log(`Created ${managers.length} SCM Managers.`);

  // 3. Create L3 Assistant Managers (45)
  const asstManagers = [];
  for (let i = 0; i < 45; i++) {
    const name = generateName();
    const email = `asst.${i}.${name.toLowerCase().replace(" ", ".")}@conquererp.com`;
    const boss = managers[i % managers.length];
    const u = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: "ASSISTANT_MANAGER",
        employeeId: nextEmpId(),
        reportsToId: boss.id,
        branchId: boss.branchId,
        branchName: boss.branchName,
        status: "ACTIVE"
      }
    });
    asstManagers.push(u);
  }
  console.log(`Created ${asstManagers.length} Assistant Managers.`);

  // 4. Create L4 Operations Executives (140)
  const executives = [];
  for (let i = 0; i < 140; i++) {
    const name = generateName();
    const email = `exec.${i}.${name.toLowerCase().replace(" ", ".")}@conquererp.com`;
    const boss = asstManagers[i % asstManagers.length];
    const u = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: "OPERATIONS_EXECUTIVE",
        employeeId: nextEmpId(),
        reportsToId: boss.id,
        branchId: boss.branchId,
        branchName: boss.branchName,
        status: "ACTIVE"
      }
    });
    executives.push(u);
  }
  console.log(`Created ${executives.length} Operations Executives.`);

  // 5. Create Customers (300) mapped to Executives
  console.log("Generating 300 customers...");
  for (let i = 0; i < 300; i++) {
    const company = companies[i % companies.length];
    const clientName = generateName();
    const companyCode = company.toUpperCase().replace(" ", "").substring(0, 4);
    const email = `${clientName.toLowerCase().replace(" ", ".")}.${i}@${company.toLowerCase()}.com`;
    const assignedExec = executives[i % executives.length];

    await prisma.user.create({
      data: {
        name: `${clientName} (${company})`,
        email,
        passwordHash: custPasswordHash,
        roleId: "CUSTOMER",
        assignedEmployeeId: assignedExec.id,
        branchId: assignedExec.branchId,
        branchName: assignedExec.branchName,
        status: "ACTIVE",
        address: `${100 + i}, Tech Park Lane, Sector ${5 + (i % 10)}`,
        phone: `98480${String(10000 + i)}`,
        customerType: "ENTERPRISE"
      }
    });
  }

  console.log("🎉 Seeding complete. Seeding Summary:");
  console.log("-------------------------------------");
  console.log("Super Admin: 1");
  console.log("L1 Directors: 3");
  console.log("L2 SCM Managers: 15");
  console.log("L3 Assistant Managers: 45");
  console.log("L4 Executives: 140");
  console.log("Total Employees seeded: ", empCounter - 1);
  console.log("Customers (Enterprise): 300");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

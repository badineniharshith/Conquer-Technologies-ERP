const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const ROLES = [
  { id: 'SUPER_ADMIN', name: 'Super Admin' },
  { id: 'DIRECTOR_OPERATIONS', name: 'Director of Operations' },
  { id: 'OPERATIONS_MANAGER', name: 'Operations / SCM / Logistics Manager' },
  { id: 'ASSISTANT_MANAGER', name: 'Assistant Manager' },
  { id: 'OPERATIONS_EXECUTIVE', name: 'Operations Executive' },
  { id: 'CUSTOMER', name: 'Customer' },
];

async function main() {
  console.log('🚀 Starting Hierarchy Clean & Reseed...');

  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const custPasswordHash = await bcrypt.hash('Admin@123', 10);

  // 1. Get existing branches (or default if none exist)
  let branches = await prisma.branch.findMany();
  if (branches.length === 0) {
    console.log('Creating default branches...');
    branches = await Promise.all([
      prisma.branch.create({ data: { id: 'branch-hyd', name: 'Hyderabad HQ' } }),
      prisma.branch.create({ data: { id: 'branch-blr', name: 'Bengaluru Branch' } }),
      prisma.branch.create({ data: { id: 'branch-chn', name: 'Chennai Hub' } }),
    ]);
  }
  const defaultBranchId = branches[0].id;

  // 2. Clean dependent records to ensure foreign key integrity
  console.log('🧹 Cleaning existing users, reservations, POs, opportunities...');
  await prisma.opportunity.deleteMany();
  await prisma.stockReservation.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // 3. Create Roles
  console.log('👑 Creating new Roles...');
  for (const r of ROLES) {
    await prisma.role.create({
      data: {
        id: r.id,
        name: r.name,
      },
    });
  }

  // 4. Create Users Hierarchy
  console.log('👥 Creating User Hierarchy...');

  // L0 - Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Eleanor Vance',
      email: 'superadmin@conquererp.com',
      passwordHash,
      roleId: 'SUPER_ADMIN',
      branchId: defaultBranchId,
      branchName: branches[0].name,
      phone: '+91 98765 00001',
      status: 'ACTIVE',
    },
  });

  // L1 - Director of Operations
  const director = await prisma.user.create({
    data: {
      name: 'Marcus Sterling',
      email: 'marcus.sterling@conquererp.com',
      passwordHash,
      roleId: 'DIRECTOR_OPERATIONS',
      reportsToId: superAdmin.id,
      branchId: defaultBranchId,
      branchName: branches[0].name,
      phone: '+91 98765 00002',
      status: 'ACTIVE',
    },
  });

  // L2 - Operations / SCM / Logistics Managers
  const mgr1 = await prisma.user.create({
    data: {
      name: 'Vikramaditya Rao',
      email: 'vikram.rao@conquererp.com',
      passwordHash,
      roleId: 'OPERATIONS_MANAGER',
      reportsToId: director.id,
      branchId: branches[0].id,
      branchName: branches[0].name,
      phone: '+91 98765 00003',
      status: 'ACTIVE',
    },
  });

  const mgr2 = await prisma.user.create({
    data: {
      name: 'Sophia Chen',
      email: 'sophia.chen@conquererp.com',
      passwordHash,
      roleId: 'OPERATIONS_MANAGER',
      reportsToId: director.id,
      branchId: branches[1] ? branches[1].id : defaultBranchId,
      branchName: branches[1] ? branches[1].name : branches[0].name,
      phone: '+91 98765 00004',
      status: 'ACTIVE',
    },
  });

  // L3 - Assistant Managers
  const asstMgr1 = await prisma.user.create({
    data: {
      name: 'Ananya Sharma',
      email: 'ananya.sharma@conquererp.com',
      passwordHash,
      roleId: 'ASSISTANT_MANAGER',
      reportsToId: mgr1.id,
      branchId: branches[0].id,
      branchName: branches[0].name,
      phone: '+91 98765 00005',
      status: 'ACTIVE',
    },
  });

  const asstMgr2 = await prisma.user.create({
    data: {
      name: 'David Reynolds',
      email: 'david.reynolds@conquererp.com',
      passwordHash,
      roleId: 'ASSISTANT_MANAGER',
      reportsToId: mgr2.id,
      branchId: branches[1] ? branches[1].id : defaultBranchId,
      branchName: branches[1] ? branches[1].name : branches[0].name,
      phone: '+91 98765 00006',
      status: 'ACTIVE',
    },
  });

  // L4 - Operations Executives
  const exec1 = await prisma.user.create({
    data: {
      name: 'Karan Patel',
      email: 'karan.patel@conquererp.com',
      passwordHash,
      roleId: 'OPERATIONS_EXECUTIVE',
      reportsToId: asstMgr1.id,
      branchId: branches[0].id,
      branchName: branches[0].name,
      phone: '+91 98765 00007',
      status: 'ACTIVE',
    },
  });

  const exec2 = await prisma.user.create({
    data: {
      name: 'Jessica Taylor',
      email: 'jessica.taylor@conquererp.com',
      passwordHash,
      roleId: 'OPERATIONS_EXECUTIVE',
      reportsToId: asstMgr2.id,
      branchId: branches[1] ? branches[1].id : defaultBranchId,
      branchName: branches[1] ? branches[1].name : branches[0].name,
      phone: '+91 98765 00008',
      status: 'ACTIVE',
    },
  });

  // Customers - Enterprise Companies linked ONLY to an Operations Executive
  const customerCompanies = [
    { name: 'Oracle India Ltd', email: 'procurement@oracle.com', company: 'Oracle', exec: exec1 },
    { name: 'Microsoft Corporation', email: 'orders@microsoft.com', company: 'Microsoft', exec: exec1 },
    { name: 'Infosys Limited', email: 'supplychain@infosys.com', company: 'Infosys', exec: exec1 },
    { name: 'Tata Consultancy Services', email: 'hardware@tcs.com', company: 'TCS', exec: exec1 },
    { name: 'Wipro Enterprise', email: 'procurement@wipro.com', company: 'Wipro', exec: exec2 },
    { name: 'IBM Global Services', email: 'asset@ibm.com', company: 'IBM', exec: exec2 },
    { name: 'Dell Technologies', email: 'enterprise@dell.com', company: 'Dell', exec: exec2 },
    { name: 'Cisco Systems', email: 'network@cisco.com', company: 'Cisco', exec: exec2 },
  ];

  console.log('🏢 Creating Customers (Enterprise Companies)...');
  const createdCustomers = [];
  for (const cust of customerCompanies) {
    const customerUser = await prisma.user.create({
      data: {
        name: cust.name,
        email: cust.email,
        passwordHash: custPasswordHash,
        roleId: 'CUSTOMER',
        reportsToId: cust.exec.id,
        assignedEmployeeId: cust.exec.id,
        branchId: cust.exec.branchId,
        branchName: cust.exec.branchName,
        customerType: 'ENTERPRISE',
        phone: '+91 40 6600 1000',
        status: 'ACTIVE',
      },
    });
    createdCustomers.push(customerUser);
  }

  // 5. Seed initial Purchase Order & Reservation so pages are populated
  const product = await prisma.product.findFirst();
  if (product && createdCustomers.length > 0) {
    const oracleCust = createdCustomers[0];
    const po1 = await prisma.purchaseOrder.create({
      data: {
        poNumber: 'PO-2026-ENT-001',
        customerId: oracleCust.id,
        customerName: oracleCust.name,
        companyName: 'Oracle',
        totalAmount: 150000.00,
        totalItems: 5,
        stockStatus: 'Checking',
        verificationStatus: 'Pending',
        branchCode: 'HYD-HQ',
        itemsJson: JSON.stringify([{ productId: product.id, sku: product.sku, quantity: 5, price: 30000 }]),
      },
    });

    await prisma.stockReservation.create({
      data: {
        reservationNumber: 'RES-2026-001',
        customerId: oracleCust.id,
        employeeId: exec1.id,
        productId: product.id,
        sku: product.sku,
        branchCode: 'HYD-HQ',
        quantity: 5,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: 'Reservation for Oracle Enterprise Upgrade Project',
      },
    });
  }

  // 6. Generate users_credentials.txt
  const allUsers = await prisma.user.findMany({
    include: { role: true, reportsTo: true, branch: true },
    orderBy: { createdAt: 'asc' },
  });

  let txtContent = '=== CONQUER ERP - HIERARCHICAL USER CREDENTIALS ===\n\n';
  txtContent += 'Standard Password for Internal Hierarchy Staff: Admin@123\n';
  txtContent += 'Standard Password for Customer Accounts: Admin@123\n\n';
  txtContent += '------------------------------------------------------------------------------------------------------------------------\n';
  txtContent += String('ROLE').padEnd(25) + ' | ' + String('NAME').padEnd(25) + ' | ' + String('EMAIL').padEnd(35) + ' | ' + String('REPORTS TO').padEnd(25) + '\n';
  txtContent += '------------------------------------------------------------------------------------------------------------------------\n';

  for (const u of allUsers) {
    txtContent += String(u.role?.name || u.roleId).padEnd(25) + ' | ' + String(u.name).padEnd(25) + ' | ' + String(u.email).padEnd(35) + ' | ' + String(u.reportsTo?.name || 'None').padEnd(25) + '\n';
  }

  const outputPath = path.join(__dirname, '..', 'users_credentials.txt');
  fs.writeFileSync(outputPath, txtContent, 'utf-8');
  console.log(`\n✅ Saved user credentials list to: ${outputPath}`);
  console.log('🎉 Hierarchy cleanup & reseed successfully completed!');
}

main()
  .catch((err) => {
    console.error('❌ Error during hierarchy seeding:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

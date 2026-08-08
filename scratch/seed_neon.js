const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const defaultPasswordHash = bcrypt.hashSync('Admin@123', 10);

async function seedNeon() {
  console.log("🌱 Starting Neon Database Seeding...");

  // 1. REGIONS
  console.log("Seeding Regions...");
  const southRegion = await prisma.region.upsert({
    where: { id: 1 },
    update: { name: 'South Region', code: 'SR' },
    create: { id: 1, name: 'South Region', code: 'SR' }
  });
  const westRegion = await prisma.region.upsert({
    where: { id: 2 },
    update: { name: 'West Region', code: 'WR' },
    create: { id: 2, name: 'West Region', code: 'WR' }
  });

  // 2. BRANCHES
  console.log("Seeding Branches...");
  const hydHq = await prisma.branch.upsert({
    where: { name: 'HYD-HQ' },
    update: { regionId: southRegion.id },
    create: { name: 'HYD-HQ', regionId: southRegion.id }
  });
  const hydThub = await prisma.branch.upsert({
    where: { name: 'HYD-THUB' },
    update: { regionId: southRegion.id },
    create: { name: 'HYD-THUB', regionId: southRegion.id }
  });

  // 3. ROLES
  console.log("Seeding Roles...");
  const rolesMap = {};
  const rolesList = [
    { name: 'SUPER_ADMIN', level: 100 },
    { name: 'DIRECTOR_OPERATIONS', level: 90 },
    { name: 'OPERATIONS_MANAGER', level: 80 },
    { name: 'ASSISTANT_MANAGER', level: 70 },
    { name: 'OPERATIONS_EXECUTIVE', level: 60 },
    { name: 'CUSTOMER', level: 10 }
  ];

  for (const r of rolesList) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { level: r.level, isActive: true },
      create: { name: r.name, level: r.level, isActive: true }
    });
    rolesMap[r.name] = role.id;
  }

  // 4. USERS (STAFF & CUSTOMER ACCOUNTS)
  console.log("Seeding Users...");
  const usersList = [
    { name: 'Eleanor Vance', email: 'superadmin@conquererp.com', role: 'SUPER_ADMIN', branchId: hydHq.id, empId: 'EMP-001' },
    { name: 'Marcus Sterling', email: 'marcus.sterling@conquererp.com', role: 'DIRECTOR_OPERATIONS', branchId: hydHq.id, empId: 'EMP-002' },
    { name: 'Sophia Chen', email: 'sophia.chen@conquererp.com', role: 'OPERATIONS_MANAGER', branchId: hydThub.id, empId: 'EMP-003' },
    { name: 'Vikramaditya Rao', email: 'vikram.rao@conquererp.com', role: 'OPERATIONS_MANAGER', branchId: hydHq.id, empId: 'EMP-004' },
    { name: 'Ananya Sharma', email: 'ananya.sharma@conquererp.com', role: 'ASSISTANT_MANAGER', branchId: hydHq.id, empId: 'EMP-005' },
    { name: 'David Reynolds', email: 'david.reynolds@conquererp.com', role: 'ASSISTANT_MANAGER', branchId: hydThub.id, empId: 'EMP-006' },
    { name: 'Jessica Taylor', email: 'jessica.taylor@conquererp.com', role: 'OPERATIONS_EXECUTIVE', branchId: hydThub.id, empId: 'EMP-007' },
    { name: 'Karan Patel', email: 'karan.patel@conquererp.com', role: 'OPERATIONS_EXECUTIVE', branchId: hydHq.id, empId: 'EMP-008' },
    { name: 'Cisco Systems', email: 'network@cisco.com', role: 'CUSTOMER', branchId: hydThub.id, empId: 'CUST-001' },
    { name: 'Dell Technologies', email: 'enterprise@dell.com', role: 'CUSTOMER', branchId: hydThub.id, empId: 'CUST-002' },
    { name: 'IBM Global Services', email: 'asset@ibm.com', role: 'CUSTOMER', branchId: hydThub.id, empId: 'CUST-003' },
    { name: 'Infosys Limited', email: 'supplychain@infosys.com', role: 'CUSTOMER', branchId: hydHq.id, empId: 'CUST-004' },
    { name: 'Microsoft Corporation', email: 'orders@microsoft.com', role: 'CUSTOMER', branchId: hydHq.id, empId: 'CUST-005' },
    { name: 'Oracle India Ltd', email: 'procurement@oracle.com', role: 'CUSTOMER', branchId: hydHq.id, empId: 'CUST-006' },
    { name: 'Tata Consultancy Services', email: 'hardware@tcs.com', role: 'CUSTOMER', branchId: hydHq.id, empId: 'CUST-007' },
    { name: 'Wipro Enterprise', email: 'procurement@wipro.com', role: 'CUSTOMER', branchId: hydThub.id, empId: 'CUST-008' }
  ];

  const createdUsers = {};
  for (const u of usersList) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        passwordHash: defaultPasswordHash,
        roleId: rolesMap[u.role],
        branchId: u.branchId,
        employeeId: u.empId,
        isActive: true,
        status: 'ACTIVE'
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: defaultPasswordHash,
        roleId: rolesMap[u.role],
        branchId: u.branchId,
        employeeId: u.empId,
        isActive: true,
        status: 'ACTIVE'
      }
    });
    createdUsers[u.email] = user;
  }

  // 5. CUSTOMERS
  console.log("Seeding Customers...");
  const customersList = [
    { name: 'Cisco Systems', email: 'network@cisco.com', code: 'CUST-CISCO', branchId: hydThub.id, regionId: southRegion.id, crmId: 101 },
    { name: 'Dell Technologies', email: 'enterprise@dell.com', code: 'CUST-DELL', branchId: hydThub.id, regionId: southRegion.id, crmId: 102 },
    { name: 'IBM Global Services', email: 'asset@ibm.com', code: 'CUST-IBM', branchId: hydThub.id, regionId: southRegion.id, crmId: 103 },
    { name: 'Infosys Limited', email: 'supplychain@infosys.com', code: 'CUST-INFOSYS', branchId: hydHq.id, regionId: southRegion.id, crmId: 104 },
    { name: 'Microsoft Corporation', email: 'orders@microsoft.com', code: 'CUST-MSFT', branchId: hydHq.id, regionId: southRegion.id, crmId: 105 },
    { name: 'Oracle India Ltd', email: 'procurement@oracle.com', code: 'CUST-ORACLE', branchId: hydHq.id, regionId: southRegion.id, crmId: 106 },
    { name: 'Tata Consultancy Services', email: 'hardware@tcs.com', code: 'CUST-TCS', branchId: hydHq.id, regionId: southRegion.id, crmId: 107 },
    { name: 'Wipro Enterprise', email: 'procurement@wipro.com', code: 'CUST-WIPRO', branchId: hydThub.id, regionId: southRegion.id, crmId: 108 }
  ];

  const createdCustomers = {};
  for (const c of customersList) {
    const customer = await prisma.customer.upsert({
      where: { crmCustomerId: c.crmId },
      update: {
        name: c.name,
        customerCode: c.code,
        email: c.email,
        branchId: c.branchId,
        regionId: c.regionId,
        assignedManagerId: createdUsers['sophia.chen@conquererp.com'].id,
        assignedExecutiveId: createdUsers['jessica.taylor@conquererp.com'].id,
        creditLimit: 5000000.00,
        creditUsed: 1200000.00,
        status: 'ACTIVE'
      },
      create: {
        crmCustomerId: c.crmId,
        name: c.name,
        customerCode: c.code,
        email: c.email,
        branchId: c.branchId,
        regionId: c.regionId,
        assignedManagerId: createdUsers['sophia.chen@conquererp.com'].id,
        assignedExecutiveId: createdUsers['jessica.taylor@conquererp.com'].id,
        creditLimit: 5000000.00,
        creditUsed: 1200000.00,
        status: 'ACTIVE'
      }
    });
    createdCustomers[c.email] = customer;
  }

  // 6. CATEGORIES & PRODUCTS
  console.log("Seeding Categories & Products...");
  const catHardware = await prisma.category.upsert({
    where: { name: 'Hardware & Laptops' },
    update: { status: 'ACTIVE' },
    create: { name: 'Hardware & Laptops', status: 'ACTIVE' }
  });

  const catNetworking = await prisma.category.upsert({
    where: { name: 'Networking & Switches' },
    update: { status: 'ACTIVE' },
    create: { name: 'Networking & Switches', status: 'ACTIVE' }
  });

  const productsList = [
    { sku: 'PROD-DELL-XPS15', name: 'Dell XPS 15 Workstation Laptop', categoryId: catHardware.id, brand: 'Dell', costPrice: 120000, price: 145000 },
    { sku: 'PROD-LEN-T14', name: 'Lenovo ThinkPad T14 Gen 4', categoryId: catHardware.id, brand: 'Lenovo', costPrice: 85000, price: 105000 },
    { sku: 'PROD-CISCO-C9300', name: 'Cisco Catalyst 9300 48-Port Switch', categoryId: catNetworking.id, brand: 'Cisco', costPrice: 210000, price: 260000 }
  ];

  const createdProducts = {};
  for (const p of productsList) {
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        categoryId: p.categoryId,
        brand: p.brand,
        costPrice: p.costPrice,
        sellingPrice: p.price,
        status: 'ACTIVE'
      },
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId,
        brand: p.brand,
        costPrice: p.costPrice,
        sellingPrice: p.price,
        status: 'ACTIVE'
      }
    });
    createdProducts[p.sku] = prod;

    // Seed inventory for this product at HYD-HQ and HYD-THUB
    await prisma.inventory.create({
      data: {
        productId: prod.id,
        branchId: hydHq.id,
        availableStock: 50,
        reservedStock: 10,
        sku: prod.sku,
        itemName: prod.name,
        branchCode: 'HYD-HQ'
      }
    });
  }

  // 7. VENDORS
  console.log("Seeding Vendors...");
  const vendorDell = await prisma.vendor.create({
    data: {
      name: 'Dell Technologies India Pvt Ltd',
      contactPerson: 'Rahul Verma',
      email: 'vendor.dell@dell.com',
      phone: '+91 9876543210',
      address: 'Bengaluru, Karnataka',
      status: 'ACTIVE'
    }
  });

  // 8. PURCHASE ORDERS & ITEMS
  console.log("Seeding Purchase Orders...");
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-001',
      customerId: createdCustomers['enterprise@dell.com'].id,
      customerName: 'Dell Technologies',
      companyName: 'Dell Technologies',
      vendorId: vendorDell.id,
      totalAmount: 1450000.00,
      totalItems: 10,
      poStatus: 'APPROVED',
      verificationStatus: 'Verified',
      branchCode: 'HYD-HQ',
      poItems: {
        create: [
          {
            productId: createdProducts['PROD-DELL-XPS15'].id,
            productName: 'Dell XPS 15 Workstation Laptop',
            sku: 'PROD-DELL-XPS15',
            quantity: 10,
            unitPrice: 145000.00,
            total: 1450000.00
          }
        ]
      }
    }
  });

  // 9. STOCK RESERVATIONS
  console.log("Seeding Stock Reservations...");
  await prisma.stockReservation.create({
    data: {
      reservationNumber: 'RES-2026-101',
      customerId: createdCustomers['asset@ibm.com'].id,
      employeeId: createdUsers['ananya.sharma@conquererp.com'].id,
      productId: createdProducts['PROD-CISCO-C9300'].id,
      sku: 'PROD-CISCO-C9300',
      quantity: 2,
      status: 'ACCEPTED',
      branchCode: 'HYD-THUB',
      project: 'IBM Network Expansion'
    }
  });

  console.log("✅ Neon Database Seeding Completed Successfully!");
}

seedNeon()
  .catch(err => {
    console.error("❌ Error seeding Neon database:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

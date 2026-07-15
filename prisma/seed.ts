import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateLargeDatabase } from "../src/lib/largeCatalog";

const prisma = new PrismaClient();
const hashPassword = (plain: string) => bcrypt.hashSync(plain, 10);

async function main() {
  console.log("Seeding database with 1,000+ realistic products...");

  // 1. Truncate existing data to prevent SKU duplicates and primary key conflicts
  console.log("Cleaning database tables...");
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "ProductPriceHistory" CASCADE;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "ProductPrice" CASCADE;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Inventory" CASCADE;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "InventoryMovement" CASCADE;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "StockAlert" CASCADE;');

  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Product" CASCADE;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Category" CASCADE;');

  // 2. Roles
  const roles = [
    { id: "SUPER_ADMIN", name: "SUPER_ADMIN" },
    { id: "ADMIN", name: "ADMIN" },
    { id: "EMPLOYEE", name: "EMPLOYEE" },
    { id: "CUSTOMER", name: "CUSTOMER" }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { name: role.name },
      create: { id: role.id, name: role.name }
    });
  }
  console.log("Seeded Roles.");

  // 3. Branches
  const branches = [
    { id: "HYD-HQ", name: "Hyderabad Corporate Office" },
    { id: "HYD-THUB", name: "Hyderabad T-Hub Experience Center" },
    { id: "HYD-JH", name: "Hyderabad Jubilee Hills" },
    { id: "BLR", name: "Bengaluru HSR Layout" },
    { id: "CHN", name: "Chennai Anna Nagar" },
    { id: "MUM", name: "Mumbai Worli" },
    { id: "DEL", name: "Gurgaon Delhi NCR" },
    { id: "VZG", name: "Visakhapatnam" },
    { id: "VJA", name: "Vijayawada" }
  ];

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      update: { name: branch.name },
      create: { id: branch.id, name: branch.name }
    });
  }
  console.log("Seeded Branches.");

  // 4. Users
  const users = [
    { id: "u-superadmin", name: "Corporate Super Admin", email: "superadmin@conquererp.com", passwordHash: hashPassword("Admin@2026#Secure"), roleId: "SUPER_ADMIN", branchId: null, isActive: true, status: "ACTIVE", branchName: "Head Office" },
    { id: "u-admin", name: "System Admin", email: "admin@conquererp.com", passwordHash: hashPassword("Admin@2026"), roleId: "ADMIN", branchId: null, isActive: true, status: "ACTIVE", branchName: "Head Office" },
    { id: "u-saleshead", name: "Global Sales Head", email: "saleshead@conquererp.com", passwordHash: hashPassword("SalesHead@2026"), roleId: "EMPLOYEE", branchId: null, isActive: true, status: "ACTIVE", branchName: "Head Office" },
    { id: "u-rsm-south", name: "Regional Manager South", email: "rsm.south@conquererp.com", passwordHash: hashPassword("RSM@South2026"), roleId: "EMPLOYEE", branchId: null, isActive: true, status: "ACTIVE", branchName: "Head Office" },
    { id: "u-bm-hyd", name: "Hyderabad Branch Manager", email: "bm.hyd@conquererp.com", passwordHash: hashPassword("BM@Hyd2026"), roleId: "EMPLOYEE", branchId: "HYD-HQ", isActive: true, status: "ACTIVE", branchName: "Hyderabad Corporate Office" },
    { id: "u-salesmgr", name: "Sales Manager HYD", email: "manager.hyd@conquererp.com", passwordHash: hashPassword("Manager@Hyd2026"), roleId: "EMPLOYEE", branchId: "HYD-HQ", isActive: true, status: "ACTIVE", branchName: "Hyderabad Corporate Office" },
    { id: "u-exec-hyd", name: "Sales Executive HYD", email: "exec.hyd@conquererp.com", passwordHash: hashPassword("Exec@Hyd#2026"), roleId: "EMPLOYEE", branchId: "HYD-HQ", isActive: true, status: "ACTIVE", branchName: "Hyderabad Corporate Office" },
    { id: "u-employee-generic", name: "Company Employee", email: "employee@conquererp.com", passwordHash: hashPassword("Employee@2026"), roleId: "EMPLOYEE", branchId: "HYD-HQ", isActive: true, status: "ACTIVE", branchName: "Hyderabad Corporate Office" },
    { id: "u-customer", name: "Premium Customer", email: "customer@gmail.com", passwordHash: hashPassword("Customer#2026"), roleId: "CUSTOMER", branchId: null, isActive: true, status: "ACTIVE", branchName: "None" }
  ];

  const customerNames = [
    "Aarav Sharma", "Priya Reddy", "Rahul Verma", "Sneha Nair", "Ananya Gupta",
    "Kiran Kumar", "Rohit Mehta", "Arjun Rao", "Neha Kapoor", "Vikram Singh",
    "Amit Patel", "Pooja Sharma", "Divya Teja", "Sanjay Dutt", "Meera Bai",
    "Rajesh Khanna", "Anil Kapoor", "Deepika Padukone", "Ranveer Singh", "Virat Kohli",
    "MS Dhoni", "Sachin Tendulkar", "Rohit Sharma", "Jasprit Bumrah", "Hardik Pandya"
  ];

  const employeeIds = ["u-salesmgr", "u-exec-hyd", "u-employee-generic"];
  const seededCustomers = customerNames.map((name, idx) => {
    const slug = name.toLowerCase().replace(/\s+/g, ".");
    const date = new Date();
    date.setDate(date.getDate() - (idx * 3 + 2));
    const assignedEmployeeId = employeeIds[idx % employeeIds.length];
    return {
      id: `u-cust-${idx + 1}`,
      name,
      email: `${slug}@gmail.com`,
      passwordHash: hashPassword("Customer#2026"),
      roleId: "CUSTOMER",
      branchId: null,
      isActive: true,
      status: "ACTIVE",
      branchName: "None",
      phone: `+91 ${98480 + idx}${10000 + idx * 123}`,
      address: `Plot ${idx * 4 + 10}, Road No ${idx % 7 + 1}, Jubilee Hills, Hyderabad`,
      createdAt: date,
      assignedEmployeeId
    };
  });

  const allUsersToSeed = [...users, ...seededCustomers];

  for (const user of allUsersToSeed) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: user.passwordHash,
        roleId: user.roleId,
        branchId: user.branchId,
        isActive: user.isActive,
        status: user.status,
        branchName: user.branchName,
        phone: (user as any).phone || null,
        address: (user as any).address || null,
        createdAt: (user as any).createdAt || new Date(),
        assignedEmployeeId: (user as any).assignedEmployeeId || null
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        roleId: user.roleId,
        branchId: user.branchId,
        isActive: user.isActive,
        status: user.status,
        branchName: user.branchName,
        phone: (user as any).phone || null,
        address: (user as any).address || null,
        createdAt: (user as any).createdAt || new Date(),
        assignedEmployeeId: (user as any).assignedEmployeeId || null
      }
    });
  }
  console.log("Seeded Users with 25 Customers.");

  // 5. Generate and seed from largeCatalog data
  const { categories: largeCategories, products: largeProducts, productPrices: largeProductPrices, productPriceHistory: largeProductPriceHistory, inventory: largeInventory } = generateLargeDatabase();

  // Seed Categories
  await prisma.category.createMany({
    data: largeCategories
  });
  console.log(`Seeded ${largeCategories.length} Categories.`);

  // Seed Products
  // Format dates and schema fields correctly
  const productsToSeed = largeProducts.map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    categoryId: p.categoryId,
    barcode: p.barcode,
    serialTracking: p.serialTracking,
    reorderLevel: p.reorderLevel,
    safetyStock: p.safetyStock,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  }));

  await prisma.product.createMany({
    data: productsToSeed
  });
  console.log(`Seeded ${largeProducts.length} Products.`);

  // Seed Product Prices
  await prisma.productPrice.createMany({
    data: largeProductPrices.map(pr => ({
      sku: pr.sku,
      branchCode: pr.branchCode,
      costPrice: pr.costPrice,
      sellingPrice: pr.sellingPrice,
      mrp: pr.mrp,
      margin: pr.margin,
      lastUpdated: pr.lastUpdated
    }))
  });
  console.log(`Seeded ${largeProductPrices.length} Product Branch Pricing.`);

  // Seed Product Price History (in chunks of 10,000 to keep it efficient)
  const chunkSize = 10000;
  const historyData = largeProductPriceHistory.map(h => ({
    sku: h.sku,
    branchCode: h.branchCode,
    costPrice: h.costPrice,
    sellingPrice: h.sellingPrice,
    mrp: h.mrp,
    updatedBy: h.updatedBy,
    updatedAt: h.updatedAt
  }));

  for (let i = 0; i < historyData.length; i += chunkSize) {
    const chunk = historyData.slice(i, i + chunkSize);
    await prisma.productPriceHistory.createMany({
      data: chunk
    });
  }
  console.log(`Seeded ${largeProductPriceHistory.length} Price History Entries.`);

  // Seed Branch Inventory
  const inventoryToSeed = largeInventory.map(inv => ({
    productId: inv.productId,
    branchId: inv.branchCode,
    itemName: inv.itemName,
    sku: inv.sku,
    branchCode: inv.branchCode,
    quantity: inv.quantity,
    availableQty: inv.availableQty,
    reservedQty: inv.reservedQty,
    damagedQty: inv.damagedQty,
    returnedQty: inv.returnedQty,
    transitQty: inv.transitQty,
    incomingQty: inv.incomingQty,
    outgoingQty: inv.outgoingQty,
    deadQty: inv.deadQty,
    minStock: inv.minStock,
    maxStock: inv.maxStock,
    warehouseZone: inv.warehouseZone,
    ageingDays: inv.ageingDays
  }));

  for (let i = 0; i < inventoryToSeed.length; i += chunkSize) {
    const chunk = inventoryToSeed.slice(i, i + chunkSize);
    await prisma.inventory.createMany({
      data: chunk
    });
  }
  console.log(`Seeded ${largeInventory.length} Branch Inventory Records.`);

  // 6. Seeding Movements
  console.log("Seeding Movements...");
  const movements = [
    { sku: largeProducts[0].sku, branchCode: "HYD-HQ", type: "ADDITION", quantity: 20, details: "Initial branch intake from central warehouse." },
    { sku: largeProducts[1].sku, branchCode: "BLR", type: "REDUCTION", quantity: 2, details: "Store checkout: retail order dispatch." },
    { sku: largeProducts[2].sku, branchCode: "MUM", type: "TRANSFER", quantity: 5, details: "Transit: Stock transfer to Southern regional warehouse." }
  ];

  await prisma.inventoryMovement.createMany({
    data: movements.map(m => ({
      sku: m.sku,
      branchCode: m.branchCode,
      type: m.type,
      quantity: m.quantity,
      details: m.details,
      timestamp: new Date()
    }))
  });

  // 7. Seed Stock Alerts
  console.log("Seeding Stock Alerts...");
  const alerts = [
    { type: "LOW_STOCK", message: `Stock level of ${largeProducts[0].name} in HYD-HQ is below reorder level.`, branchCode: "HYD-HQ" },
    { type: "CRITICAL_STOCK", message: `Stock level of ${largeProducts[1].name} in BLR is below safety stock limit.`, branchCode: "BLR" }
  ];

  await prisma.stockAlert.createMany({
    data: alerts.map(a => ({
      type: a.type,
      message: a.message,
      branchCode: a.branchCode,
      resolved: false
    }))
  });

  console.log("Database seeded successfully with 1,000+ realistic products!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

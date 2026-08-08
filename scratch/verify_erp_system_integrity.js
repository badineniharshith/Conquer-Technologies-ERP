const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySystemIntegrity() {
  console.log("=== ERP SYSTEM DATABASE INTEGRITY AUDIT ===\n");

  const errors = [];
  const warnings = [];

  // 1. Users & Roles
  console.log("1. CHECKING USERS & ROLES...");
  const users = await prisma.user.findMany({ include: { role: true } });
  const customers = users.filter(u => u.roleId === 'CUSTOMER');
  const employees = users.filter(u => u.roleId !== 'CUSTOMER');
  console.log(`   Total Users: ${users.length} | Employees: ${employees.length} | Customers: ${customers.length}`);
  users.forEach(u => {
    if (!u.role) errors.push(`User ${u.email} has no role record!`);
    if (!u.isActive && u.status === 'ACTIVE') warnings.push(`User ${u.email}: isActive=false but status=ACTIVE`);
  });

  // 2. Products & Categories
  console.log("\n2. CHECKING PRODUCTS & CATEGORIES...");
  const products = await prisma.product.findMany({ include: { category: true } });
  const categories = await prisma.category.findMany();
  console.log(`   Products: ${products.length} | Categories: ${categories.length}`);
  products.forEach(p => {
    if (!p.category) warnings.push(`Product ${p.sku} (${p.name}) has no category!`);
  });

  // 3. Inventory
  console.log("\n3. CHECKING INVENTORY...");
  const inventory = await prisma.inventory.findMany();
  console.log(`   Inventory records: ${inventory.length}`);
  const inventorySkus = new Set(inventory.map(i => i.sku));
  const productSkus = new Set(products.map(p => p.sku));
  inventory.forEach(inv => {
    if (!productSkus.has(inv.sku)) errors.push(`Inventory SKU ${inv.sku} has no matching product!`);
    if (inv.quantity === null || inv.quantity === undefined) errors.push(`Inventory ${inv.id} has null quantity!`);
    if (inv.availableQty === null || inv.availableQty === undefined) warnings.push(`Inventory ${inv.id} has null availableQty`);
  });

  // 4. Stock Reservations
  console.log("\n4. CHECKING STOCK RESERVATIONS...");
  const reservations = await prisma.stockReservation.findMany({ include: { customer: true, items: true } });
  console.log(`   Reservations: ${reservations.length}`);
  reservations.forEach(r => {
    if (!r.customer) errors.push(`Reservation ${r.id} has no customer!`);
    if (!r.items || r.items.length === 0) warnings.push(`Reservation ${r.id} has no items!`);
  });

  // 5. Purchase Orders
  console.log("\n5. CHECKING PURCHASE ORDERS...");
  const pos = await prisma.purchaseOrder.findMany({ include: { customer: true } });
  console.log(`   Purchase Orders: ${pos.length}`);
  pos.forEach(po => {
    if (!po.customer) warnings.push(`PO ${po.poNumber} has no customer!`);
  });

  // 6. Inventory Movements
  console.log("\n6. CHECKING INVENTORY MOVEMENTS...");
  const movements = await prisma.inventoryMovement.findMany();
  console.log(`   Inventory Movements: ${movements.length}`);
  const orphanedMovements = movements.filter(m => !productSkus.has(m.sku));
  if (orphanedMovements.length > 0) warnings.push(`${orphanedMovements.length} movements have orphaned SKUs`);

  // 7. User Reporting Hierarchy Cycle Detection
  console.log("\n7. CHECKING REPORTING HIERARCHY FOR CYCLES...");
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true, reportsToId: true } });
  let cycleFound = false;
  allUsers.forEach(user => {
    const visited = new Set();
    let current = user;
    while (current && current.reportsToId) {
      if (visited.has(current.id)) {
        errors.push(`Circular reporting cycle detected for user: ${user.name} (${user.id})`);
        cycleFound = true;
        break;
      }
      visited.add(current.id);
      current = allUsers.find(u => u.id === current.reportsToId) || null;
    }
  });
  if (!cycleFound) console.log("   ✅ No circular reporting cycles detected.");

  // 8. Branch Assignments
  console.log("\n8. CHECKING BRANCH ASSIGNMENTS...");
  const branches = await prisma.branch.findMany();
  console.log(`   Branches: ${branches.length}`);
  const branchIds = new Set(branches.map(b => b.id));
  const usersWithBadBranch = users.filter(u => u.branchId && !branchIds.has(u.branchId));
  if (usersWithBadBranch.length > 0) {
    errors.push(`${usersWithBadBranch.length} users have invalid branchId references!`);
  } else {
    console.log("   ✅ All user branch references are valid.");
  }

  // Summary
  console.log("\n\n=== AUDIT SUMMARY ===");
  if (errors.length > 0) {
    console.log(`❌ ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`   - ${e}`));
  } else {
    console.log("✅ No critical errors found!");
  }
  if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`   - ${w}`));
  } else {
    console.log("✅ No warnings!");
  }
}

verifySystemIntegrity().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runPostgresOptimization() {
  console.log('⚡ Starting PostgreSQL Database Optimization & Indexing...\n');

  const indexStatements = [
    // User indexes
    'CREATE INDEX IF NOT EXISTS "User_email_idx" ON public."User"("email");',
    'CREATE INDEX IF NOT EXISTS "User_roleId_idx" ON public."User"("roleId");',
    'CREATE INDEX IF NOT EXISTS "User_status_idx" ON public."User"("status");',
    'CREATE INDEX IF NOT EXISTS "User_reportsToId_idx" ON public."User"("reportsToId");',
    'CREATE INDEX IF NOT EXISTS "User_branchId_idx" ON public."User"("branchId");',
    'CREATE INDEX IF NOT EXISTS "User_assignedEmployeeId_idx" ON public."User"("assignedEmployeeId");',

    // Reservation indexes
    'CREATE INDEX IF NOT EXISTS "StockReservation_customerId_idx" ON public."StockReservation"("customerId");',
    'CREATE INDEX IF NOT EXISTS "StockReservation_employeeId_idx" ON public."StockReservation"("employeeId");',
    'CREATE INDEX IF NOT EXISTS "StockReservation_productId_idx" ON public."StockReservation"("productId");',
    'CREATE INDEX IF NOT EXISTS "StockReservation_status_idx" ON public."StockReservation"("status");',
    'CREATE INDEX IF NOT EXISTS "StockReservation_expiresAt_idx" ON public."StockReservation"("expiresAt");',
    'CREATE INDEX IF NOT EXISTS "StockReservation_createdAt_idx" ON public."StockReservation"("createdAt");',

    // PurchaseOrder indexes
    'CREATE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_idx" ON public."PurchaseOrder"("poNumber");',
    'CREATE INDEX IF NOT EXISTS "PurchaseOrder_customerId_idx" ON public."PurchaseOrder"("customerId");',
    'CREATE INDEX IF NOT EXISTS "PurchaseOrder_verificationStatus_idx" ON public."PurchaseOrder"("verificationStatus");',
    'CREATE INDEX IF NOT EXISTS "PurchaseOrder_branchCode_idx" ON public."PurchaseOrder"("branchCode");',
    'CREATE INDEX IF NOT EXISTS "PurchaseOrder_dateReceived_idx" ON public."PurchaseOrder"("dateReceived");',

    // Opportunity indexes
    'CREATE INDEX IF NOT EXISTS "Opportunity_opportunityNumber_idx" ON public."Opportunity"("opportunityNumber");',
    'CREATE INDEX IF NOT EXISTS "Opportunity_customerId_idx" ON public."Opportunity"("customerId");',
    'CREATE INDEX IF NOT EXISTS "Opportunity_status_idx" ON public."Opportunity"("status");',
    'CREATE INDEX IF NOT EXISTS "Opportunity_purchaseOrderId_idx" ON public."Opportunity"("purchaseOrderId");',

    // Product & Inventory indexes
    'CREATE INDEX IF NOT EXISTS "Product_sku_idx" ON public."Product"("sku");',
    'CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON public."Product"("categoryId");',
    'CREATE INDEX IF NOT EXISTS "Inventory_sku_idx" ON public."Inventory"("sku");',
    'CREATE INDEX IF NOT EXISTS "Inventory_branchCode_idx" ON public."Inventory"("branchCode");',
    'CREATE INDEX IF NOT EXISTS "Inventory_productId_idx" ON public."Inventory"("productId");',

    // Notification indexes
    'CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON public."Notification"("userId");',
    'CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON public."Notification"("read");'
  ];

  let successCount = 0;
  for (const sql of indexStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      const idxName = sql.split('"')[1];
      console.log(`✅ Index verified/created: ${idxName}`);
      successCount++;
    } catch (err) {
      console.error(`⚠️ Index warning:`, err.message.substring(0, 100));
    }
  }

  console.log(`\n🎉 Optimization completed! Created/Verified ${successCount} PostgreSQL indexes.`);
}

runPostgresOptimization()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

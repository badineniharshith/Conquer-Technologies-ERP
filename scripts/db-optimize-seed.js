const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('🔄 Optimizing Database: Creating indexes...');
    
    // Add indexes for key fields
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_idx" ON public."PurchaseOrder"("poNumber")',
      'CREATE INDEX IF NOT EXISTS "PurchaseOrder_customerId_idx" ON public."PurchaseOrder"("customerId")',
      'CREATE INDEX IF NOT EXISTS "PurchaseOrder_dateReceived_idx" ON public."PurchaseOrder"("dateReceived")',
      'CREATE INDEX IF NOT EXISTS "PurchaseOrder_verificationStatus_idx" ON public."PurchaseOrder"("verificationStatus")',
      'CREATE INDEX IF NOT EXISTS "User_email_idx" ON public."User"("email")',
      'CREATE INDEX IF NOT EXISTS "User_roleId_idx" ON public."User"("roleId")',
      'CREATE INDEX IF NOT EXISTS "User_status_idx" ON public."User"("status")',
      'CREATE INDEX IF NOT EXISTS "Product_sku_idx" ON public."Product"("sku")',
      'CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON public."Product"("categoryId")',
      'CREATE INDEX IF NOT EXISTS "Product_status_idx" ON public."Product"("status")',
      'CREATE INDEX IF NOT EXISTS "Inventory_sku_idx" ON public."Inventory"("sku")',
      'CREATE INDEX IF NOT EXISTS "Inventory_branchCode_idx" ON public."Inventory"("branchCode")',
      'CREATE INDEX IF NOT EXISTS "Inventory_productId_idx" ON public."Inventory"("productId")',
      'CREATE INDEX IF NOT EXISTS "Opportunity_opportunityNumber_idx" ON public."Opportunity"("opportunityNumber")',
      'CREATE INDEX IF NOT EXISTS "Opportunity_customerId_idx" ON public."Opportunity"("customerId")',
      'CREATE INDEX IF NOT EXISTS "Opportunity_status_idx" ON public."Opportunity"("status")',
      'CREATE INDEX IF NOT EXISTS "Opportunity_createdAt_idx" ON public."Opportunity"("createdAt")'
    ];

    for (const idx of indexes) {
      try {
        await prisma.$executeRawUnsafe(idx);
        console.log(`✅ Index verified: ${idx.split('"')[1]}`);
      } catch (err) {
        console.log(`⚠️ Index warning: ${err.message}`);
      }
    }

    console.log('\n➕ Seeding additional Purchase Orders...');

    // Find a customer to assign the POs to
    const customer = await prisma.user.findFirst({
      where: { roleId: 'CUSTOMER' }
    });

    if (!customer) {
      console.log('⚠️ No customer found in DB. Skipping PO seeding.');
      return;
    }

    console.log(`👤 Found customer for POs: ${customer.name} (${customer.id})`);

    const additionalPOs = [
      {
        id: `po-seed-${Date.now()}-1`,
        poNumber: `PO-2026-OPT-001`,
        customerId: customer.id,
        customerName: customer.name,
        companyName: 'Conquer Tech Corp',
        dateReceived: new Date('2026-07-10T10:00:00Z'),
        expectedDelivery: new Date('2026-07-24T10:00:00Z'),
        totalItems: 4,
        stockStatus: 'Checking',
        verificationStatus: 'Pending',
        branchCode: 'HYD-HQ',
        itemsJson: JSON.stringify([{ sku: 'LAP-APP-759736', quantity: 2 }, { sku: 'PHN-GGL-844973', quantity: 2 }])
      },
      {
        id: `po-seed-${Date.now()}-2`,
        poNumber: `PO-2026-OPT-002`,
        customerId: customer.id,
        customerName: customer.name,
        companyName: 'Cyber Security Labs',
        dateReceived: new Date('2026-07-12T14:30:00Z'),
        expectedDelivery: new Date('2026-07-26T14:30:00Z'),
        totalItems: 1,
        stockStatus: 'Checking',
        verificationStatus: 'Pending',
        branchCode: 'BLR',
        itemsJson: JSON.stringify([{ sku: 'LAP-HP-172551', quantity: 1 }])
      },
      {
        id: `po-seed-${Date.now()}-3`,
        poNumber: `PO-2026-OPT-003`,
        customerId: customer.id,
        customerName: customer.name,
        companyName: 'Cloud Solutions Inc',
        dateReceived: new Date('2026-07-14T09:15:00Z'),
        expectedDelivery: new Date('2026-07-28T09:15:00Z'),
        totalItems: 10,
        stockStatus: 'Checking',
        verificationStatus: 'Pending',
        branchCode: 'CHN',
        itemsJson: JSON.stringify([{ sku: 'PHN-GGL-844973', quantity: 10 }])
      }
    ];

    for (const po of additionalPOs) {
      try {
        await prisma.purchaseOrder.upsert({
          where: { poNumber: po.poNumber },
          update: {},
          create: po
        });
        console.log(`✅ Seeded Purchase Order: ${po.poNumber}`);
      } catch (err) {
        console.error(`❌ Failed to seed PO ${po.poNumber}:`, err.message);
      }
    }

    console.log('\n🎉 DB Optimization & Seed script completed successfully!');
  } catch (err) {
    console.error('❌ Script failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();

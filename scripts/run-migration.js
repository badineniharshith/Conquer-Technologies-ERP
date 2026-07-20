// Direct ERP migration via individual Prisma queries
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔄 Running ERP Inventory System migration...\n');

    // Step 1: Add companyName to PurchaseOrder
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."PurchaseOrder" ADD COLUMN IF NOT EXISTS "companyName" text NOT NULL DEFAULT ''`);
      console.log('✅ Added companyName to PurchaseOrder');
    } catch (e) { console.log('ℹ️  companyName:', e.message.substring(0, 80)); }

    // Step 2: Add expectedDelivery to PurchaseOrder
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."PurchaseOrder" ADD COLUMN IF NOT EXISTS "expectedDelivery" timestamp(3) without time zone`);
      console.log('✅ Added expectedDelivery to PurchaseOrder');
    } catch (e) { console.log('ℹ️  expectedDelivery:', e.message.substring(0, 80)); }

    // Step 3: Add verifiedBy to PurchaseOrder
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."PurchaseOrder" ADD COLUMN IF NOT EXISTS "verifiedBy" text`);
      console.log('✅ Added verifiedBy to PurchaseOrder');
    } catch (e) { console.log('ℹ️  verifiedBy:', e.message.substring(0, 80)); }

    // Step 4: Add verifiedDate to PurchaseOrder
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."PurchaseOrder" ADD COLUMN IF NOT EXISTS "verifiedDate" timestamp(3) without time zone`);
      console.log('✅ Added verifiedDate to PurchaseOrder');
    } catch (e) { console.log('ℹ️  verifiedDate:', e.message.substring(0, 80)); }

    // Step 5: Update existing verification status values
    try {
      const updated = await prisma.$executeRawUnsafe(`UPDATE public."PurchaseOrder" SET "verificationStatus" = 'Verified' WHERE "verificationStatus" = 'PO Verified & Stock Available'`);
      console.log('✅ Updated verificationStatus values:', updated, 'rows');
    } catch (e) { console.log('ℹ️  Status update:', e.message.substring(0, 80)); }

    // Step 6: Create Opportunity table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public."Opportunity" (
          id text NOT NULL,
          "opportunityNumber" text NOT NULL,
          "customerId" text NOT NULL,
          "customerName" text NOT NULL,
          "companyName" text NOT NULL DEFAULT '',
          "purchaseOrderId" text NOT NULL,
          "productDetails" text NOT NULL DEFAULT '[]',
          "totalQuantity" integer NOT NULL DEFAULT 0,
          "reservationDate" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expiryDate" timestamp(3) without time zone NOT NULL,
          status text NOT NULL DEFAULT 'OPEN',
          notes text,
          "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Opportunity_pkey" PRIMARY KEY (id)
        )
      `);
      console.log('✅ Created Opportunity table');
    } catch (e) { console.log('ℹ️  Opportunity table:', e.message.substring(0, 80)); }

    // Step 7: Add unique constraint on opportunityNumber
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."Opportunity" ADD CONSTRAINT "Opportunity_opportunityNumber_key" UNIQUE ("opportunityNumber")`);
      console.log('✅ Added opportunityNumber unique constraint');
    } catch (e) { console.log('ℹ️  opportunityNumber constraint:', e.message.substring(0, 80)); }

    // Step 8: Add unique constraint on purchaseOrderId
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."Opportunity" ADD CONSTRAINT "Opportunity_purchaseOrderId_key" UNIQUE ("purchaseOrderId")`);
      console.log('✅ Added purchaseOrderId unique constraint');
    } catch (e) { console.log('ℹ️  purchaseOrderId constraint:', e.message.substring(0, 80)); }

    // Step 9: Add FK to PurchaseOrder
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."Opportunity" ADD CONSTRAINT "Opportunity_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public."PurchaseOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE`);
      console.log('✅ Added FK to PurchaseOrder');
    } catch (e) { console.log('ℹ️  PO FK:', e.message.substring(0, 80)); }

    // Step 10: Add FK to User
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."Opportunity" ADD CONSTRAINT "Opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE`);
      console.log('✅ Added FK to User');
    } catch (e) { console.log('ℹ️  User FK:', e.message.substring(0, 80)); }

    // Step 11: Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS "Opportunity_customerId_idx" ON public."Opportunity"("customerId")`,
      `CREATE INDEX IF NOT EXISTS "Opportunity_status_idx" ON public."Opportunity"(status)`,
      `CREATE INDEX IF NOT EXISTS "Opportunity_purchaseOrderId_idx" ON public."Opportunity"("purchaseOrderId")`,
      `CREATE INDEX IF NOT EXISTS "Opportunity_createdAt_idx" ON public."Opportunity"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "PurchaseOrder_verificationStatus_idx" ON public."PurchaseOrder"("verificationStatus")`
    ];
    for (const idx of indexes) {
      try {
        await prisma.$executeRawUnsafe(idx);
      } catch (e) { /* Already exists */ }
    }
    console.log('✅ Created indexes');

    // Step 12: Add CRM role
    try {
      await prisma.$executeRawUnsafe(`INSERT INTO public."Role" (id, name) VALUES ('CRM', 'CRM') ON CONFLICT (name) DO NOTHING`);
      console.log('✅ Added CRM role');
    } catch (e) { console.log('ℹ️  CRM role:', e.message.substring(0, 80)); }

    // Verify results
    console.log('\n📋 Verifying migration results...');
    const cols = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'PurchaseOrder'
      AND column_name IN ('companyName', 'expectedDelivery', 'verifiedBy', 'verifiedDate')
      ORDER BY column_name
    `;
    console.log('PurchaseOrder new columns:', cols.map(c => c.column_name).join(', '));

    const oppCols = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Opportunity'
      ORDER BY column_name
    `;
    console.log('Opportunity table columns:', oppCols.map(c => c.column_name).join(', '));

    const roles = await prisma.$queryRaw`SELECT id, name FROM public."Role" ORDER BY name`;
    console.log('Roles:', roles.map(r => r.name).join(', '));

    console.log('\n🎉 ERP Migration completed successfully!');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

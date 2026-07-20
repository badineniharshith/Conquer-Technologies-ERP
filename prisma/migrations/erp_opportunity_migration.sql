-- ERP Inventory System Migration
-- Safely adds new fields to PurchaseOrder and creates Opportunity table
-- Does NOT drop any existing tables

-- Step 1: Add new columns to PurchaseOrder table (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'PurchaseOrder'
    AND column_name = 'companyName'
  ) THEN
    ALTER TABLE public."PurchaseOrder" ADD COLUMN "companyName" text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'PurchaseOrder'
    AND column_name = 'expectedDelivery'
  ) THEN
    ALTER TABLE public."PurchaseOrder" ADD COLUMN "expectedDelivery" timestamp(3) without time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'PurchaseOrder'
    AND column_name = 'verifiedBy'
  ) THEN
    ALTER TABLE public."PurchaseOrder" ADD COLUMN "verifiedBy" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'PurchaseOrder'
    AND column_name = 'verifiedDate'
  ) THEN
    ALTER TABLE public."PurchaseOrder" ADD COLUMN "verifiedDate" timestamp(3) without time zone;
  END IF;
END $$;

-- Step 2: Update existing PO verificationStatus values to new simplified values
UPDATE public."PurchaseOrder"
SET "verificationStatus" = 'Verified'
WHERE "verificationStatus" = 'PO Verified & Stock Available'
   OR "verificationStatus" ILIKE '%verified%';

-- Step 3: Create Opportunity table (if it doesn't exist in PascalCase for ERP)
-- Note: there may be a lowercase 'opportunities' table from CRM - this creates ERP "Opportunity" table
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
);

-- Step 4: Add unique constraints (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Opportunity_opportunityNumber_key'
  ) THEN
    ALTER TABLE public."Opportunity" ADD CONSTRAINT "Opportunity_opportunityNumber_key" UNIQUE ("opportunityNumber");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Opportunity_purchaseOrderId_key'
  ) THEN
    ALTER TABLE public."Opportunity" ADD CONSTRAINT "Opportunity_purchaseOrderId_key" UNIQUE ("purchaseOrderId");
  END IF;
END $$;

-- Step 5: Add Foreign Keys (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Opportunity_purchaseOrderId_fkey'
  ) THEN
    ALTER TABLE public."Opportunity"
    ADD CONSTRAINT "Opportunity_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES public."PurchaseOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Opportunity_customerId_fkey'
  ) THEN
    ALTER TABLE public."Opportunity"
    ADD CONSTRAINT "Opportunity_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS "Opportunity_customerId_idx" ON public."Opportunity"("customerId");
CREATE INDEX IF NOT EXISTS "Opportunity_status_idx" ON public."Opportunity"(status);
CREATE INDEX IF NOT EXISTS "Opportunity_purchaseOrderId_idx" ON public."Opportunity"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "Opportunity_createdAt_idx" ON public."Opportunity"("createdAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_verificationStatus_idx" ON public."PurchaseOrder"("verificationStatus");

-- Step 7: Add CRM role if it doesn't exist
INSERT INTO public."Role" (id, name)
VALUES ('CRM', 'CRM')
ON CONFLICT (name) DO NOTHING;

RAISE NOTICE 'ERP Migration completed successfully';

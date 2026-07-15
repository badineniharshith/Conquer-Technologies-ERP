-- =========================================================================
-- UNIVERSAL DATABASE SCHEMA — CONQUER TECHNOLOGIES
-- Unified CRM + ERP Single Database
-- 
-- Architecture:
--   ┌─────────────────────────────────────────────────────────────┐
--   │  ERP MODULE  │  UUID text PKs  │  PascalCase tables        │
--   │              │  (Prisma ORM)   │  Inventory, Products, AI  │
--   ├─────────────────────────────────────────────────────────────┤
--   │  CRM MODULE  │  SERIAL int PKs │  snake_case tables        │
--   │              │  (Native PG)    │  Leads, Opportunities, SVC│
--   └─────────────────────────────────────────────────────────────┘
--
-- The two modules co-exist in the same PostgreSQL database.
-- ERP users (UUID) and CRM users (integer) are separate identity systems
-- serving separate portals but sharing the same physical database instance.
--
-- Generated: 2026-07-14
-- =========================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';
SET default_table_access_method = heap;


-- =========================================================================
-- SECTION 1: ENUMS
-- Standardized enumerated types shared across both modules
-- =========================================================================

-- ERP order tracking enums
DO $$ BEGIN
    CREATE TYPE public.order_stock_status AS ENUM (
        'Checking', 'In Stock', 'Out of Stock', 'Partial Shortage'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.order_verification_status AS ENUM (
        'Pending', 'Billing', 'Delivered', 'Cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================================================================
-- SECTION 2: PRISMA MIGRATION TRACKING
-- Required for Prisma ORM to manage schema migrations
-- =========================================================================

CREATE TABLE IF NOT EXISTS public._prisma_migrations (
    id                      character varying(36) NOT NULL PRIMARY KEY,
    checksum                character varying(64) NOT NULL,
    finished_at             timestamp with time zone,
    migration_name          character varying(255) NOT NULL,
    logs                    text,
    rolled_back_at          timestamp with time zone,
    started_at              timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count     integer DEFAULT 0 NOT NULL
);


-- =========================================================================
-- SECTION 3: CRM MODULE — FOUNDATION TABLES
-- Integer primary keys, snake_case naming, native PostgreSQL sequences
-- Source: CRM database (chandranshubojja schema)
-- =========================================================================

-- Regions (geographic hierarchy root)
CREATE TABLE IF NOT EXISTS public.regions (
    id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name    text NOT NULL
);

-- Branches (organizational units within regions)
CREATE TABLE IF NOT EXISTS public.branches (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        text NOT NULL,
    region_id   integer REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Roles with permission matrix (CRM role system)
CREATE TABLE IF NOT EXISTS public.roles (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        text NOT NULL UNIQUE,
    permissions jsonb NOT NULL DEFAULT '{}',
    "isActive"  boolean DEFAULT true NOT NULL,
    level       integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Permissions (module-level ACL entries)
CREATE TABLE IF NOT EXISTS public.permissions (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module      text NOT NULL,
    action      text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Role ↔ Permission junction
CREATE TABLE IF NOT EXISTS public.role_permissions (
    "roleId"        integer NOT NULL REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "permissionId"  integer NOT NULL REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY ("roleId", "permissionId")
);

-- CRM Users (integer PKs — separate from ERP users)
CREATE TABLE IF NOT EXISTS public.users (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           text NOT NULL UNIQUE,
    "passwordHash"  text NOT NULL,
    "fullName"      text NOT NULL,
    "roleId"        integer REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "isActive"      boolean DEFAULT true NOT NULL,
    branch          text,
    branch_id       integer REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL,
    manager_id      integer,   -- self-reference added via ALTER below
    region          text,
    region_id       integer REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL,
    status          text DEFAULT 'Active' NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Self-reference for manager hierarchy (added after table creation)
ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS users_manager_fk;
ALTER TABLE public.users
    ADD CONSTRAINT users_manager_fk
    FOREIGN KEY (manager_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Company settings key-value store
CREATE TABLE IF NOT EXISTS public.company_settings (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key         text NOT NULL UNIQUE,
    value       text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Master data (dropdown config / lookup values)
CREATE TABLE IF NOT EXISTS public.master_data (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category    text NOT NULL,
    value       text NOT NULL,
    label       text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive"  boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- CRM Audit logs (entity-level change tracking)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "userId"    integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    action      text NOT NULL,
    entity      text NOT NULL,
    "entityId"  integer,
    "oldValue"  jsonb,
    "newValue"  jsonb,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Employee attendance (check-in / check-out with GPS)
CREATE TABLE IF NOT EXISTS public.attendance (
    id                    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "userId"              integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "checkInTime"         timestamp(3) without time zone NOT NULL,
    "checkOutTime"        timestamp(3) without time zone,
    "checkInLatitude"     double precision NOT NULL,
    "checkInLongitude"    double precision NOT NULL,
    "checkOutLatitude"    double precision,
    "checkOutLongitude"   double precision,
    "visitNotes"          text,
    "customerId"          integer,   -- FK added below after customers table
    "createdAt"           timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- =========================================================================
-- SECTION 4: CRM MODULE — CUSTOMER & CONTACT MANAGEMENT
-- =========================================================================

-- CRM Products (integer-based, for CRM-side quoting/invoicing)
CREATE TABLE IF NOT EXISTS public.products (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            text NOT NULL,
    sku             text NOT NULL UNIQUE,
    price           numeric(12,2) NOT NULL,
    stock           integer DEFAULT 0 NOT NULL,
    "warrantyMonths" integer DEFAULT 12 NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- CRM Customers (master customer records)
CREATE TABLE IF NOT EXISTS public.customers (
    id                    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                  text NOT NULL,
    "gstNumber"           text,
    "billingStreet"       text NOT NULL DEFAULT '',
    "billingCity"         text NOT NULL DEFAULT '',
    "billingState"        text NOT NULL DEFAULT '',
    "billingZip"          text NOT NULL DEFAULT '',
    "billingDistrict"     text,
    "shippingStreet"      text NOT NULL DEFAULT '',
    "shippingCity"        text NOT NULL DEFAULT '',
    "shippingState"       text NOT NULL DEFAULT '',
    "shippingZip"         text NOT NULL DEFAULT '',
    "shippingDistrict"    text,
    "customerType"        text DEFAULT 'Corporate',
    industry              text DEFAULT 'Technology',
    priority              text DEFAULT 'Medium',
    "salesExecutiveId"    integer REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    status                text DEFAULT 'Active',
    tags                  text,
    territory             text DEFAULT 'West',
    branch_id             integer REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL,
    region_id             integer REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL,
    company_legal_name    text,
    customer_code         text,
    trade_name            text,
    "createdAt"           timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"           timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add customer FK to attendance (after customers table exists)
ALTER TABLE public.attendance
    DROP CONSTRAINT IF EXISTS attendance_customer_fk;
ALTER TABLE public.attendance
    ADD CONSTRAINT attendance_customer_fk
    FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Customer contacts (key persons at a customer org)
CREATE TABLE IF NOT EXISTS public.contacts (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "customerId"        integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name                text NOT NULL,
    email               text,
    phone               text NOT NULL,
    role                text,
    department          text,
    "decisionLevel"     text DEFAULT 'Influencer',
    "influenceScore"    integer DEFAULT 5,
    "preferredComm"     text DEFAULT 'Email',
    linkedin            text,
    birthday            timestamp(3) without time zone,
    notes               text,
    "createdAt"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Customer notes (internal notes)
CREATE TABLE IF NOT EXISTS public.customer_notes (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "customerId"    integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    title           text NOT NULL,
    content         text NOT NULL,
    tags            text,
    "isPinned"      boolean DEFAULT false NOT NULL,
    "isPrivate"     boolean DEFAULT false NOT NULL,
    "authorName"    text NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Customer tasks
CREATE TABLE IF NOT EXISTS public.customer_tasks (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "customerId"    integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    title           text NOT NULL,
    description     text,
    priority        text DEFAULT 'MEDIUM' NOT NULL,
    "dueDate"       timestamp(3) without time zone NOT NULL,
    "ownerName"     text NOT NULL,
    status          text DEFAULT 'PENDING' NOT NULL,
    "reminderTime"  timestamp(3) without time zone,
    "relatedOppId"  integer,   -- FK to opportunities added below
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Customer documents / file attachments
CREATE TABLE IF NOT EXISTS public.customer_documents (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "customerId" integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name        text NOT NULL,
    category    text NOT NULL,
    "filePath"  text NOT NULL,
    "fileSize"  integer NOT NULL,
    version     integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- GST number lookup cache
CREATE TABLE IF NOT EXISTS public.gst_caches (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "gstNumber"     text NOT NULL UNIQUE,
    "legalName"     text NOT NULL,
    "tradeName"     text,
    status          text NOT NULL,
    "addressJson"   text NOT NULL,
    "rawResponse"   text NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- GST verification audit logs
CREATE TABLE IF NOT EXISTS public.gst_verification_logs (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "userId"            integer REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "customerId"        integer REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "gstNumber"         text NOT NULL,
    "verificationResult" text NOT NULL,
    "apiResponseCode"   integer,
    "ipAddress"         text,
    "timestamp"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- CRM notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "userId"    integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    title       text NOT NULL,
    message     text NOT NULL,
    type        text NOT NULL,
    "isRead"    boolean DEFAULT false NOT NULL,
    "relatedId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Customer activities (visit/call/meeting log)
CREATE TABLE IF NOT EXISTS public.activities (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id     integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    activity_type   text NOT NULL,
    employee_id     integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    date            timestamp(3) without time zone NOT NULL,
    notes           text,
    outcome         text
);

-- Reports (generated analytics snapshots)
CREATE TABLE IF NOT EXISTS public.reports (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type        text NOT NULL,
    title       text NOT NULL,
    data        jsonb NOT NULL DEFAULT '{}',
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- =========================================================================
-- SECTION 5: CRM MODULE — SALES PIPELINE
-- Leads → Opportunities → Quotations → Purchase Orders → Sales Orders
-- =========================================================================

-- Leads (prospective customers)
CREATE TABLE IF NOT EXISTS public.leads (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "firstName"     text NOT NULL,
    "lastName"      text NOT NULL,
    company         text NOT NULL,
    email           text NOT NULL,
    phone           text NOT NULL,
    status          text DEFAULT 'NEW' NOT NULL,
    "assignedToId"  integer REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "createdById"   integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "customerId"    integer REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "leadType"      text DEFAULT 'SMB',
    source          text DEFAULT 'Website',
    value           numeric(12,2) DEFAULT 0.00,
    "bantBudget"    boolean DEFAULT false NOT NULL,
    "bantAuthority" boolean DEFAULT false NOT NULL,
    "bantNeed"      boolean DEFAULT false NOT NULL,
    "bantTimeline"  boolean DEFAULT false NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Lead history (stage transitions)
CREATE TABLE IF NOT EXISTS public.lead_histories (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "leadId"        integer NOT NULL REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE,
    action          text NOT NULL,
    note            text,
    "performedById" integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Opportunities (deals in pipeline)
CREATE TABLE IF NOT EXISTS public.opportunities (
    id                      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "customerId"            integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    title                   text NOT NULL,
    stage                   text DEFAULT 'QUALIFY' NOT NULL,
    status                  text DEFAULT 'OPEN' NOT NULL,
    probability             integer DEFAULT 20 NOT NULL,
    value                   numeric(12,2) DEFAULT 0.00,
    "expectedClosureDate"   timestamp(3) without time zone,
    "ownerId"               integer REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "preSalesId"            integer REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "createdById"           integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "originalLeadId"        integer REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "previousStage"         text,
    "solutionSignedOff"     boolean DEFAULT false NOT NULL,
    "technicalQuoteSignedOff" boolean DEFAULT false NOT NULL,
    "createdAt"             timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"             timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add relatedOppId FK to customer_tasks (after opportunities table exists)
ALTER TABLE public.customer_tasks
    DROP CONSTRAINT IF EXISTS customer_tasks_opp_fk;
ALTER TABLE public.customer_tasks
    ADD CONSTRAINT customer_tasks_opp_fk
    FOREIGN KEY ("relatedOppId") REFERENCES public.opportunities(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Opportunity products (line items)
CREATE TABLE IF NOT EXISTS public.opportunity_products (
    "opportunityId"     integer NOT NULL REFERENCES public.opportunities(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "productId"         integer NOT NULL REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity            integer NOT NULL,
    "unitPrice"         numeric(12,2) NOT NULL,
    "discountPercent"   numeric(5,2) DEFAULT 0.00 NOT NULL,
    PRIMARY KEY ("opportunityId", "productId")
);

-- Opportunity activities (stage change history)
CREATE TABLE IF NOT EXISTS public.opportunity_activities (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "opportunityId" integer NOT NULL REFERENCES public.opportunities(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "userId"        integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    action          text NOT NULL,
    stage           text NOT NULL,
    notes           text,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Solution assignments (pre-sales technical proposals)
CREATE TABLE IF NOT EXISTS public.solution_assignments (
    id                      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "opportunityId"         integer NOT NULL REFERENCES public.opportunities(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "assignedToId"          integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "assignedById"          integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "assignedDate"          timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate"               timestamp(3) without time zone,
    status                  text DEFAULT 'PENDING' NOT NULL,
    "reviewNotes"           text,
    "solutionDescription"   text,
    "implementationNotes"   text,
    "feasibilityEstimate"   text,
    "recommendedProducts"   text,
    "reviewedAt"            timestamp(3) without time zone,
    "createdAt"             timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"             timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Quotations
CREATE TABLE IF NOT EXISTS public.quotations (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "opportunityId" integer NOT NULL REFERENCES public.opportunities(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "quoteNumber"   text NOT NULL UNIQUE,
    status          text DEFAULT 'DRAFT' NOT NULL,
    "totalAmount"   numeric(12,2) NOT NULL,
    "versionNumber" integer DEFAULT 1 NOT NULL,
    "createdById"   integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "filePath"      text,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Quotation line items
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "quotationId"       integer NOT NULL REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "productId"         integer NOT NULL REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity            integer NOT NULL,
    "unitPrice"         numeric(12,2) NOT NULL,
    "discountPercent"   numeric(5,2) DEFAULT 0.00 NOT NULL
);

-- CRM Purchase orders (customer-issued POs against quotations)
CREATE TABLE IF NOT EXISTS public.crm_purchase_orders (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "quotationId"   integer NOT NULL REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "poNumber"      text NOT NULL UNIQUE,
    "filePath"      text NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Sales orders (confirmed, tracks SAP sync)
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "purchaseOrderId" integer REFERENCES public.crm_purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "quotationId"   integer NOT NULL REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "orderNumber"   text NOT NULL UNIQUE,
    status          text DEFAULT 'PENDING' NOT NULL,
    "sapOrderId"    text,
    "sapSyncStatus" text DEFAULT 'NOT_SYNCED' NOT NULL,
    "sapSyncMessage" text,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sales_order_id  integer NOT NULL REFERENCES public.sales_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    invoice_number  text NOT NULL UNIQUE,
    amount          numeric(12,2) NOT NULL,
    status          text NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id     integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    invoice_number  text NOT NULL,
    amount          numeric(12,2) NOT NULL,
    payment_date    timestamp(3) without time zone NOT NULL,
    payment_method  text NOT NULL,
    status          text NOT NULL
);

-- Transactions (detailed financial transaction records)
CREATE TABLE IF NOT EXISTS public.transactions (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id         integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    order_number        text NOT NULL,
    order_date          timestamp(3) without time zone NOT NULL,
    invoice_date        timestamp(3) without time zone NOT NULL,
    payment_date        timestamp(3) without time zone NOT NULL,
    transaction_amount  numeric(12,2) NOT NULL,
    currency            text NOT NULL DEFAULT 'INR',
    product_category    text NOT NULL,
    product_name        text NOT NULL,
    quantity            integer NOT NULL,
    unit_price          numeric(12,2) NOT NULL,
    discount            numeric(12,2) NOT NULL DEFAULT 0,
    gst_amount          numeric(12,2) NOT NULL DEFAULT 0,
    total_amount        numeric(12,2) NOT NULL,
    payment_status      text NOT NULL,
    payment_method      text NOT NULL,
    delivery_status     text NOT NULL,
    sales_executive_id  integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    branch_id           integer NOT NULL REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    region_id           integer NOT NULL REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE RESTRICT
);


-- =========================================================================
-- SECTION 6: CRM MODULE — SERVICE & SUPPORT
-- Post-sale service requests, engineers, warranties, support packs
-- =========================================================================

-- Customer assets (products owned by customers)
CREATE TABLE IF NOT EXISTS public.customer_assets (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id         integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_id          integer NOT NULL REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    serial_number       text NOT NULL UNIQUE,
    imei                text,
    purchase_date       timestamp(3) without time zone NOT NULL,
    invoice_number      text,
    sales_order_number  text,
    warranty_start      timestamp(3) without time zone NOT NULL,
    warranty_end        timestamp(3) without time zone NOT NULL,
    apple_care_status   text DEFAULT 'N/A' NOT NULL,
    amc_status          text DEFAULT 'N/A' NOT NULL,
    support_pack_status text DEFAULT 'None' NOT NULL,
    current_health      text DEFAULT 'Good' NOT NULL,
    service_status      text DEFAULT 'In Use' NOT NULL,
    branch              text DEFAULT 'Head Office' NOT NULL,
    "createdAt"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Warranty records
CREATE TABLE IF NOT EXISTS public.warranty_records (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asset_id        integer NOT NULL REFERENCES public.customer_assets(id) ON UPDATE CASCADE ON DELETE CASCADE,
    warranty_start  timestamp(3) without time zone NOT NULL,
    warranty_end    timestamp(3) without time zone NOT NULL,
    status          text DEFAULT 'Active' NOT NULL,
    provider        text DEFAULT 'Manufacturer' NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Support packs (service plans)
CREATE TABLE IF NOT EXISTS public.support_packs (
    id                      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                    text NOT NULL,
    description             text NOT NULL,
    duration_months         integer NOT NULL,
    price                   numeric(12,2) NOT NULL,
    coverage                text NOT NULL,
    sla_hours               integer NOT NULL,
    response_time_hours     integer NOT NULL,
    resolution_time_hours   integer NOT NULL,
    free_visits_count       integer DEFAULT 0 NOT NULL,
    remote_support          boolean DEFAULT true NOT NULL,
    on_site_support         boolean DEFAULT false NOT NULL,
    replacement_coverage    boolean DEFAULT false NOT NULL,
    priority_level          text DEFAULT 'Medium' NOT NULL,
    is_active               boolean DEFAULT true NOT NULL,
    "createdAt"             timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"             timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Support pack purchases (customer subscriptions)
CREATE TABLE IF NOT EXISTS public.support_pack_purchases (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id     integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    asset_id        integer NOT NULL REFERENCES public.customer_assets(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    plan_id         integer NOT NULL REFERENCES public.support_packs(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    purchase_date   timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activation_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expiry_date     timestamp(3) without time zone NOT NULL,
    status          text DEFAULT 'Active' NOT NULL,
    price_paid      numeric(12,2) NOT NULL,
    invoice_number  text,
    payment_status  text DEFAULT 'Paid' NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Support pack renewals
CREATE TABLE IF NOT EXISTS public.support_pack_renewals (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_id     integer NOT NULL REFERENCES public.support_pack_purchases(id) ON UPDATE CASCADE ON DELETE CASCADE,
    renewal_date    timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    new_expiry_date timestamp(3) without time zone NOT NULL,
    price_paid      numeric(12,2) NOT NULL,
    invoice_number  text,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Service requests (support tickets)
CREATE TABLE IF NOT EXISTS public.service_requests (
    id                      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_number           text NOT NULL UNIQUE,
    customer_id             integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    asset_id                integer NOT NULL REFERENCES public.customer_assets(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    issue_category          text NOT NULL,
    priority                text DEFAULT 'Medium' NOT NULL,
    problem_description     text NOT NULL,
    preferred_visit_date    timestamp(3) without time zone,
    contact_person          text NOT NULL,
    contact_number          text NOT NULL,
    status                  text DEFAULT 'NEW' NOT NULL,
    sla_breach              boolean DEFAULT false NOT NULL,
    eta                     timestamp(3) without time zone,
    resolution_summary      text,
    feedback_score          integer,
    feedback_comments       text,
    "createdAt"             timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"             timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Support tickets (simplified ticket view)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id                      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id             integer NOT NULL REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    issue_type              text NOT NULL,
    priority                text NOT NULL,
    assigned_engineer_id    integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status                  text NOT NULL,
    created_date            timestamp(3) without time zone NOT NULL,
    closed_date             timestamp(3) without time zone,
    resolution_time_hours   integer
);

-- Engineer assignments (for service requests)
CREATE TABLE IF NOT EXISTS public.engineer_assignments (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_request_id  integer NOT NULL REFERENCES public.service_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
    engineer_id         integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    assigned_date       timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    accepted_date       timestamp(3) without time zone,
    status              text DEFAULT 'PENDING' NOT NULL,
    rejection_reason    text,
    "createdAt"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Service activities (stage change log for service requests)
CREATE TABLE IF NOT EXISTS public.service_activities (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_request_id  integer NOT NULL REFERENCES public.service_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
    changed_by_user_id  integer NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    stage               text NOT NULL,
    notes               text,
    created_at          timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Service attachments
CREATE TABLE IF NOT EXISTS public.service_attachments (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_request_id  integer NOT NULL REFERENCES public.service_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
    file_name           text NOT NULL,
    file_url            text NOT NULL,
    file_size           integer NOT NULL,
    file_type           text NOT NULL,
    "createdAt"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Service parts used (during repair)
CREATE TABLE IF NOT EXISTS public.service_parts_used (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_request_id  integer NOT NULL REFERENCES public.service_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_id          integer NOT NULL REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity            integer NOT NULL,
    unit_price          numeric(12,2) NOT NULL,
    total_price         numeric(12,2) NOT NULL,
    "createdAt"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- =========================================================================
-- SECTION 7: ERP MODULE — FOUNDATION TABLES
-- UUID text primary keys, PascalCase naming, managed by Prisma ORM
-- Source: ERP database (Prisma/Next.js schema)
-- =========================================================================

-- ERP Role (UUID-based)
CREATE TABLE IF NOT EXISTS public."Role" (
    id      text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name    text NOT NULL UNIQUE
);

-- ERP Branch (UUID-based, with page permissions)
CREATE TABLE IF NOT EXISTS public."Branch" (
    id                  text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name                text NOT NULL UNIQUE,
    "pagePermissions"   text
);

-- ERP User (UUID-based)
CREATE TABLE IF NOT EXISTS public."User" (
    id                          text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name                        text NOT NULL,
    email                       text NOT NULL UNIQUE,
    "passwordHash"              text NOT NULL,
    "roleId"                    text NOT NULL REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "branchId"                  text REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "isActive"                  boolean DEFAULT true NOT NULL,
    status                      text DEFAULT 'ACTIVE' NOT NULL,
    phone                       text,
    address                     text,
    "branchName"                text DEFAULT 'Head Office' NOT NULL,
    "customerType"              text DEFAULT 'STANDARD' NOT NULL,
    "assignedEmployeeId"        text,   -- self-reference added below
    "inheritBranchPermissions"  boolean DEFAULT true NOT NULL,
    "pagePermissions"           text,
    "lastLogin"                 timestamp(3) without time zone,
    "currentLoginAt"            timestamp(3) without time zone,
    "lastLoginAt"               timestamp(3) without time zone,
    "createdAt"                 timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"                 timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public."User"
    DROP CONSTRAINT IF EXISTS user_employee_fk;
ALTER TABLE public."User"
    ADD CONSTRAINT user_employee_fk
    FOREIGN KEY ("assignedEmployeeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- ERP Notification (UUID-based)
CREATE TABLE IF NOT EXISTS public."Notification" (
    id          text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"    text NOT NULL REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    title       text NOT NULL,
    message     text NOT NULL,
    read        boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- =========================================================================
-- SECTION 8: ERP MODULE — PRODUCT CATALOG
-- =========================================================================

-- ERP Product Category
CREATE TABLE IF NOT EXISTS public."Category" (
    id      text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name    text NOT NULL UNIQUE
);

-- ERP Product (UUID-based, with detailed attributes)
CREATE TABLE IF NOT EXISTS public."Product" (
    id              text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sku             text NOT NULL UNIQUE,
    name            text NOT NULL,
    "categoryId"    text NOT NULL REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    brand           text NOT NULL,
    "serialTracking" boolean DEFAULT false NOT NULL,
    barcode         text,
    "reorderLevel"  integer DEFAULT 10 NOT NULL,
    "safetyStock"   integer DEFAULT 5 NOT NULL,
    status          text DEFAULT 'ACTIVE' NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ERP Product Price (per branch pricing matrix)
CREATE TABLE IF NOT EXISTS public."ProductPrice" (
    id              text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sku             text NOT NULL,
    "branchCode"    text NOT NULL,
    "costPrice"     double precision NOT NULL,
    "sellingPrice"  double precision NOT NULL,
    mrp             double precision DEFAULT 0.0 NOT NULL,
    margin          double precision NOT NULL,
    "lastUpdated"   timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(sku, "branchCode")
);

-- ERP Product Price History (audit trail)
CREATE TABLE IF NOT EXISTS public."ProductPriceHistory" (
    id              text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sku             text NOT NULL,
    "branchCode"    text NOT NULL,
    "costPrice"     double precision NOT NULL,
    "sellingPrice"  double precision NOT NULL,
    mrp             double precision DEFAULT 0.0 NOT NULL,
    "updatedBy"     text NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- =========================================================================
-- SECTION 9: ERP MODULE — INVENTORY MANAGEMENT
-- =========================================================================

-- ERP Inventory (per-product, per-branch stock levels)
CREATE TABLE IF NOT EXISTS public."Inventory" (
    id              text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "productId"     text NOT NULL REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "branchId"      text NOT NULL REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "itemName"      text DEFAULT '' NOT NULL,
    sku             text DEFAULT '' NOT NULL,
    "branchCode"    text DEFAULT '' NOT NULL,
    -- Simplified stock columns (Prisma-managed)
    "availableStock" integer DEFAULT 0 NOT NULL,
    "reservedStock"  integer DEFAULT 0 NOT NULL,
    "allocatedStock" integer DEFAULT 0 NOT NULL,
    "damagedStock"   integer DEFAULT 0 NOT NULL,
    "reorderLevel"   integer DEFAULT 8 NOT NULL,
    -- Extended quantity columns (operational detail)
    quantity        integer DEFAULT 0 NOT NULL,
    "availableQty"  integer DEFAULT 0 NOT NULL,
    "reservedQty"   integer DEFAULT 0 NOT NULL,
    "allocatedQty"  integer DEFAULT 0 NOT NULL,
    "damagedQty"    integer DEFAULT 0 NOT NULL,
    "returnedQty"   integer DEFAULT 0 NOT NULL,
    "transitQty"    integer DEFAULT 0 NOT NULL,
    "incomingQty"   integer DEFAULT 0 NOT NULL,
    "outgoingQty"   integer DEFAULT 0 NOT NULL,
    "deadQty"       integer DEFAULT 0 NOT NULL,
    "minStock"      integer DEFAULT 5 NOT NULL,
    "maxStock"      integer DEFAULT 200 NOT NULL,
    "warehouseZone" text DEFAULT 'A1' NOT NULL,
    "ageingDays"    integer DEFAULT 0 NOT NULL,
    "createdAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ERP Inventory Movement (stock in/out audit log)
CREATE TABLE IF NOT EXISTS public."InventoryMovement" (
    id          text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sku         text NOT NULL,
    "branchCode" text NOT NULL,
    type        text NOT NULL,
    quantity    integer NOT NULL,
    details     text NOT NULL,
    "userId"    text,   -- optional reference to ERP User
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ERP Stock Alert (low stock / damage alerts)
CREATE TABLE IF NOT EXISTS public."StockAlert" (
    id          text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type        text NOT NULL,
    message     text NOT NULL,
    "branchCode" text NOT NULL,
    resolved    boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- =========================================================================
-- SECTION 10: ERP MODULE — ORDERS & RESERVATIONS
-- =========================================================================

-- ERP Stock Reservation (customer pre-orders / holds)
CREATE TABLE IF NOT EXISTS public."StockReservation" (
    id                  text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "reservationNumber" text NOT NULL UNIQUE,
    "customerId"        text NOT NULL REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "employeeId"        text REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "productId"         text NOT NULL REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    sku                 text NOT NULL,
    "branchCode"        text DEFAULT 'HYD-HQ' NOT NULL,
    quantity            integer NOT NULL,
    status              text DEFAULT 'PENDING' NOT NULL,
    notes               text,
    "reservedAt"        timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt"         timestamp(3) without time zone NOT NULL,
    "acceptedAt"        timestamp(3) without time zone,
    "rejectedAt"        timestamp(3) without time zone,
    "createdAt"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ERP Purchase Order (inbound customer orders tracked by ERP portal)
CREATE TABLE IF NOT EXISTS public."PurchaseOrder" (
    id                  text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "poNumber"          text NOT NULL UNIQUE,
    "customerId"        text NOT NULL REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "customerName"      text NOT NULL,
    "dateReceived"      timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "totalItems"        integer NOT NULL,
    "stockStatus"       text DEFAULT 'Checking' NOT NULL,
    "verificationStatus" text DEFAULT 'Pending' NOT NULL,
    "branchCode"        text DEFAULT 'HYD-HQ' NOT NULL,
    "itemsJson"         text DEFAULT '[]' NOT NULL
);


-- =========================================================================
-- SECTION 11: ERP MODULE — AI ANALYTICS
-- =========================================================================

-- AI Chat Sessions
CREATE TABLE IF NOT EXISTS public."ChatSession" (
    id          text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"    text NOT NULL,
    title       text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Chat Messages
CREATE TABLE IF NOT EXISTS public."ChatMessage" (
    id              text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "chatSessionId" text NOT NULL REFERENCES public."ChatSession"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    sender          text NOT NULL,
    message         text NOT NULL,
    "timestamp"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Query Log (natural language → SQL audit)
CREATE TABLE IF NOT EXISTS public."AIQueryLog" (
    id              text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"        text NOT NULL,
    question        text NOT NULL,
    "generatedQuery" text,
    "executionTime" double precision,
    "timestamp"     timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Audit Log (permission enforcement log)
CREATE TABLE IF NOT EXISTS public."AIAuditLog" (
    id                  text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"            text NOT NULL,
    "permissionPassed"  boolean NOT NULL,
    "actionChecked"     text NOT NULL,
    "timestamp"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- =========================================================================
-- SECTION 12: PERFORMANCE INDEXES
-- High-performance indexes for fast web lookups
-- =========================================================================

-- CRM indexes
CREATE INDEX IF NOT EXISTS idx_crm_users_email             ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_crm_users_role              ON public.users("roleId");
CREATE INDEX IF NOT EXISTS idx_crm_users_branch            ON public.users(branch_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_status        ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_crm_customers_branch        ON public.customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_territory     ON public.customers(territory);
CREATE INDEX IF NOT EXISTS idx_crm_customers_executive     ON public.customers("salesExecutiveId");
CREATE INDEX IF NOT EXISTS idx_crm_leads_status            ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned          ON public.leads("assignedToId");
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_customer  ON public.opportunities("customerId");
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage     ON public.opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_owner     ON public.opportunities("ownerId");
CREATE INDEX IF NOT EXISTS idx_crm_quotations_opp          ON public.quotations("opportunityId");
CREATE INDEX IF NOT EXISTS idx_crm_service_customer        ON public.service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_service_status          ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_user         ON public.attendance("userId");
CREATE INDEX IF NOT EXISTS idx_crm_attendance_time         ON public.attendance("checkInTime");
CREATE INDEX IF NOT EXISTS idx_crm_notifications_user      ON public.notifications("userId");
CREATE INDEX IF NOT EXISTS idx_crm_notifications_read      ON public.notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_crm_activities_customer     ON public.activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_gst_cache_gst           ON public.gst_caches("gstNumber");
CREATE INDEX IF NOT EXISTS idx_crm_audit_user              ON public.audit_logs("userId");
CREATE INDEX IF NOT EXISTS idx_crm_audit_entity            ON public.audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_crm_transactions_customer   ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_transactions_branch     ON public.transactions(branch_id);

-- ERP indexes
CREATE INDEX IF NOT EXISTS idx_erp_user_email              ON public."User"(email);
CREATE INDEX IF NOT EXISTS idx_erp_user_role               ON public."User"("roleId");
CREATE INDEX IF NOT EXISTS idx_erp_user_branch             ON public."User"("branchId");
CREATE INDEX IF NOT EXISTS idx_erp_user_status             ON public."User"(status);
CREATE INDEX IF NOT EXISTS idx_erp_product_sku             ON public."Product"(sku);
CREATE INDEX IF NOT EXISTS idx_erp_product_brand           ON public."Product"(brand);
CREATE INDEX IF NOT EXISTS idx_erp_product_status          ON public."Product"(status);
CREATE INDEX IF NOT EXISTS idx_erp_product_category        ON public."Product"("categoryId");
CREATE INDEX IF NOT EXISTS idx_erp_inventory_product       ON public."Inventory"("productId");
CREATE INDEX IF NOT EXISTS idx_erp_inventory_branch        ON public."Inventory"("branchId");
CREATE INDEX IF NOT EXISTS idx_erp_inventory_sku           ON public."Inventory"(sku);
CREATE INDEX IF NOT EXISTS idx_erp_inventory_branchcode    ON public."Inventory"("branchCode");
CREATE INDEX IF NOT EXISTS idx_erp_movement_sku            ON public."InventoryMovement"(sku);
CREATE INDEX IF NOT EXISTS idx_erp_movement_branch         ON public."InventoryMovement"("branchCode");
CREATE INDEX IF NOT EXISTS idx_erp_movement_time           ON public."InventoryMovement"("timestamp");
CREATE INDEX IF NOT EXISTS idx_erp_alert_branch            ON public."StockAlert"("branchCode");
CREATE INDEX IF NOT EXISTS idx_erp_alert_resolved          ON public."StockAlert"(resolved);
CREATE INDEX IF NOT EXISTS idx_erp_price_sku               ON public."ProductPrice"(sku);
CREATE INDEX IF NOT EXISTS idx_erp_price_branch            ON public."ProductPrice"("branchCode");
CREATE INDEX IF NOT EXISTS idx_erp_pricehist_sku           ON public."ProductPriceHistory"(sku);
CREATE INDEX IF NOT EXISTS idx_erp_reservation_customer    ON public."StockReservation"("customerId");
CREATE INDEX IF NOT EXISTS idx_erp_reservation_status      ON public."StockReservation"(status);
CREATE INDEX IF NOT EXISTS idx_erp_reservation_expires     ON public."StockReservation"("expiresAt");
CREATE INDEX IF NOT EXISTS idx_erp_po_number               ON public."PurchaseOrder"("poNumber");
CREATE INDEX IF NOT EXISTS idx_erp_po_customer             ON public."PurchaseOrder"("customerId");
CREATE INDEX IF NOT EXISTS idx_erp_po_branch               ON public."PurchaseOrder"("branchCode");
CREATE INDEX IF NOT EXISTS idx_erp_notification_user       ON public."Notification"("userId");
CREATE INDEX IF NOT EXISTS idx_erp_notification_read       ON public."Notification"(read);
CREATE INDEX IF NOT EXISTS idx_erp_chat_session_user       ON public."ChatSession"("userId");
CREATE INDEX IF NOT EXISTS idx_erp_chat_message_session    ON public."ChatMessage"("chatSessionId");
CREATE INDEX IF NOT EXISTS idx_erp_ai_query_user           ON public."AIQueryLog"("userId");
CREATE INDEX IF NOT EXISTS idx_erp_ai_audit_user           ON public."AIAuditLog"("userId");


-- =========================================================================
-- SECTION 13: CROSS-MODULE REFERENCE VIEWS
-- Convenience views that bridge CRM customers with ERP purchase orders
-- without requiring foreign key constraints across identity systems
-- =========================================================================

-- View: Unified order tracking — links CRM customer name with ERP PO records
CREATE OR REPLACE VIEW public.v_unified_purchase_orders AS
SELECT
    po.id               AS erp_po_id,
    po."poNumber"       AS po_number,
    po."customerName"   AS customer_name,
    po."dateReceived"   AS date_received,
    po."totalItems"     AS total_items,
    po."stockStatus"    AS stock_status,
    po."verificationStatus" AS verification_status,
    po."branchCode"     AS branch_code,
    po."itemsJson"      AS items_json,
    u.email             AS erp_user_email,
    u.name              AS erp_user_name,
    u."customerType"    AS customer_type
FROM public."PurchaseOrder" po
LEFT JOIN public."User" u ON u.id = po."customerId";

-- View: CRM customer pipeline summary
CREATE OR REPLACE VIEW public.v_crm_customer_summary AS
SELECT
    c.id,
    c.name,
    c."customerType",
    c.status,
    c.territory,
    c.priority,
    b.name AS branch_name,
    r.name AS region_name,
    u."fullName" AS sales_executive,
    COUNT(DISTINCT opp.id) AS opportunity_count,
    COUNT(DISTINCT sr.id) AS service_request_count,
    COALESCE(SUM(opp.value), 0) AS total_pipeline_value
FROM public.customers c
LEFT JOIN public.branches b ON b.id = c.branch_id
LEFT JOIN public.regions r ON r.id = c.region_id
LEFT JOIN public.users u ON u.id = c."salesExecutiveId"
LEFT JOIN public.opportunities opp ON opp."customerId" = c.id
LEFT JOIN public.service_requests sr ON sr.customer_id = c.id
GROUP BY c.id, c.name, c."customerType", c.status, c.territory,
         c.priority, b.name, r.name, u."fullName";

-- View: ERP inventory dashboard (all products across all branches)
CREATE OR REPLACE VIEW public.v_erp_inventory_dashboard AS
SELECT
    i.id,
    i.sku,
    i."itemName",
    i."branchCode",
    i."availableQty",
    i."reservedQty",
    i."damagedQty",
    i."transitQty",
    i."reorderLevel",
    i."warehouseZone",
    p.name AS product_name,
    p.brand,
    cat.name AS category,
    pp."sellingPrice",
    pp.mrp,
    pp."costPrice"
FROM public."Inventory" i
LEFT JOIN public."Product" p ON p.id = i."productId"
LEFT JOIN public."Category" cat ON cat.id = p."categoryId"
LEFT JOIN public."ProductPrice" pp ON pp.sku = i.sku AND pp."branchCode" = i."branchCode";

-- =========================================================================
-- END OF UNIVERSAL SCHEMA
-- Tables: 16 ERP + 38 CRM = 54 total
-- Views:  3 cross-module convenience views
-- Indexes: 55 performance indexes
-- =========================================================================

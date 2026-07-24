-- ============================================================
-- CONQUER TECHNOLOGIES - UNIFIED CRM & ERP DATABASE
-- Combined Schema with Role-Based Access Control
-- ============================================================
-- This schema merges both CRM and ERP systems with:
-- 1. Unified user table with role-based access
-- 2. Shared purchase_orders table
-- 3. Stock reservations linked to CRM opportunities
-- 4. Role-based access: Operations users have full access,
--    others have CRM-only access
-- 5. Complete CRM features: Leads, Opportunities, Quotes, 
--    Service, Assets, Campaigns, Meetings, Email
-- 6. Complete ERP features: Products, Inventory, POs, Sales Orders
-- ============================================================

-- ============================================================
-- 1. CORE IDENTITY & RBAC
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."business_units" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "business_units_name_key" UNIQUE ("name"),
    CONSTRAINT "business_units_code_key" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "public"."regions" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "regions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "regions_name_key" UNIQUE ("name")
);

CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "region_id" INTEGER NOT NULL,
    "page_permissions" TEXT,
    CONSTRAINT "branches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "branches_name_key" UNIQUE ("name"),
    CONSTRAINT "branches_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "roles_name_key" UNIQUE ("name")
);

CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" SERIAL NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "permissions_module_action_key" UNIQUE ("module", "action")
);

CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId"),
    CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 2. UNIFIED USERS TABLE (CRM + ERP + Operations)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branch_id" INTEGER,
    "manager_id" INTEGER,
    "branch" TEXT,
    "region" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "region_id" INTEGER,
    "business_unit_id" INTEGER,
    "business_unit_name" TEXT,
    "pre_sales_number" TEXT,
    "reporting_to_user_id" INTEGER,
    "reporting_to_name" TEXT,
    "reporting_to_role" TEXT,
    "customer_type" TEXT NOT NULL DEFAULT 'STANDARD',
    "epp_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    
    -- ERP-specific fields
    "employee_id" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "company_name" TEXT,
    "department" TEXT DEFAULT 'Supply Chain',
    "designation" TEXT DEFAULT 'Operations Executive',
    "city" TEXT DEFAULT 'Hyderabad',
    "state" TEXT DEFAULT 'Telangana',
    "country" TEXT DEFAULT 'India',
    "last_login" TIMESTAMP(3),
    "current_login_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "branch_name" TEXT DEFAULT 'Head Office',
    "assigned_employee_id" INTEGER,
    "inherit_branch_permissions" BOOLEAN DEFAULT true,
    "page_permissions" TEXT,
    "gst_number" TEXT DEFAULT '',
    "customer_id" TEXT,
    
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_key" UNIQUE ("email"),
    CONSTRAINT "users_pre_sales_number_key" UNIQUE ("pre_sales_number"),
    CONSTRAINT "users_employee_id_key" UNIQUE ("employee_id"),
    
    CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_reporting_to_user_id_fkey" FOREIGN KEY ("reporting_to_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "users_roleId_idx" ON "public"."users"("roleId");
CREATE INDEX IF NOT EXISTS "users_branch_id_idx" ON "public"."users"("branch_id");
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "public"."users"("status");
CREATE INDEX IF NOT EXISTS "users_assigned_employee_id_idx" ON "public"."users"("assigned_employee_id");
CREATE INDEX IF NOT EXISTS "users_reporting_to_user_id_idx" ON "public"."users"("reporting_to_user_id");
CREATE INDEX IF NOT EXISTS "users_customer_id_idx" ON "public"."users"("id");

-- ============================================================
-- 3. AUDIT & SYSTEM TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."master_data" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "master_data_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "master_data_category_value_key" UNIQUE ("category", "value")
);

CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "company_settings_key_key" UNIQUE ("key")
);

-- ============================================================
-- 4. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "public"."notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_isRead_idx" ON "public"."notifications"("isRead");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "public"."notifications"("createdAt");

-- ============================================================
-- 5. CUSTOMER MASTER & GST VERIFICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."gst_verification_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "customerId" INTEGER,
    "gstNumber" TEXT NOT NULL,
    "verificationResult" TEXT NOT NULL,
    "apiResponseCode" INTEGER,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gst_verification_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."gst_caches" (
    "id" SERIAL NOT NULL,
    "gstNumber" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "status" TEXT NOT NULL,
    "addressJson" TEXT NOT NULL,
    "rawResponse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gst_caches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gst_caches_gstNumber_key" UNIQUE ("gstNumber")
);

CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "customer_code" TEXT,
    "company_legal_name" TEXT,
    "trade_name" TEXT,
    "gstNumber" TEXT,
    "billingStreet" TEXT NOT NULL,
    "billingCity" TEXT NOT NULL,
    "billingDistrict" TEXT,
    "billingState" TEXT NOT NULL,
    "billingZip" TEXT NOT NULL,
    "shippingStreet" TEXT NOT NULL,
    "shippingCity" TEXT NOT NULL,
    "shippingDistrict" TEXT,
    "shippingState" TEXT NOT NULL,
    "shippingZip" TEXT NOT NULL,
    "customerType" TEXT DEFAULT 'Corporate',
    "creditDays" INTEGER DEFAULT 30,
    "industry" TEXT DEFAULT 'Technology',
    "status" TEXT DEFAULT 'Active',
    "salesExecutiveId" INTEGER,
    "territory" TEXT DEFAULT 'West',
    "priority" TEXT DEFAULT 'Medium',
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "region_id" INTEGER,
    "business_unit_id" INTEGER DEFAULT 1,
    "branch_id" INTEGER,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customers_customer_code_key" UNIQUE ("customer_code"),
    CONSTRAINT "customers_gstNumber_key" UNIQUE ("gstNumber"),
    CONSTRAINT "customers_salesExecutiveId_fkey" FOREIGN KEY ("salesExecutiveId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "customers_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "customers_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "customers_name_idx" ON "public"."customers"("name");
CREATE INDEX IF NOT EXISTS "customers_company_legal_name_idx" ON "public"."customers"("company_legal_name");
CREATE INDEX IF NOT EXISTS "customers_trade_name_idx" ON "public"."customers"("trade_name");

CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "role" TEXT,
    "department" TEXT,
    "linkedin" TEXT,
    "birthday" TIMESTAMP(3),
    "decisionLevel" TEXT DEFAULT 'Influencer',
    "influenceScore" INTEGER DEFAULT 5,
    "preferredComm" TEXT DEFAULT 'Email',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "contacts_name_idx" ON "public"."contacts"("name");

CREATE TABLE IF NOT EXISTS "public"."customer_notes" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."customer_documents" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."customer_tasks" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "ownerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reminderTime" TIMESTAMP(3),
    "relatedOppId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_tasks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 6. CATALOG, PRODUCT & INVENTORY MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "business_unit_id" INTEGER DEFAULT 1,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_name_business_unit_id_key" UNIQUE ("name", "business_unit_id"),
    CONSTRAINT "categories_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."oem_masters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "business_unit_id" INTEGER DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "oem_masters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "oem_masters_name_business_unit_id_key" UNIQUE ("name", "business_unit_id"),
    CONSTRAINT "oem_masters_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "item_number" TEXT,
    "category" TEXT DEFAULT 'Apple Hardware',
    "tax_percent" DECIMAL(5,2) DEFAULT 18.00,
    "cost_price" DECIMAL(12,2) DEFAULT 0.00,
    "market_price" DECIMAL(12,2) DEFAULT 0.00,
    "category_id" INTEGER,
    "brand" TEXT,
    "serial_tracking" BOOLEAN NOT NULL DEFAULT false,
    "barcode" TEXT,
    "reorder_level" INTEGER NOT NULL DEFAULT 10,
    "safety_stock" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "business_unit_id" INTEGER DEFAULT 1,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_sku_key" UNIQUE ("sku"),
    CONSTRAINT "products_item_number_key" UNIQUE ("item_number"),
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "products_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "public"."products"("brand");
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "public"."products"("category_id");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "public"."products"("status");

CREATE TABLE IF NOT EXISTS "public"."inventories" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "available_stock" INTEGER NOT NULL DEFAULT 0,
    "reserved_stock" INTEGER NOT NULL DEFAULT 0,
    "damaged_stock" INTEGER NOT NULL DEFAULT 0,
    "reorder_level" INTEGER NOT NULL DEFAULT 8,
    "item_name" TEXT NOT NULL DEFAULT '',
    "sku" TEXT NOT NULL DEFAULT '',
    "branch_code" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "available_qty" INTEGER NOT NULL DEFAULT 0,
    "reserved_qty" INTEGER NOT NULL DEFAULT 0,
    "allocated_qty" INTEGER NOT NULL DEFAULT 0,
    "damaged_qty" INTEGER NOT NULL DEFAULT 0,
    "returned_qty" INTEGER NOT NULL DEFAULT 0,
    "transit_qty" INTEGER NOT NULL DEFAULT 0,
    "incoming_qty" INTEGER NOT NULL DEFAULT 0,
    "outgoing_qty" INTEGER NOT NULL DEFAULT 0,
    "dead_qty" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 5,
    "max_stock" INTEGER NOT NULL DEFAULT 200,
    "warehouse_zone" TEXT NOT NULL DEFAULT 'A1',
    "ageing_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventories_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "inventories_product_id_idx" ON "public"."inventories"("product_id");
CREATE INDEX IF NOT EXISTS "inventories_branch_id_idx" ON "public"."inventories"("branch_id");
CREATE INDEX IF NOT EXISTS "inventories_sku_idx" ON "public"."inventories"("sku");
CREATE INDEX IF NOT EXISTS "inventories_branch_code_idx" ON "public"."inventories"("branch_code");

CREATE TABLE IF NOT EXISTS "public"."inventory_movements" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "inventory_movements_sku_idx" ON "public"."inventory_movements"("sku");
CREATE INDEX IF NOT EXISTS "inventory_movements_branch_code_idx" ON "public"."inventory_movements"("branch_code");
CREATE INDEX IF NOT EXISTS "inventory_movements_timestamp_idx" ON "public"."inventory_movements"("timestamp");

CREATE TABLE IF NOT EXISTS "public"."stock_alerts" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stock_alerts_branch_code_idx" ON "public"."stock_alerts"("branch_code");
CREATE INDEX IF NOT EXISTS "stock_alerts_resolved_idx" ON "public"."stock_alerts"("resolved");
CREATE INDEX IF NOT EXISTS "stock_alerts_created_at_idx" ON "public"."stock_alerts"("created_at");

CREATE TABLE IF NOT EXISTS "public"."product_prices" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "cost_price" DOUBLE PRECISION NOT NULL,
    "selling_price" DOUBLE PRECISION NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "margin" DOUBLE PRECISION NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_prices_sku_branch_code_key" UNIQUE ("sku", "branch_code")
);

CREATE INDEX IF NOT EXISTS "product_prices_sku_idx" ON "public"."product_prices"("sku");
CREATE INDEX IF NOT EXISTS "product_prices_branch_code_idx" ON "public"."product_prices"("branch_code");

CREATE TABLE IF NOT EXISTS "public"."product_price_history" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "cost_price" DOUBLE PRECISION NOT NULL,
    "selling_price" DOUBLE PRECISION NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_price_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_price_history_sku_idx" ON "public"."product_price_history"("sku");
CREATE INDEX IF NOT EXISTS "product_price_history_branch_code_idx" ON "public"."product_price_history"("branch_code");
CREATE INDEX IF NOT EXISTS "product_price_history_updated_at_idx" ON "public"."product_price_history"("updated_at");

-- ============================================================
-- 7. VENDORS
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "gst_number" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vendors_status_idx" ON "public"."vendors"("status");
CREATE INDEX IF NOT EXISTS "vendors_name_idx" ON "public"."vendors"("name");

-- ============================================================
-- 8. SALES LIFECYCLE (Leads → Opportunities → Quotes → POs → SOs)
-- ============================================================

-- 8.1 LEADS
CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignedToId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "customerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bantBudget" BOOLEAN NOT NULL DEFAULT false,
    "bantAuthority" BOOLEAN NOT NULL DEFAULT false,
    "bantNeed" BOOLEAN NOT NULL DEFAULT false,
    "bantTimeline" BOOLEAN NOT NULL DEFAULT false,
    "value" DECIMAL(12,2) DEFAULT 0.00,
    "leadType" TEXT DEFAULT 'SMB',
    "source" TEXT DEFAULT 'Website',
    "gst_number" TEXT DEFAULT '',
    "customer_requirements" TEXT,
    "lead_reference" TEXT,
    "business_unit_id" INTEGER DEFAULT 1,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leads_lead_reference_key" UNIQUE ("lead_reference"),
    CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "leads_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "leads_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."lead_items" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "product_name" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimated_value" DECIMAL(12,2) DEFAULT 0.00,
    "notes" TEXT,
    "oem" TEXT,
    "category" TEXT,
    "business_unit_id" INTEGER DEFAULT 1,
    "business_unit_name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lead_items_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "lead_items_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lead_items_lead_id_idx" ON "public"."lead_items"("lead_id");
CREATE INDEX IF NOT EXISTS "lead_items_business_unit_id_idx" ON "public"."lead_items"("business_unit_id");

CREATE TABLE IF NOT EXISTS "public"."lead_histories" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "performedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_histories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lead_histories_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_histories_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 8.2 OPPORTUNITIES (Linked to Stock Reservations for ERP integration)
CREATE TABLE IF NOT EXISTS "public"."opportunities" (
    "id" SERIAL NOT NULL,
    "opportunity_number" TEXT,
    "customerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "expectedClosureDate" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'QUALIFY',
    "previousStage" TEXT,
    "value" DECIMAL(12,2) DEFAULT 0.00,
    "probability" INTEGER NOT NULL DEFAULT 20,
    "ownerId" INTEGER,
    "preSalesId" INTEGER,
    "solutionSignedOff" BOOLEAN NOT NULL DEFAULT false,
    "technicalQuoteSignedOff" BOOLEAN NOT NULL DEFAULT false,
    "originalLeadId" INTEGER,
    "po_id" INTEGER,
    "billingStreet" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingZip" TEXT,
    "billingDistrict" TEXT,
    "shippingStreet" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingZip" TEXT,
    "shippingDistrict" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "salesExecutiveId" INTEGER,
    "salesManagerId" INTEGER,
    "branch" TEXT,
    "region" TEXT,
    "territory" TEXT,
    "business_unit_name" TEXT,
    "warehouse" TEXT,
    "opportunityType" TEXT,
    "opportunitySubType" TEXT,
    "leadSource" TEXT,
    "industry" TEXT,
    "priority" TEXT DEFAULT 'Medium',
    "expectedRevenue" DECIMAL(12,2) DEFAULT 0.00,
    "competitor" TEXT,
    "description" TEXT,
    "creditDays" INTEGER DEFAULT 30,
    "validityPeriod" TEXT,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "freightCharges" DECIMAL(12,2) DEFAULT 0.00,
    "incoterms" TEXT,
    "currency" TEXT DEFAULT 'INR',
    "taxProfile" TEXT,
    "warrantyRequirements" TEXT,
    "oems" JSONB,
    "termsConditions" TEXT,
    "internalNotes" TEXT,
    "solutionReviewStatus" TEXT DEFAULT 'Pending Assignment',
    "lossReason" TEXT,
    "lossCompetitor" TEXT,
    "lossPriceIssue" BOOLEAN DEFAULT false,
    "lossCustomerDecision" BOOLEAN DEFAULT false,
    "lossProductLimitation" BOOLEAN DEFAULT false,
    "lossNoBudget" BOOLEAN DEFAULT false,
    "lossOther" TEXT,
    "lead_reference" TEXT,
    "customer_requirements" TEXT,
    "loss_date" TIMESTAMP(3),
    "lost_by_id" INTEGER,
    "pre_sales_status" TEXT DEFAULT 'Assigned',
    "business_unit_id" INTEGER DEFAULT 1,
    
    -- ERP Integration Fields (Stock Reservation Link)
    "reservation_id" INTEGER,
    "product_details" JSONB DEFAULT '[]',
    "total_quantity" INTEGER DEFAULT 0,
    "reservation_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3),
    "requested_delivery_date" TIMESTAMP(3),
    "reservation_status" TEXT DEFAULT 'PENDING',
    "assigned_executive_id" INTEGER,
    
    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "opportunities_opportunity_number_key" UNIQUE ("opportunity_number"),
    CONSTRAINT "opportunities_originalLeadId_key" UNIQUE ("originalLeadId"),
    CONSTRAINT "opportunities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "opportunities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opportunities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "opportunities_preSalesId_fkey" FOREIGN KEY ("preSalesId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "opportunities_originalLeadId_fkey" FOREIGN KEY ("originalLeadId") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "opportunities_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "opportunities_salesExecutiveId_fkey" FOREIGN KEY ("salesExecutiveId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "opportunities_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "opportunities_lost_by_id_fkey" FOREIGN KEY ("lost_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "opportunities_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "opportunities_customerId_idx" ON "public"."opportunities"("customerId");
CREATE INDEX IF NOT EXISTS "opportunities_status_idx" ON "public"."opportunities"("status");
CREATE INDEX IF NOT EXISTS "opportunities_po_id_idx" ON "public"."opportunities"("po_id");
CREATE INDEX IF NOT EXISTS "opportunities_createdAt_idx" ON "public"."opportunities"("createdAt");
CREATE INDEX IF NOT EXISTS "opportunities_reservation_id_idx" ON "public"."opportunities"("reservation_id");

CREATE TABLE IF NOT EXISTS "public"."opportunity_products" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "itemNumber" INTEGER,
    "description" TEXT,
    "uom" TEXT DEFAULT 'Units',
    "preferredOem" TEXT,
    "notes" TEXT,
    "discountAmount" DECIMAL(12,2) DEFAULT 0.00,
    "priceAfterDisc" DECIMAL(12,2) DEFAULT 0.00,
    "taxPercent" DECIMAL(5,2) DEFAULT 0.00,
    "taxAmount" DECIMAL(12,2) DEFAULT 0.00,
    "lineTotal" DECIMAL(12,2) DEFAULT 0.00,
    "business_unit_id" INTEGER DEFAULT 1,
    "business_unit_name" TEXT,
    "oem" TEXT,
    "category" TEXT,
    "assigned_sales_executive_id" INTEGER,
    "assigned_presales_id" INTEGER,
    CONSTRAINT "opportunity_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "opportunity_products_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "opportunity_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opportunity_products_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "opportunity_products_business_unit_id_idx" ON "public"."opportunity_products"("business_unit_id");

CREATE TABLE IF NOT EXISTS "public"."opportunity_activities" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "opportunity_activities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "opportunity_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."opportunity_attachments" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "opportunity_attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "opportunity_attachments_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."solution_assignments" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "assignedToId" INTEGER NOT NULL,
    "assignedById" INTEGER NOT NULL,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "solutionDescription" TEXT,
    "implementationNotes" TEXT,
    "feasibilityEstimate" TEXT,
    "recommendedProducts" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "solution_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "solution_assignments_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "solution_assignments_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "solution_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 8.3 QUOTATIONS
CREATE TABLE IF NOT EXISTS "public"."quotations" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "filePath" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingStreet" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingZip" TEXT,
    "shippingStreet" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingZip" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "salesExecutiveId" INTEGER,
    "branch" TEXT,
    "region" TEXT,
    "business_unit_name" TEXT,
    "warehouse" TEXT,
    "territory" TEXT,
    "opportunityType" TEXT,
    "opportunity_sub_type" TEXT,
    "expected_close_date" TIMESTAMP(3),
    "dealValue" DECIMAL(12,2),
    "probability" INTEGER,
    "currentStage" TEXT,
    "creditDays" INTEGER,
    "deliveryTerms" TEXT,
    "paymentTerms" TEXT,
    "freightCharges" DECIMAL(12,2) DEFAULT 0.00,
    "insuranceCharges" DECIMAL(12,2) DEFAULT 0.00,
    "warranty" TEXT,
    "validity" TEXT,
    "taxProfile" TEXT,
    "currency" TEXT DEFAULT 'INR',
    "exchangeRate" DECIMAL(12,4) DEFAULT 1.0000,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalTax" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "roundedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "internalNotes" TEXT,
    "customerNotes" TEXT,
    "termsConditions" TEXT,
    "lead_reference" TEXT,
    "po_number" TEXT,
    "business_unit_id" INTEGER DEFAULT 1,
    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quotations_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotations_salesExecutiveId_fkey" FOREIGN KEY ("salesExecutiveId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quotations_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "quotations_quoteNumber_versionNumber_key" ON "public"."quotations"("quoteNumber", "versionNumber");

CREATE TABLE IF NOT EXISTS "public"."quotation_items" (
    "id" SERIAL NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "itemNumber" INTEGER,
    "description" TEXT,
    "sku" TEXT,
    "uom" TEXT DEFAULT 'Units',
    "discountAmount" DECIMAL(12,2) DEFAULT 0.00,
    "priceAfterDisc" DECIMAL(12,2) DEFAULT 0.00,
    "taxPercent" DECIMAL(5,2) DEFAULT 0.00,
    "taxAmount" DECIMAL(12,2) DEFAULT 0.00,
    "lineTotal" DECIMAL(12,2) DEFAULT 0.00,
    "business_unit_id" INTEGER DEFAULT 1,
    "business_unit_name" TEXT,
    "oem" TEXT,
    "category" TEXT,
    "assigned_sales_executive_id" INTEGER,
    "assigned_presales_id" INTEGER,
    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quotation_items_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "public"."quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quotation_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotation_items_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "quotation_items_business_unit_id_idx" ON "public"."quotation_items"("business_unit_id");

CREATE TABLE IF NOT EXISTS "public"."quotation_activities" (
    "id" SERIAL NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quotation_activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quotation_activities_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "public"."quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quotation_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."quotation_attachments" (
    "id" SERIAL NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quotation_attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quotation_attachments_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "public"."quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 9. PURCHASE ORDERS (SHARED BETWEEN CRM & ERP)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" SERIAL NOT NULL,
    "po_number" TEXT NOT NULL,
    "customer_po_number" TEXT,
    "lead_id" INTEGER,
    "customer_id" INTEGER,
    "company_name" TEXT NOT NULL,
    "gst_number" TEXT,
    "primary_contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "billing_address" TEXT,
    "shipping_address" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "freightAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "po_status" TEXT NOT NULL DEFAULT 'PENDING',
    "approval_status" TEXT NOT NULL DEFAULT 'Pending Approval',
    "erp_sync_status" TEXT NOT NULL DEFAULT 'Synced',
    "erp_verification_status" TEXT NOT NULL DEFAULT 'Pending',
    "erp_reference_id" TEXT,
    "erp_remarks" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "assigned_sales_executive_id" INTEGER,
    "verified_by_id" INTEGER,
    "approved_by_id" INTEGER,
    "vendor_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "expected_delivery" TIMESTAMP(3),
    "file_path" TEXT,
    "quotation_id" INTEGER,
    
    -- ERP-specific fields
    "customer_name" TEXT NOT NULL DEFAULT '',
    "total_amount" DECIMAL(10,2) DEFAULT 0,
    "date_received" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "total_items" INTEGER DEFAULT 0,
    "stock_status" TEXT DEFAULT 'Checking',
    "branch_code" TEXT DEFAULT 'HYD-HQ',
    "items_json" TEXT DEFAULT '[]',
    
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "purchase_orders_po_number_key" UNIQUE ("po_number"),
    CONSTRAINT "purchase_orders_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_assigned_sales_executive_id_fkey" FOREIGN KEY ("assigned_sales_executive_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "purchase_orders_customer_id_idx" ON "public"."purchase_orders"("customer_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_vendor_id_idx" ON "public"."purchase_orders"("vendor_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_branch_code_idx" ON "public"."purchase_orders"("branch_code");
CREATE INDEX IF NOT EXISTS "purchase_orders_verification_status_idx" ON "public"."purchase_orders"("erp_verification_status");
CREATE INDEX IF NOT EXISTS "purchase_orders_date_received_idx" ON "public"."purchase_orders"("date_received");

CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "po_number" TEXT,
    "product_id" INTEGER,
    "product_name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'Units',
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(12,2) NOT NULL,
    "item_status" TEXT NOT NULL DEFAULT 'Pending',
    "business_unit_id" INTEGER DEFAULT 1,
    "business_unit_name" TEXT,
    "oem" TEXT,
    "category" TEXT,
    "assigned_sales_executive_id" INTEGER,
    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "purchase_order_items_business_unit_id_idx" ON "public"."purchase_order_items"("business_unit_id");
CREATE INDEX IF NOT EXISTS "purchase_order_items_po_id_idx" ON "public"."purchase_order_items"("purchase_order_id");
CREATE INDEX IF NOT EXISTS "purchase_order_items_product_id_idx" ON "public"."purchase_order_items"("product_id");
CREATE INDEX IF NOT EXISTS "purchase_order_items_item_status_idx" ON "public"."purchase_order_items"("item_status");

CREATE TABLE IF NOT EXISTS "public"."purchase_order_status_history" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "po_number" TEXT,
    "previous_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "changed_by_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    CONSTRAINT "purchase_order_status_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "purchase_order_status_history_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."purchase_order_attachments" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "po_number" TEXT,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "uploaded_by_id" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_order_attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "purchase_order_attachments_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- 10. SALES ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."sales_orders" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER,
    "quotationId" INTEGER NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sapOrderId" TEXT,
    "sapSyncStatus" TEXT NOT NULL DEFAULT 'NOT_SYNCED',
    "sapSyncMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "business_unit_id" INTEGER DEFAULT 1,
    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sales_orders_orderNumber_key" UNIQUE ("orderNumber"),
    CONSTRAINT "sales_orders_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_orders_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "public"."quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_orders_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."sales_order_items" (
    "id" SERIAL NOT NULL,
    "sales_order_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "product_name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(12,2) NOT NULL,
    "business_unit_id" INTEGER DEFAULT 1,
    "business_unit_name" TEXT,
    "oem" TEXT,
    "category" TEXT,
    "assigned_sales_executive_id" INTEGER,
    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sales_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_order_items_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "sales_order_items_sales_order_id_idx" ON "public"."sales_order_items"("sales_order_id");
CREATE INDEX IF NOT EXISTS "sales_order_items_business_unit_id_idx" ON "public"."sales_order_items"("business_unit_id");

-- ============================================================
-- 11. INVOICES
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" INTEGER NOT NULL,
    "sales_order_id" INTEGER NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number"),
    CONSTRAINT "invoices_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 12. STOCK RESERVATION (ERP Module - Linked to Opportunities)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."stock_reservations" (
    "id" SERIAL NOT NULL,
    "reservation_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "employee_id" INTEGER,
    "opportunity_id" INTEGER,
    "product_id" INTEGER,
    "sku" TEXT,
    "branch_code" TEXT NOT NULL DEFAULT 'HYD-HQ',
    "quantity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "project" TEXT DEFAULT 'Default Project',
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "processing_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "drafted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_reservations_reservation_number_key" UNIQUE ("reservation_number"),
    CONSTRAINT "stock_reservations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_reservations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "stock_reservations_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "stock_reservations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "stock_reservations_customer_id_idx" ON "public"."stock_reservations"("customer_id");
CREATE INDEX IF NOT EXISTS "stock_reservations_employee_id_idx" ON "public"."stock_reservations"("employee_id");
CREATE INDEX IF NOT EXISTS "stock_reservations_product_id_idx" ON "public"."stock_reservations"("product_id");
CREATE INDEX IF NOT EXISTS "stock_reservations_status_idx" ON "public"."stock_reservations"("status");
CREATE INDEX IF NOT EXISTS "stock_reservations_expires_at_idx" ON "public"."stock_reservations"("expires_at");
CREATE INDEX IF NOT EXISTS "stock_reservations_created_at_idx" ON "public"."stock_reservations"("created_at");
CREATE INDEX IF NOT EXISTS "stock_reservations_opportunity_id_idx" ON "public"."stock_reservations"("opportunity_id");

CREATE TABLE IF NOT EXISTS "public"."stock_reservation_items" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reserved_qty" INTEGER NOT NULL DEFAULT 0,
    "shortage_qty" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stock_reservation_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_reservation_items_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."stock_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_reservation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "stock_reservation_items_reservation_id_idx" ON "public"."stock_reservation_items"("reservation_id");
CREATE INDEX IF NOT EXISTS "stock_reservation_items_product_id_idx" ON "public"."stock_reservation_items"("product_id");

-- ============================================================
-- 13. CUSTOMER ASSETS & SERVICE MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."customer_assets" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "serial_number" TEXT NOT NULL,
    "imei" TEXT,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "invoice_number" TEXT,
    "sales_order_number" TEXT,
    "warranty_start" TIMESTAMP(3) NOT NULL,
    "warranty_end" TIMESTAMP(3) NOT NULL,
    "apple_care_status" TEXT NOT NULL DEFAULT 'N/A',
    "amc_status" TEXT NOT NULL DEFAULT 'N/A',
    "support_pack_status" TEXT NOT NULL DEFAULT 'None',
    "current_health" TEXT NOT NULL DEFAULT 'Good',
    "service_status" TEXT NOT NULL DEFAULT 'In Use',
    "branch" TEXT NOT NULL DEFAULT 'Mumbai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "business_unit_id" INTEGER DEFAULT 1,
    CONSTRAINT "customer_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_assets_serial_number_key" UNIQUE ("serial_number"),
    CONSTRAINT "customer_assets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "customer_assets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customer_assets_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "customer_assets_customer_id_idx" ON "public"."customer_assets"("customer_id");
CREATE INDEX IF NOT EXISTS "customer_assets_product_id_idx" ON "public"."customer_assets"("product_id");

CREATE TABLE IF NOT EXISTS "public"."license_keys" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "license_key" TEXT NOT NULL,
    "activation_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "license_keys_license_key_key" UNIQUE ("license_key"),
    CONSTRAINT "license_keys_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."customer_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."support_packs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "coverage" TEXT NOT NULL,
    "sla_hours" INTEGER NOT NULL,
    "response_time_hours" INTEGER NOT NULL,
    "resolution_time_hours" INTEGER NOT NULL,
    "free_visits_count" INTEGER NOT NULL DEFAULT 0,
    "remote_support" BOOLEAN NOT NULL DEFAULT true,
    "on_site_support" BOOLEAN NOT NULL DEFAULT false,
    "replacement_coverage" BOOLEAN NOT NULL DEFAULT false,
    "priority_level" TEXT NOT NULL DEFAULT 'Medium',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "business_unit_id" INTEGER DEFAULT 1,
    CONSTRAINT "support_packs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "support_packs_name_key" UNIQUE ("name"),
    CONSTRAINT "support_packs_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."support_pack_purchases" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "price_paid" DECIMAL(12,2) NOT NULL,
    "invoice_number" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'Paid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "support_pack_purchases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "support_pack_purchases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_pack_purchases_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."customer_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_pack_purchases_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."support_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "support_pack_purchases_customer_id_idx" ON "public"."support_pack_purchases"("customer_id");
CREATE INDEX IF NOT EXISTS "support_pack_purchases_asset_id_idx" ON "public"."support_pack_purchases"("asset_id");

CREATE TABLE IF NOT EXISTS "public"."support_pack_renewals" (
    "id" SERIAL NOT NULL,
    "purchase_id" INTEGER NOT NULL,
    "renewal_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "new_expiry_date" TIMESTAMP(3) NOT NULL,
    "price_paid" DECIMAL(12,2) NOT NULL,
    "invoice_number" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_pack_renewals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "support_pack_renewals_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."support_pack_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."warranty_records" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "warranty_start" TIMESTAMP(3) NOT NULL,
    "warranty_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "provider" TEXT NOT NULL DEFAULT 'Apple',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "warranty_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "warranty_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."customer_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 14. SERVICE REQUESTS (CRM Support Module)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."service_requests" (
    "id" SERIAL NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "issue_category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "problem_description" TEXT NOT NULL,
    "preferred_visit_date" TIMESTAMP(3),
    "contact_person" TEXT NOT NULL,
    "contact_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assigned_to_id" INTEGER,
    "sla_breach" BOOLEAN NOT NULL DEFAULT false,
    "eta" TIMESTAMP(3),
    "resolution_summary" TEXT,
    "feedback_score" INTEGER,
    "feedback_comments" TEXT,
    "business_unit_id" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_requests_ticket_number_key" UNIQUE ("ticket_number"),
    CONSTRAINT "service_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_requests_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."customer_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_requests_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "service_requests_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "service_requests_customer_id_idx" ON "public"."service_requests"("customer_id");
CREATE INDEX IF NOT EXISTS "service_requests_asset_id_idx" ON "public"."service_requests"("asset_id");
CREATE INDEX IF NOT EXISTS "service_requests_assigned_to_id_idx" ON "public"."service_requests"("assigned_to_id");

CREATE TABLE IF NOT EXISTS "public"."engineer_assignments" (
    "id" SERIAL NOT NULL,
    "service_request_id" INTEGER NOT NULL,
    "engineer_id" INTEGER NOT NULL,
    "assigned_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "engineer_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "engineer_assignments_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "engineer_assignments_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."service_activities" (
    "id" SERIAL NOT NULL,
    "service_request_id" INTEGER NOT NULL,
    "changed_by_user_id" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_activities_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_activities_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."service_parts_used" (
    "id" SERIAL NOT NULL,
    "service_request_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_parts_used_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_parts_used_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_parts_used_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."service_attachments" (
    "id" SERIAL NOT NULL,
    "service_request_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_attachments_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 15. ATTENDANCE, ACTIVITIES & REPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL,
    "checkOutTime" TIMESTAMP(3),
    "checkInLatitude" DOUBLE PRECISION NOT NULL,
    "checkInLongitude" DOUBLE PRECISION NOT NULL,
    "checkOutLatitude" DOUBLE PRECISION,
    "checkOutLongitude" DOUBLE PRECISION,
    "visitNotes" TEXT,
    "customerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "activity_type" TEXT NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "outcome" TEXT,
    CONSTRAINT "activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "activities_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "transaction_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "product_category" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL,
    "gst_amount" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "payment_status" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "delivery_status" TEXT NOT NULL,
    "sales_executive_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "region_id" INTEGER NOT NULL,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_sales_executive_id_fkey" FOREIGN KEY ("sales_executive_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "business_unit_id" INTEGER DEFAULT 1,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reports_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================
-- 16. SUPPORT TICKETS (Legacy/Alternative Support Tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "issue_type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "assigned_engineer_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL,
    "closed_date" TIMESTAMP(3),
    "resolution_time_hours" INTEGER,
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "support_tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_tickets_assigned_engineer_id_fkey" FOREIGN KEY ("assigned_engineer_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- 17. MAC REGISTRATIONS & DEVICE AUTHORIZATION
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."mac_registrations" (
    "id" SERIAL NOT NULL,
    "mac_address" TEXT NOT NULL,
    "device_label" TEXT,
    "user_id" INTEGER,
    "branch" TEXT,
    "department" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "created_by" INTEGER,
    "authorized_by" TEXT,
    "authorized_at" TIMESTAMP(3),
    "last_login" TIMESTAMP(3),
    "notes" TEXT,
    "browser" TEXT,
    "operating_system" TEXT,
    "ip_address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mac_registrations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mac_registrations_mac_address_key" UNIQUE ("mac_address"),
    CONSTRAINT "mac_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."mac_access_logs" (
    "id" SERIAL NOT NULL,
    "mac_address" TEXT,
    "ip_address" TEXT,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    CONSTRAINT "mac_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."device_authorization_requests" (
    "id" SERIAL NOT NULL,
    "request_number" TEXT NOT NULL,
    "device_label" TEXT,
    "mac_address" TEXT NOT NULL,
    "browser" TEXT,
    "operating_system" TEXT,
    "platform" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "admin_remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "device_authorization_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "device_authorization_requests_request_number_key" UNIQUE ("request_number")
);

-- ============================================================
-- 18. PROFILE UPDATE REQUESTS (Phase 20)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."profile_update_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "requested_email" TEXT,
    "requested_phone" TEXT,
    "requested_address" TEXT,
    "requested_name" TEXT,
    "requested_company" TEXT,
    "requested_department" TEXT,
    "requested_designation" TEXT,
    "requested_employee_id" TEXT,
    "requested_gst_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profile_update_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profile_update_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "profile_update_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "profile_update_requests_userId_idx" ON "public"."profile_update_requests"("userId");
CREATE INDEX IF NOT EXISTS "profile_update_requests_status_idx" ON "public"."profile_update_requests"("status");
CREATE INDEX IF NOT EXISTS "profile_update_requests_createdAt_idx" ON "public"."profile_update_requests"("createdAt");

COMMENT ON TABLE "public"."profile_update_requests" IS 'Tracks user profile update requests for approval workflow (Phase 20)';

-- ============================================================
-- 19. MEETINGS & PARTICIPANTS
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "opportunityId" INTEGER,
    "leadId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meeting_date" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "location" TEXT,
    "meeting_type" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "organizer_id" INTEGER NOT NULL,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "meetings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "meetings_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "meetings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "meetings_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "meetings_customerId_idx" ON "public"."meetings"("customerId");
CREATE INDEX IF NOT EXISTS "meetings_opportunityId_idx" ON "public"."meetings"("opportunityId");
CREATE INDEX IF NOT EXISTS "meetings_leadId_idx" ON "public"."meetings"("leadId");
CREATE INDEX IF NOT EXISTS "meetings_meeting_date_idx" ON "public"."meetings"("meeting_date");
CREATE INDEX IF NOT EXISTS "meetings_status_idx" ON "public"."meetings"("status");

COMMENT ON TABLE "public"."meetings" IS 'Customer/opportunity meetings tracking';

CREATE TABLE IF NOT EXISTS "public"."meeting_participants" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "attended" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "meeting_participants_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "meeting_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "meeting_participants_meetingId_idx" ON "public"."meeting_participants"("meetingId");
CREATE INDEX IF NOT EXISTS "meeting_participants_userId_idx" ON "public"."meeting_participants"("userId");

COMMENT ON TABLE "public"."meeting_participants" IS 'Participants in customer/opportunity meetings';

-- ============================================================
-- 20. EMAIL TEMPLATES & LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "business_unit_id" INTEGER DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_templates_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "email_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_templates_business_unit_id_idx" ON "public"."email_templates"("business_unit_id");
CREATE INDEX IF NOT EXISTS "email_templates_category_idx" ON "public"."email_templates"("category");

COMMENT ON TABLE "public"."email_templates" IS 'Pre-defined email templates for communications';

CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER,
    "customerId" INTEGER,
    "opportunityId" INTEGER,
    "leadId" INTEGER,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentBy" INTEGER NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "recipient_name" TEXT,
    "cc" TEXT,
    "bcc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "error_message" TEXT,
    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "email_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "email_logs_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "email_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "email_logs_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_logs_sentBy_idx" ON "public"."email_logs"("sentBy");
CREATE INDEX IF NOT EXISTS "email_logs_customerId_idx" ON "public"."email_logs"("customerId");
CREATE INDEX IF NOT EXISTS "email_logs_opportunityId_idx" ON "public"."email_logs"("opportunityId");
CREATE INDEX IF NOT EXISTS "email_logs_sentAt_idx" ON "public"."email_logs"("sentAt");
CREATE INDEX IF NOT EXISTS "email_logs_status_idx" ON "public"."email_logs"("status");

COMMENT ON TABLE "public"."email_logs" IS 'Audit log of all emails sent from the system';

-- ============================================================
-- 21. CAMPAIGNS & CAMPAIGN LEADS
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "budget" DECIMAL(12,2),
    "target_audience" TEXT,
    "expected_revenue" DECIMAL(12,2),
    "actual_revenue" DECIMAL(12,2),
    "business_unit_id" INTEGER DEFAULT 1,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campaigns_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "campaigns_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "public"."campaigns"("status");
CREATE INDEX IF NOT EXISTS "campaigns_business_unit_id_idx" ON "public"."campaigns"("business_unit_id");
CREATE INDEX IF NOT EXISTS "campaigns_start_date_idx" ON "public"."campaigns"("start_date");
CREATE INDEX IF NOT EXISTS "campaigns_end_date_idx" ON "public"."campaigns"("end_date");

COMMENT ON TABLE "public"."campaigns" IS 'Marketing campaigns for lead generation';

CREATE TABLE IF NOT EXISTS "public"."campaign_leads" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "leadId" INTEGER NOT NULL,
    "status" TEXT DEFAULT 'PENDING',
    "assignedTo" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaign_leads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campaign_leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "campaign_leads_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "campaign_leads_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "campaign_leads_campaignId_idx" ON "public"."campaign_leads"("campaignId");
CREATE INDEX IF NOT EXISTS "campaign_leads_leadId_idx" ON "public"."campaign_leads"("leadId");
CREATE INDEX IF NOT EXISTS "campaign_leads_status_idx" ON "public"."campaign_leads"("status");

COMMENT ON TABLE "public"."campaign_leads" IS 'Leads associated with marketing campaigns';

-- ============================================================
-- 22. INSERT DEFAULT ROLES FOR CRM + ERP ACCESS
-- ============================================================

INSERT INTO "public"."roles" ("name", "permissions", "level", "isActive", "createdAt", "updatedAt") VALUES
('SUPER_ADMIN', '{"all": true, "modules": ["crm", "erp", "operations", "scm", "logistics"]}', 100, true, NOW(), NOW()),
('OPERATIONS_DIRECTOR', '{"all": true, "modules": ["crm", "erp", "operations", "scm", "logistics"]}', 95, true, NOW(), NOW()),
('OPERATIONS_MANAGER', '{"all": true, "modules": ["crm", "erp", "operations", "scm", "logistics"]}', 90, true, NOW(), NOW()),
('ASST_MANAGER_OPERATIONS', '{"all": false, "modules": ["crm", "erp", "operations"], "read": true, "write": true, "approve": false}', 80, true, NOW(), NOW()),
('OPERATIONS_EXECUTIVE', '{"all": false, "modules": ["crm", "erp", "operations"], "read": true, "write": true, "approve": false}', 75, true, NOW(), NOW()),
('ADMIN', '{"all": true, "modules": ["crm", "erp"]}', 50, true, NOW(), NOW()),
('SALES_HEAD', '{"all": false, "modules": ["crm"], "read": true, "write": true, "approve": true}', 40, true, NOW(), NOW()),
('RSM', '{"all": false, "modules": ["crm"], "read": true, "write": true, "approve": false}', 35, true, NOW(), NOW()),
('BRANCH_MANAGER', '{"all": false, "modules": ["crm"], "read": true, "write": true, "approve": false}', 30, true, NOW(), NOW()),
('SALES_EXECUTIVE', '{"all": false, "modules": ["crm"], "read": true, "write": true, "approve": false}', 20, true, NOW(), NOW()),
('CUSTOMER', '{"all": false, "modules": ["crm"], "read": true, "write": false, "approve": false}', 10, true, NOW(), NOW());

-- ============================================================
-- 23. INSERT DEFAULT BUSINESS UNITS
-- ============================================================

INSERT INTO "public"."business_units" ("name", "code", "description", "status", "created_at", "updated_at") VALUES
('Apple', 'APPLE', 'Apple Products Division', 'ACTIVE', NOW(), NOW()),
('Non-Apple', 'NONAPPLE', 'Non-Apple Products Division', 'ACTIVE', NOW(), NOW()),
('Solutions', 'SOLUTIONS', 'Solutions & Services Division', 'ACTIVE', NOW(), NOW());

-- ============================================================
-- 24. INSERT DEFAULT REGIONS
-- ============================================================

INSERT INTO "public"."regions" ("id", "name") VALUES
(1, 'North'),
(2, 'South'),
(3, 'East'),
(4, 'West'),
(5, 'Central');

-- ============================================================
-- 25. INSERT DEFAULT BRANCHES
-- ============================================================

INSERT INTO "public"."branches" ("id", "name", "region_id", "page_permissions") VALUES
(1, 'Mumbai HQ', 4, '{"all": true}'),
(2, 'Delhi', 1, '{"all": true}'),
(3, 'Bangalore', 2, '{"all": true}'),
(4, 'Hyderabad', 2, '{"all": true}'),
(5, 'Chennai', 2, '{"all": true}'),
(6, 'Kolkata', 3, '{"all": true}');

-- ============================================================
-- 26. INSERT DEFAULT CATEGORIES
-- ============================================================

INSERT INTO "public"."categories" ("name", "business_unit_id") VALUES
('Apple Hardware', 1),
('Apple Software', 1),
('MDM Solutions', 1),
('End Compute', 1),
('Non-Apple Hardware', 2),
('Non-Apple Software', 2),
('Solutions Services', 3);

-- ============================================================
-- 27. INSERT SAMPLE OEM MASTERS
-- ============================================================

INSERT INTO "public"."oem_masters" ("name", "category", "business_unit_id", "status", "created_at", "updated_at") VALUES
('Apple Inc.', 'Hardware', 1, 'ACTIVE', NOW(), NOW()),
('Dell Technologies', 'Hardware', 2, 'ACTIVE', NOW(), NOW()),
('Jamf', 'MDM', 1, 'ACTIVE', NOW(), NOW()),
('Microsoft', 'Software', 2, 'ACTIVE', NOW(), NOW()),
('SAP', 'Enterprise', 3, 'ACTIVE', NOW(), NOW());

-- ============================================================
-- 28. INSERT DEFAULT COMPANY SETTINGS
-- ============================================================

INSERT INTO "public"."company_settings" ("key", "value", "createdAt", "updatedAt") VALUES
('company_name', 'Conquer Technologies', NOW(), NOW()),
('company_gst', '22AAAAA0000A1Z5', NOW(), NOW()),
('company_address', 'Mumbai, Maharashtra', NOW(), NOW()),
('company_phone', '+91-9876543210', NOW(), NOW()),
('company_email', 'info@conquertechnologies.com', NOW(), NOW()),
('tax_default', '18', NOW(), NOW()),
('currency_default', 'INR', NOW(), NOW()),
('credit_days_default', '30', NOW(), NOW());

-- ============================================================
-- 29. CREATE VIEW FOR UNIFIED USER ACCESS
-- ============================================================

CREATE OR REPLACE VIEW "public"."user_access_summary" AS
SELECT 
    u.id,
    u.email,
    u."fullName",
    u.employee_id,
    u.customer_id,
    u.customer_type,
    r.name AS role_name,
    r.level AS role_level,
    u.business_unit_id,
    bu.name AS business_unit_name,
    u.branch_id,
    b.name AS branch_name,
    u."isActive",
    u.status,
    CASE 
        WHEN r.name IN ('SUPER_ADMIN', 'OPERATIONS_DIRECTOR', 'OPERATIONS_MANAGER', 'ASST_MANAGER_OPERATIONS', 'OPERATIONS_EXECUTIVE') 
        THEN 'FULL_ACCESS' 
        ELSE 'CRM_ONLY' 
    END AS access_type
FROM "public"."users" u
LEFT JOIN "public"."roles" r ON u."roleId" = r.id
LEFT JOIN "public"."business_units" bu ON u.business_unit_id = bu.id
LEFT JOIN "public"."branches" b ON u.branch_id = b.id;

-- ============================================================
-- 30. CREATE VIEW FOR OPPORTUNITY RESERVATION STATUS
-- ============================================================

CREATE OR REPLACE VIEW "public"."opportunity_reservation_status" AS
SELECT 
    o.id AS opportunity_id,
    o.opportunity_number,
    o.title,
    o."customerId",
    c.name AS customer_name,
    o.status AS opportunity_status,
    o.stage,
    o.reservation_id,
    sr.reservation_number,
    sr.status AS reservation_status,
    sr.quantity AS reserved_quantity,
    sr.reserved_at,
    sr.expires_at,
    CASE 
        WHEN sr.expires_at < NOW() AND sr.status NOT IN ('COMPLETED', 'CANCELLED', 'REJECTED') 
        THEN 'EXPIRED' 
        ELSE 'VALID' 
    END AS reservation_validity
FROM "public"."opportunities" o
LEFT JOIN "public"."customers" c ON o."customerId" = c.id
LEFT JOIN "public"."stock_reservations" sr ON o.reservation_id = sr.id;

-- ============================================================
-- 31. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_users_role_bu" ON "public"."users"("roleId", "business_unit_id");
CREATE INDEX IF NOT EXISTS "idx_opportunities_reservation" ON "public"."opportunities"("reservation_id");
CREATE INDEX IF NOT EXISTS "idx_stock_reservations_opportunity" ON "public"."stock_reservations"("opportunity_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_quotation" ON "public"."purchase_orders"("quotation_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_customer_status" ON "public"."purchase_orders"("customer_id", "po_status");

-- ============================================================
-- 32. COMMENT ON TABLES FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE "public"."users" IS 'Unified user table for CRM + ERP. Operations roles have full access; others have CRM-only access.';
COMMENT ON TABLE "public"."opportunities" IS 'CRM opportunities with ERP integration via reservation_id linking to stock_reservations.';
COMMENT ON TABLE "public"."purchase_orders" IS 'Shared purchase orders table accessible from both CRM and ERP modules.';
COMMENT ON TABLE "public"."stock_reservations" IS 'ERP stock reservations linked to CRM opportunities for inventory allocation.';
COMMENT ON VIEW "public"."user_access_summary" IS 'View showing user access type (FULL_ACCESS for Operations roles, CRM_ONLY for others).';
COMMENT ON VIEW "public"."opportunity_reservation_status" IS 'View showing opportunity reservation status for real-time inventory tracking.';
COMMENT ON TABLE "public"."profile_update_requests" IS 'Tracks user profile update requests for approval workflow (Phase 20)';
COMMENT ON TABLE "public"."meetings" IS 'Customer/opportunity meetings tracking';
COMMENT ON TABLE "public"."meeting_participants" IS 'Participants in customer/opportunity meetings';
COMMENT ON TABLE "public"."email_templates" IS 'Pre-defined email templates for communications';
COMMENT ON TABLE "public"."email_logs" IS 'Audit log of all emails sent from the system';
COMMENT ON TABLE "public"."campaigns" IS 'Marketing campaigns for lead generation';
COMMENT ON TABLE "public"."campaign_leads" IS 'Leads associated with marketing campaigns';

-- ============================================================
-- 33. COMPLETE ROLE-BASED ACCESS CONTROL (RBAC) SUMMARY
-- ============================================================

-- Access Matrix:
-- | Role                    | CRM Access | ERP Access | Operations Access | SCM Access | Logistics Access |
-- |-------------------------|------------|------------|-------------------|------------|------------------|
-- | SUPER_ADMIN             | ✅         | ✅         | ✅                | ✅         | ✅               |
-- | OPERATIONS_DIRECTOR     | ✅         | ✅         | ✅                | ✅         | ✅               |
-- | OPERATIONS_MANAGER      | ✅         | ✅         | ✅                | ✅         | ✅               |
-- | ASST_MANAGER_OPERATIONS | ✅         | ✅         | ✅                | ❌         | ❌               |
-- | OPERATIONS_EXECUTIVE    | ✅         | ✅         | ✅                | ❌         | ❌               |
-- | ADMIN                   | ✅         | ✅         | ❌                | ❌         | ❌               |
-- | SALES_HEAD              | ✅         | ❌         | ❌                | ❌         | ❌               |
-- | RSM                     | ✅         | ❌         | ❌                | ❌         | ❌               |
-- | BRANCH_MANAGER          | ✅         | ❌         | ❌                | ❌         | ❌               |
-- | SALES_EXECUTIVE         | ✅         | ❌         | ❌                | ❌         | ❌               |
-- | CUSTOMER                | ✅ (read)  | ❌         | ❌                | ❌         | ❌               |

-- ============================================================
-- END OF UNIFIED CRM + ERP DATABASE SCHEMA
-- ============================================================
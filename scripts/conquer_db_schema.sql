-- ============================================================================
-- Conquer_DB Enterprise PostgreSQL Database Schema
-- Unified CRM + ERP Database Architecture Specification
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS conquer_db;
SET search_path TO conquer_db, public;

-- ----------------------------------------------------------------------------
-- 1. COMMON MASTER TABLES
-- ----------------------------------------------------------------------------

-- Shared Branches
CREATE TABLE IF NOT EXISTS conquer_db.branches (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(64),
    address TEXT,
    page_permissions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Shared Departments
CREATE TABLE IF NOT EXISTS conquer_db.departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(64),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Common Employees Master
CREATE TABLE IF NOT EXISTS conquer_db.employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(64) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(64),
    department VARCHAR(128) DEFAULT 'Supply Chain',
    department_id INTEGER REFERENCES conquer_db.departments(id) ON DELETE SET NULL,
    designation VARCHAR(128) DEFAULT 'Operations Executive',
    branch_id VARCHAR(64) REFERENCES conquer_db.branches(id) ON DELETE SET NULL,
    branch_name VARCHAR(255) DEFAULT 'Head Office',
    manager_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    crm_access BOOLEAN DEFAULT TRUE NOT NULL,
    erp_access BOOLEAN DEFAULT FALSE NOT NULL,
    admin_access BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- CRM Users Authentication Table (Strictly Separate for CRM Login)
CREATE TABLE IF NOT EXISTS conquer_db.crm_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL,
    employee_id INTEGER UNIQUE REFERENCES conquer_db.employees(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    branch VARCHAR(128),
    branch_id INTEGER,
    manager_id INTEGER,
    region VARCHAR(128),
    region_id INTEGER,
    status VARCHAR(64) DEFAULT 'Active' NOT NULL,
    pre_sales_number VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ERP Users Authentication Table (Strictly Separate for ERP Login)
CREATE TABLE IF NOT EXISTS conquer_db.erp_users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) REFERENCES conquer_db.branches(id) ON DELETE SET NULL,
    employee_id INTEGER UNIQUE REFERENCES conquer_db.employees(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
    branch_name VARCHAR(255) DEFAULT 'Head Office' NOT NULL,
    address TEXT,
    phone VARCHAR(64),
    customer_type VARCHAR(64) DEFAULT 'STANDARD' NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    current_login_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Shared Customers Table
CREATE TABLE IF NOT EXISTS conquer_db.customers (
    id SERIAL PRIMARY KEY,
    uuid_id VARCHAR(64) UNIQUE,
    name VARCHAR(255) NOT NULL,
    company_legal_name VARCHAR(255),
    trade_name VARCHAR(255),
    customer_code VARCHAR(64),
    gst_number VARCHAR(64),
    email VARCHAR(255),
    phone VARCHAR(64),
    billing_street TEXT DEFAULT '' NOT NULL,
    billing_city VARCHAR(128) DEFAULT '' NOT NULL,
    billing_state VARCHAR(128) DEFAULT '' NOT NULL,
    billing_zip VARCHAR(64) DEFAULT '' NOT NULL,
    billing_district VARCHAR(128),
    shipping_street TEXT DEFAULT '' NOT NULL,
    shipping_city VARCHAR(128) DEFAULT '' NOT NULL,
    shipping_state VARCHAR(128) DEFAULT '' NOT NULL,
    shipping_zip VARCHAR(64) DEFAULT '' NOT NULL,
    shipping_district VARCHAR(128),
    credit_days INTEGER DEFAULT 30,
    customer_type VARCHAR(64) DEFAULT 'Corporate',
    industry VARCHAR(128) DEFAULT 'Technology',
    priority VARCHAR(64) DEFAULT 'Medium',
    status VARCHAR(64) DEFAULT 'Active',
    tags TEXT,
    territory VARCHAR(128) DEFAULT 'West',
    branch_id VARCHAR(64) REFERENCES conquer_db.branches(id) ON DELETE SET NULL,
    region_id INTEGER,
    sales_executive_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Business Units
CREATE TABLE IF NOT EXISTS conquer_db.business_units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(64),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- OEMs (Original Equipment Manufacturers)
CREATE TABLE IF NOT EXISTS conquer_db.oems (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(64),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Categories
CREATE TABLE IF NOT EXISTS conquer_db.categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Shared Products
CREATE TABLE IF NOT EXISTS conquer_db.products (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(128) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(64) REFERENCES conquer_db.categories(id) ON DELETE RESTRICT,
    brand VARCHAR(128) NOT NULL,
    serial_tracking BOOLEAN DEFAULT FALSE NOT NULL,
    barcode VARCHAR(128),
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    selling_price NUMERIC(12, 2) DEFAULT 0.00,
    market_price NUMERIC(12, 2) DEFAULT 0.00,
    tax_percent NUMERIC(5, 2) DEFAULT 18.00,
    warranty_months INTEGER DEFAULT 12,
    reorder_level INTEGER DEFAULT 10 NOT NULL,
    safety_stock INTEGER DEFAULT 5 NOT NULL,
    status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Shared Inventory
CREATE TABLE IF NOT EXISTS conquer_db.inventory (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES conquer_db.products(id) ON DELETE CASCADE,
    branch_id VARCHAR(64) NOT NULL REFERENCES conquer_db.branches(id) ON DELETE CASCADE,
    business_unit_id INTEGER REFERENCES conquer_db.business_units(id) ON DELETE SET NULL,
    warehouse_id VARCHAR(64) DEFAULT 'WH-MAIN',
    sku VARCHAR(128) NOT NULL,
    branch_code VARCHAR(64) NOT NULL,
    item_name VARCHAR(255) DEFAULT '' NOT NULL,
    available_stock INTEGER DEFAULT 0 NOT NULL,
    reserved_stock INTEGER DEFAULT 0 NOT NULL,
    allocated_stock INTEGER DEFAULT 0 NOT NULL,
    damaged_stock INTEGER DEFAULT 0 NOT NULL,
    returned_qty INTEGER DEFAULT 0 NOT NULL,
    transit_qty INTEGER DEFAULT 0 NOT NULL,
    incoming_qty INTEGER DEFAULT 0 NOT NULL,
    outgoing_qty INTEGER DEFAULT 0 NOT NULL,
    dead_qty INTEGER DEFAULT 0 NOT NULL,
    reorder_level INTEGER DEFAULT 8 NOT NULL,
    min_stock INTEGER DEFAULT 5 NOT NULL,
    max_stock INTEGER DEFAULT 200 NOT NULL,
    warehouse_zone VARCHAR(64) DEFAULT 'A1' NOT NULL,
    ageing_days INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Inventory Movement Audit Log
CREATE TABLE IF NOT EXISTS conquer_db.inventory_movements (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) REFERENCES conquer_db.products(id) ON DELETE CASCADE,
    sku VARCHAR(128) NOT NULL,
    branch_code VARCHAR(64) NOT NULL,
    type VARCHAR(64) NOT NULL,
    quantity INTEGER NOT NULL,
    details TEXT,
    user_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Serial / Batch Inventory Allocation
CREATE TABLE IF NOT EXISTS conquer_db.inventory_allocation (
    id VARCHAR(64) PRIMARY KEY,
    inventory_id VARCHAR(64) REFERENCES conquer_db.inventory(id) ON DELETE CASCADE,
    reservation_id VARCHAR(64),
    po_id VARCHAR(64),
    serial_number VARCHAR(128),
    batch_number VARCHAR(128),
    allocated_qty INTEGER DEFAULT 1 NOT NULL,
    status VARCHAR(64) DEFAULT 'ALLOCATED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2. CRM WORKFLOW TABLES (Leads, Quotations, Opportunities)
-- ----------------------------------------------------------------------------

-- Leads Table
CREATE TABLE IF NOT EXISTS conquer_db.leads (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    company VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    status VARCHAR(64) DEFAULT 'NEW' NOT NULL,
    assigned_to_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    created_by_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES conquer_db.customers(id) ON DELETE SET NULL,
    value NUMERIC(12, 2) DEFAULT 0.00,
    customer_requirements TEXT,
    gst_number VARCHAR(64) DEFAULT '',
    lead_type VARCHAR(64) DEFAULT 'SMB',
    lead_reference VARCHAR(128),
    source VARCHAR(128) DEFAULT 'Website',
    bant_authority BOOLEAN DEFAULT FALSE NOT NULL,
    bant_budget BOOLEAN DEFAULT FALSE NOT NULL,
    bant_need BOOLEAN DEFAULT FALSE NOT NULL,
    bant_timeline BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Quotations Table
CREATE TABLE IF NOT EXISTS conquer_db.quotations (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES conquer_db.leads(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES conquer_db.customers(id) ON DELETE SET NULL,
    opportunity_id INTEGER,
    quote_number VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(64) DEFAULT 'DRAFT' NOT NULL,
    version_number INTEGER DEFAULT 1,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    total_tax NUMERIC(12, 2) DEFAULT 0.00,
    total_discount NUMERIC(12, 2) DEFAULT 0.00,
    rounded_total NUMERIC(12, 2) DEFAULT 0.00,
    sales_executive_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    created_by_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Quotation Items
CREATE TABLE IF NOT EXISTS conquer_db.quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES conquer_db.quotations(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES conquer_db.products(id) ON DELETE SET NULL,
    sku VARCHAR(128),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    tax_percent NUMERIC(5, 2) DEFAULT 18.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL,
    uom VARCHAR(32) DEFAULT 'PCS'
);

-- ----------------------------------------------------------------------------
-- 3. PURCHASE ORDER & WORKFLOW TABLES
-- ----------------------------------------------------------------------------

-- Preserved and Extended Purchase Orders Table
CREATE TABLE IF NOT EXISTS conquer_db.purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(128) NOT NULL UNIQUE,
    customer_id INTEGER REFERENCES conquer_db.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    company_name VARCHAR(255) DEFAULT '',
    quotation_id INTEGER REFERENCES conquer_db.quotations(id) ON DELETE SET NULL,
    lead_id INTEGER REFERENCES conquer_db.leads(id) ON DELETE SET NULL,
    vendor_id VARCHAR(64),
    branch_id VARCHAR(64) REFERENCES conquer_db.branches(id) ON DELETE SET NULL,
    branch_code VARCHAR(64) DEFAULT 'HYD-HQ',
    business_unit_id INTEGER REFERENCES conquer_db.business_units(id) ON DELETE SET NULL,
    warehouse_id VARCHAR(64) DEFAULT 'WH-MAIN',
    assigned_sales_employee_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    assigned_operations_employee_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    assigned_manager_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_items INTEGER DEFAULT 1,
    date_received TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expected_delivery TIMESTAMP WITH TIME ZONE,
    stock_status VARCHAR(64) DEFAULT 'Checking',
    verification_status VARCHAR(64) DEFAULT 'Pending',
    verified_by INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    verified_date TIMESTAMP WITH TIME ZONE,
    file_path TEXT,
    items_json TEXT DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- PO Items
CREATE TABLE IF NOT EXISTS conquer_db.purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES conquer_db.purchase_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES conquer_db.products(id) ON DELETE SET NULL,
    sku VARCHAR(128) NOT NULL,
    product_name VARCHAR(255) DEFAULT '',
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    item_status VARCHAR(64) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- PO Attachments
CREATE TABLE IF NOT EXISTS conquer_db.purchase_order_attachments (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES conquer_db.purchase_orders(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- PO Status History
CREATE TABLE IF NOT EXISTS conquer_db.purchase_order_status_history (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES conquer_db.purchase_orders(id) ON DELETE CASCADE,
    stage VARCHAR(128) NOT NULL,
    changed_by INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    remarks TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Workflow Engine Table (po_workflow)
CREATE TABLE IF NOT EXISTS conquer_db.po_workflow (
    id VARCHAR(64) PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES conquer_db.purchase_orders(id) ON DELETE CASCADE,
    current_stage VARCHAR(128) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    previous_stage VARCHAR(128),
    next_stage VARCHAR(128),
    assigned_to INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    assigned_by INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    remarks TEXT,
    escalation_level INTEGER DEFAULT 1 NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- PO Assignments Table
CREATE TABLE IF NOT EXISTS conquer_db.po_assignments (
    id VARCHAR(64) PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES conquer_db.purchase_orders(id) ON DELETE CASCADE,
    assigned_to INTEGER NOT NULL REFERENCES conquer_db.employees(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    assignment_role VARCHAR(64) DEFAULT 'OPERATIONS_EXECUTIVE',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes TEXT
);

-- ----------------------------------------------------------------------------
-- 4. STOCK RESERVATIONS & DISPATCHES
-- ----------------------------------------------------------------------------

-- Stock Reservations Table
CREATE TABLE IF NOT EXISTS conquer_db.reservations (
    id VARCHAR(64) PRIMARY KEY,
    reservation_number VARCHAR(128) NOT NULL UNIQUE,
    po_id INTEGER REFERENCES conquer_db.purchase_orders(id) ON DELETE SET NULL,
    customer_id INTEGER NOT NULL REFERENCES conquer_db.customers(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    reservation_owner_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    product_id VARCHAR(64) REFERENCES conquer_db.products(id) ON DELETE SET NULL,
    sku VARCHAR(128),
    branch_id VARCHAR(64) REFERENCES conquer_db.branches(id) ON DELETE SET NULL,
    branch_code VARCHAR(64) DEFAULT 'HYD-HQ' NOT NULL,
    business_unit_id INTEGER REFERENCES conquer_db.business_units(id) ON DELETE SET NULL,
    warehouse_id VARCHAR(64) DEFAULT 'WH-MAIN',
    quantity INTEGER DEFAULT 1,
    status VARCHAR(64) DEFAULT 'PENDING' NOT NULL,
    notes TEXT,
    project VARCHAR(255) DEFAULT 'Default Project',
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    processing_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Reservation History Table
CREATE TABLE IF NOT EXISTS conquer_db.reservation_history (
    id VARCHAR(64) PRIMARY KEY,
    reservation_id VARCHAR(64) NOT NULL REFERENCES conquer_db.reservations(id) ON DELETE CASCADE,
    status VARCHAR(64) NOT NULL,
    changed_by INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Expanded Opportunities Model
CREATE TABLE IF NOT EXISTS conquer_db.opportunities (
    id SERIAL PRIMARY KEY,
    opportunity_number VARCHAR(128) UNIQUE,
    title VARCHAR(255) NOT NULL,
    lead_id INTEGER REFERENCES conquer_db.leads(id) ON DELETE SET NULL,
    quotation_id INTEGER REFERENCES conquer_db.quotations(id) ON DELETE SET NULL,
    purchase_order_id INTEGER REFERENCES conquer_db.purchase_orders(id) ON DELETE SET NULL,
    reservation_id VARCHAR(64) REFERENCES conquer_db.reservations(id) ON DELETE SET NULL,
    customer_id INTEGER NOT NULL REFERENCES conquer_db.customers(id) ON DELETE CASCADE,
    assigned_sales_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    assigned_operations_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    branch_id VARCHAR(64) REFERENCES conquer_db.branches(id) ON DELETE SET NULL,
    business_unit_id INTEGER REFERENCES conquer_db.business_units(id) ON DELETE SET NULL,
    warehouse_id VARCHAR(64) DEFAULT 'WH-MAIN',
    current_stage VARCHAR(64) DEFAULT 'QUALIFY' NOT NULL,
    status VARCHAR(64) DEFAULT 'OPEN' NOT NULL,
    expected_dispatch_date TIMESTAMP WITH TIME ZONE,
    reserved_stock INTEGER DEFAULT 0,
    expected_revenue NUMERIC(12, 2) DEFAULT 0.00,
    actual_revenue NUMERIC(12, 2) DEFAULT 0.00,
    probability INTEGER DEFAULT 20 NOT NULL,
    lost_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Dispatches Table
CREATE TABLE IF NOT EXISTS conquer_db.dispatches (
    id VARCHAR(64) PRIMARY KEY,
    dispatch_number VARCHAR(128) NOT NULL UNIQUE,
    reservation_id VARCHAR(64) REFERENCES conquer_db.reservations(id) ON DELETE SET NULL,
    po_id INTEGER REFERENCES conquer_db.purchase_orders(id) ON DELETE SET NULL,
    dispatched_by_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    processing_owner_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    branch_id VARCHAR(64) REFERENCES conquer_db.branches(id) ON DELETE SET NULL,
    business_unit_id INTEGER REFERENCES conquer_db.business_units(id) ON DELETE SET NULL,
    warehouse_id VARCHAR(64) DEFAULT 'WH-MAIN',
    carrier VARCHAR(128),
    tracking_number VARCHAR(128),
    dispatch_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expected_delivery_date TIMESTAMP WITH TIME ZONE,
    delivered_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(64) DEFAULT 'READY_FOR_DISPATCH' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS conquer_db.invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(128) NOT NULL UNIQUE,
    po_id INTEGER REFERENCES conquer_db.purchase_orders(id) ON DELETE SET NULL,
    reservation_id VARCHAR(64) REFERENCES conquer_db.reservations(id) ON DELETE SET NULL,
    customer_id INTEGER NOT NULL REFERENCES conquer_db.customers(id) ON DELETE CASCADE,
    total_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(64) DEFAULT 'UNPAID' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Payments Table
CREATE TABLE IF NOT EXISTS conquer_db.payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES conquer_db.invoices(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES conquer_db.customers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(64) DEFAULT 'NEFT/RTGS',
    transaction_reference VARCHAR(128),
    status VARCHAR(64) DEFAULT 'COMPLETED',
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- 5. NOTIFICATION, AUDIT & APPROVAL TABLES
-- ----------------------------------------------------------------------------

-- Notification Queue Table
CREATE TABLE IF NOT EXISTS conquer_db.notification_queue (
    id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(128) NOT NULL,
    recipient_role VARCHAR(64),
    recipient_user_id INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    payload_json TEXT DEFAULT '{}',
    is_sent BOOLEAN DEFAULT FALSE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Notifications Display Table
CREATE TABLE IF NOT EXISTS conquer_db.notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Approval History Table
CREATE TABLE IF NOT EXISTS conquer_db.approval_history (
    id VARCHAR(64) PRIMARY KEY,
    po_id INTEGER REFERENCES conquer_db.purchase_orders(id) ON DELETE CASCADE,
    approver_id INTEGER NOT NULL REFERENCES conquer_db.employees(id) ON DELETE CASCADE,
    approval_level INTEGER NOT NULL,
    decision VARCHAR(64) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Workflow History Audit Table
CREATE TABLE IF NOT EXISTS conquer_db.workflow_history (
    id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) REFERENCES conquer_db.po_workflow(id) ON DELETE CASCADE,
    stage_from VARCHAR(128),
    stage_to VARCHAR(128) NOT NULL,
    changed_by INTEGER REFERENCES conquer_db.employees(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS conquer_db.audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(128) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    details TEXT,
    ip_address VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- 6. INDEXES FOR HIGH-PERFORMANCE QUERYING & SEARCH
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_employees_email ON conquer_db.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON conquer_db.employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON conquer_db.employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_crm_users_email ON conquer_db.crm_users(email);
CREATE INDEX IF NOT EXISTS idx_erp_users_email ON conquer_db.erp_users(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON conquer_db.customers(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON conquer_db.products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_product_branch ON conquer_db.inventory(product_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON conquer_db.purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_customer ON conquer_db.purchase_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON conquer_db.purchase_orders(verification_status, stock_status);
CREATE INDEX IF NOT EXISTS idx_po_workflow_po ON conquer_db.po_workflow(po_id);
CREATE INDEX IF NOT EXISTS idx_po_workflow_stage ON conquer_db.po_workflow(current_stage);
CREATE INDEX IF NOT EXISTS idx_reservations_number ON conquer_db.reservations(reservation_number);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON conquer_db.reservations(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_po ON conquer_db.opportunities(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_reservation ON conquer_db.opportunities(reservation_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON conquer_db.dispatches(status);

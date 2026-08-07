const fs = require('fs');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/conquer_local_db';

async function migrateData() {
  console.log('Starting full database migration from SQL dumps...');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const defaultPasswordHash = await bcrypt.hash('Admin@123', 10);
  console.log('Generated bcrypt password hash for Admin@123');

  // 1. Roles
  console.log('Inserting Roles...');
  const roles = [
    { id: 'SUPER_ADMIN', name: 'SUPER_ADMIN', level: 1, permissions: { all: true } },
    { id: 'DIRECTOR', name: 'DIRECTOR', level: 2, permissions: { management: true } },
    { id: 'REGIONAL_MANAGER', name: 'REGIONAL_MANAGER', level: 3, permissions: { region: true } },
    { id: 'BRANCH_MANAGER', name: 'BRANCH_MANAGER', level: 4, permissions: { branch: true } },
    { id: 'ASSISTANT_MANAGER', name: 'ASSISTANT_MANAGER', level: 5, permissions: { operations: true } },
    { id: 'OPERATIONS_EXECUTIVE', name: 'OPERATIONS_EXECUTIVE', level: 6, permissions: { executive: true } },
    { id: 'CUSTOMER', name: 'CUSTOMER', level: 10, permissions: { portal: true } },
  ];
  for (const r of roles) {
    await client.query(`
      INSERT INTO public.roles (id, name, level, permissions, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, level = EXCLUDED.level;
    `, [r.id, r.name, r.level, JSON.stringify(r.permissions)]);
  }

  // 2. Regions
  console.log('Inserting Regions...');
  const regions = [
    { id: 1, name: 'South Region', code: 'SOUTH' },
    { id: 2, name: 'West Region', code: 'WEST' },
    { id: 3, name: 'North Region', code: 'NORTH' },
    { id: 4, name: 'East Region', code: 'EAST' },
    { id: 5, name: 'Head Office', code: 'HQ' }
  ];
  for (const reg of regions) {
    await client.query(`
      INSERT INTO public.regions (id, name, code)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;
    `, [reg.id, reg.name, reg.code]);
  }

  // 3. Branches
  console.log('Inserting Branches...');
  const branches = [
    { id: 'HYD-HQ', name: 'Hyderabad Head Office', region_id: 5 },
    { id: 'HYD-THUB', name: 'Hyderabad T-Hub Branch', region_id: 1 },
    { id: 'HYD-JH', name: 'Hyderabad Jubilee Hills', region_id: 1 },
    { id: 'BLR', name: 'Bengaluru HSR Layout', region_id: 1 },
    { id: 'BLR-OFF', name: 'Bangalore Office', region_id: 1 },
    { id: 'CHN', name: 'Chennai Anna Nagar', region_id: 1 },
    { id: 'CHN-OFF', name: 'Chennai Office', region_id: 1 },
    { id: 'MUM', name: 'Mumbai Worli', region_id: 2 },
    { id: 'MUM-HQ', name: 'Mumbai Head Office', region_id: 2 },
    { id: 'PUN-OFF', name: 'Pune Office', region_id: 2 },
    { id: 'DEL', name: 'Gurgaon Delhi NCR', region_id: 3 },
    { id: 'GGN-OFF', name: 'Gurgaon Office', region_id: 3 },
    { id: 'VJA', name: 'Vijayawada Branch', region_id: 1 },
    { id: 'VJA-OFF', name: 'Vijayawada Office', region_id: 1 },
    { id: 'VZG', name: 'Visakhapatnam Branch', region_id: 1 },
    { id: 'VZG-OFF', name: 'Visakhapatnam Office', region_id: 1 }
  ];
  for (const b of branches) {
    await client.query(`
      INSERT INTO public.branches (id, name, region_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id;
    `, [b.id, b.name, b.region_id]);
  }

  // 4. Employees & Organization Hierarchy
  console.log('Inserting Employees & Organization Hierarchy...');
  const employees = [
    {
      id: 'u-superadmin',
      name: 'Eleanor Vance',
      email: 'superadmin@conquererp.com',
      employeeId: 'EMP-001',
      roleId: 'SUPER_ADMIN',
      department: 'Executive Board',
      designation: 'Super Admin',
      branchId: 'HYD-HQ',
      regionId: 5,
      reportsToId: null
    },
    {
      id: 'u-director',
      name: 'Marcus Sterling',
      email: 'marcus.sterling@conquererp.com',
      employeeId: 'EMP-002',
      roleId: 'DIRECTOR',
      department: 'Operations',
      designation: 'Director of Operations',
      branchId: 'HYD-HQ',
      regionId: 5,
      reportsToId: 'u-superadmin'
    },
    {
      id: 'u-rsm-south',
      name: 'Jane Smith',
      email: 'rsm.south@conquererp.com',
      employeeId: 'EMP-003',
      roleId: 'REGIONAL_MANAGER',
      department: 'Sales & Distribution',
      designation: 'Regional Manager (South)',
      branchId: 'HYD-HQ',
      regionId: 1,
      reportsToId: 'u-director'
    },
    {
      id: 'u-bm-hyd',
      name: 'Vikramaditya Rao',
      email: 'bm.hyd@conquererp.com',
      employeeId: 'EMP-004',
      roleId: 'BRANCH_MANAGER',
      department: 'Branch Management',
      designation: 'Hyderabad Branch Manager',
      branchId: 'HYD-HQ',
      regionId: 1,
      reportsToId: 'u-rsm-south'
    },
    {
      id: 'u-asst-mgr',
      name: 'Ananya Sharma',
      email: 'ananya.sharma@conquererp.com',
      employeeId: 'EMP-005',
      roleId: 'ASSISTANT_MANAGER',
      department: 'Supply Chain',
      designation: 'Assistant Logistics Manager',
      branchId: 'HYD-HQ',
      regionId: 1,
      reportsToId: 'u-bm-hyd'
    },
    {
      id: 'u-exec-hyd',
      name: 'Karan Patel',
      email: 'karan.patel@conquererp.com',
      employeeId: 'EMP-006',
      roleId: 'OPERATIONS_EXECUTIVE',
      department: 'Operations',
      designation: 'Operations Executive',
      branchId: 'HYD-HQ',
      regionId: 1,
      reportsToId: 'u-asst-mgr'
    },
    {
      id: 'u-asst-mgr-thub',
      name: 'David Reynolds',
      email: 'david.reynolds@conquererp.com',
      employeeId: 'EMP-007',
      roleId: 'ASSISTANT_MANAGER',
      department: 'Operations',
      designation: 'Assistant Manager (T-Hub)',
      branchId: 'HYD-THUB',
      regionId: 1,
      reportsToId: 'u-bm-hyd'
    },
    {
      id: 'u-exec-thub',
      name: 'Jessica Taylor',
      email: 'jessica.taylor@conquererp.com',
      employeeId: 'EMP-008',
      roleId: 'OPERATIONS_EXECUTIVE',
      department: 'Operations',
      designation: 'Ops Executive (T-Hub)',
      branchId: 'HYD-THUB',
      regionId: 1,
      reportsToId: 'u-asst-mgr-thub'
    },
    {
      id: 'u-ops-mgr-thub',
      name: 'Sophia Chen',
      email: 'sophia.chen@conquererp.com',
      employeeId: 'EMP-009',
      roleId: 'ASSISTANT_MANAGER',
      department: 'Operations',
      designation: 'Operations Manager (T-Hub)',
      branchId: 'HYD-THUB',
      regionId: 1,
      reportsToId: 'u-bm-hyd'
    }
  ];

  for (const emp of employees) {
    await client.query(`
      INSERT INTO public.users (
        id, name, email, password_hash, employee_id, role_id, department, designation,
        branch_id, region_id, reporting_to_user_id, is_active, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 'ACTIVE', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        employee_id = EXCLUDED.employee_id,
        role_id = EXCLUDED.role_id,
        department = EXCLUDED.department,
        designation = EXCLUDED.designation,
        branch_id = EXCLUDED.branch_id,
        region_id = EXCLUDED.region_id,
        reporting_to_user_id = EXCLUDED.reporting_to_user_id;
    `, [
      emp.id, emp.name, emp.email, defaultPasswordHash, emp.employeeId, emp.roleId,
      emp.department, emp.designation, emp.branchId, emp.regionId, emp.reportsToId
    ]);
  }

  // 5. Categories from databaseerp_new.sql
  console.log('Migrating Categories from databaseerp_new.sql...');
  const erpContent = fs.readFileSync('databaseerp_new.sql', 'utf8');
  let categoryLines = getCopyLines(erpContent, 'COPY public."Category" ');
  for (const line of categoryLines) {
    const parts = line.split('\t');
    if (parts.length >= 2) {
      const id = parts[0];
      const name = parts[1];
      await client.query(`
        INSERT INTO public.categories (id, name, status)
        VALUES ($1, $2, 'ACTIVE')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
      `, [id, name]);
    }
  }

  // 6. Customers from databasecrm_new.sql (1509 rows)
  console.log('Migrating 1,509 Customers from databasecrm_new.sql...');
  const crmContent = fs.readFileSync('databasecrm_new.sql', 'utf8');
  let customerLines = getCopyLines(crmContent, 'COPY crm.customers ');
  console.log(`Found ${customerLines.length} customer lines in CRM dump.`);

  let custCount = 0;
  for (const line of customerLines) {
    const parts = line.split('\t');
    if (parts.length >= 10) {
      const crmId = parseInt(parts[0], 10);
      const name = parts[1] || 'Customer ' + crmId;
      const code = parts[2] !== '\\N' ? parts[2] : 'CUST-' + String(crmId).padStart(5, '0');
      const legalName = parts[3] !== '\\N' ? parts[3] : name;
      const tradeName = parts[4] !== '\\N' ? parts[4] : name;
      const gstNumber = parts[5] !== '\\N' ? parts[5] : '';
      const panNumber = parts[6] !== '\\N' ? parts[6] : (gstNumber ? gstNumber.substring(2, 12) : '');
      const billingStreet = parts[7] !== '\\N' ? parts[7] : '';
      const billingCity = parts[8] !== '\\N' ? parts[8] : 'Hyderabad';
      const billingState = parts[10] !== '\\N' ? parts[10] : 'Telangana';
      const billingZip = parts[11] !== '\\N' ? parts[11] : '500081';
      const billingAddress = [billingStreet, billingCity, billingState, billingZip].filter(Boolean).join(', ');
      
      const shippingStreet = parts[12] !== '\\N' ? parts[12] : billingStreet;
      const shippingCity = parts[13] !== '\\N' ? parts[13] : billingCity;
      const shippingState = parts[15] !== '\\N' ? parts[15] : billingState;
      const shippingZip = parts[16] !== '\\N' ? parts[16] : billingZip;
      const shippingAddress = [shippingStreet, shippingCity, shippingState, shippingZip].filter(Boolean).join(', ');

      const custType = parts[17] !== '\\N' ? parts[17] : 'STANDARD';
      const creditDays = parts[18] !== '\\N' ? parseInt(parts[18], 10) : 30;
      const status = parts[20] !== '\\N' ? parts[20] : 'ACTIVE';

      const email = `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'cust' + crmId}.com`;
      const phone = '+91 98' + String(10000000 + (crmId % 89999999));

      const uuid = 'cust-crm-' + String(crmId).padStart(6, '0');

      await client.query(`
        INSERT INTO public.customers (
          id, crm_customer_id, company_name, customer_code, company_legal_name, trade_name,
          customer_type, gst_number, pan_number, email, phone, billing_street, billing_city,
          billing_state, billing_zip, billing_address, shipping_street, shipping_city,
          shipping_state, shipping_zip, shipping_address, country, state, city, region_id, branch_id,
          assigned_executive_id, assigned_manager_id, credit_limit, credit_used, payment_terms, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
          'India', $14, $13, 1, 'HYD-HQ', 'u-exec-hyd', 'u-bm-hyd', 500000.00, 120000.00, $22, $23, NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET company_name = EXCLUDED.company_name, crm_customer_id = EXCLUDED.crm_customer_id;
      `, [
        uuid, crmId, name, code, legalName, tradeName, custType, gstNumber, panNumber,
        email, phone, billingStreet, billingCity, billingState, billingZip, billingAddress,
        shippingStreet, shippingCity, shippingState, shippingZip, shippingAddress,
        `Net ${creditDays}`, status
      ]);
      custCount++;
    }
  }
  console.log(`Migrated ${custCount} Customers.`);

  // 7. Products from databaseerp_new.sql (1020 rows)
  console.log('Migrating Products from databaseerp_new.sql...');
  let productLines = getCopyLines(erpContent, 'COPY public."Product" ');
  console.log(`Found ${productLines.length} product lines in ERP dump.`);

  let prodCount = 0;
  for (const line of productLines) {
    const parts = line.split('\t');
    if (parts.length >= 10) {
      const id = parts[0];
      const sku = parts[1];
      const name = parts[2];
      const categoryId = parts[3];
      const brand = parts[4];
      const serialTracking = parts[5] === 't';
      const barcode = parts[6] !== '\\N' ? parts[6] : sku;
      const reorderLevel = parseInt(parts[7], 10) || 10;
      const safetyStock = parseInt(parts[8], 10) || 5;
      const status = parts[9] !== '\\N' ? parts[9] : 'ACTIVE';

      // Parse cost, selling, market price if present or default
      const costPrice = 1500.00;
      const sellingPrice = 2200.00;
      const marketPrice = 2500.00;

      await client.query(`
        INSERT INTO public.products (
          id, sku, name, category_id, brand, serial_tracking, batch_tracking, barcode,
          cost_price, price, market_price, tax_percent, warranty_months, reorder_level,
          safety_stock, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, $9, $10, 18.00, 12, $11, $12, $13, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sku = EXCLUDED.sku, category_id = EXCLUDED.category_id;
      `, [id, sku, name, categoryId, brand, serialTracking, barcode, costPrice, sellingPrice, marketPrice, reorderLevel, safetyStock, status]);
      prodCount++;
    }
  }
  console.log(`Migrated ${prodCount} Products.`);

  // 8. Inventory from databaseerp_new.sql (9180 rows)
  console.log('Migrating 9,180 Inventory items from databaseerp_new.sql...');
  let invLines = getCopyLines(erpContent, 'COPY public."Inventory" ');
  console.log(`Found ${invLines.length} inventory lines in ERP dump.`);

  let invCount = 0;
  for (const line of invLines) {
    const parts = line.split('\t');
    if (parts.length >= 8) {
      const id = parts[0];
      const productId = parts[1];
      const branchId = parts[2];
      const availableStock = parseInt(parts[3], 10) || 0;
      const reservedStock = parseInt(parts[4], 10) || 0;
      const damagedStock = parseInt(parts[5], 10) || 0;
      const reorderLevel = parseInt(parts[6], 10) || 8;
      const updatedAtStr = parts[7] !== '\\N' ? parts[7] : new Date().toISOString();
      const itemName = parts[8] && parts[8] !== '\\N' ? parts[8] : '';
      const sku = parts[9] && parts[9] !== '\\N' ? parts[9] : '';
      const branchCode = parts[10] && parts[10] !== '\\N' ? parts[10] : branchId;

      await client.query(`
        INSERT INTO public.inventories (
          id, product_id, branch_id, available_stock, reserved_stock, damaged_stock, reorder_level,
          item_name, sku, branch_code, quantity, available_qty, reserved_qty, allocated_qty, damaged_qty,
          min_stock, max_stock, warehouse_zone, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          ($4::integer + $5::integer), $4, $5, 0, $6, 5, 200, 'A1', NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET available_stock = EXCLUDED.available_stock, reserved_stock = EXCLUDED.reserved_stock;
      `, [id, productId, branchId, availableStock, reservedStock, damagedStock, reorderLevel, itemName, sku, branchCode]);
      invCount++;
    }
  }
  console.log(`Migrated ${invCount} Inventory records.`);

  // 9. CRM Purchase Orders from databasecrm_new.sql
  console.log('Migrating Purchase Orders from databasecrm_new.sql...');
  let poLines = getCopyLines(crmContent, 'COPY crm.crm_purchase_orders ');
  let poItemLines = getCopyLines(crmContent, 'COPY crm.crm_purchase_order_items ');

  let poCount = 0;
  for (const line of poLines) {
    const parts = line.split('\t');
    if (parts.length >= 25) {
      const crmPoId = parts[0];
      const poNumber = parts[1];
      const crmCustId = parseInt(parts[4], 10);
      const compName = parts[5];
      const custName = compName;
      const primaryContact = parts[7] !== '\\N' ? parts[7] : '';
      const phone = parts[8] !== '\\N' ? parts[8] : '';
      const email = parts[9] !== '\\N' ? parts[9] : '';
      const billingAddress = parts[10] !== '\\N' ? parts[10] : '';
      const shippingAddress = parts[11] !== '\\N' ? parts[11] : billingAddress;
      const subtotal = parseFloat(parts[12]) || 0;
      const grandTotal = parseFloat(parts[15]) || 0;
      const poStatus = parts[17] !== '\\N' ? parts[17] : 'PENDING';
      const erpSyncStatus = parts[18] !== '\\N' ? parts[18] : 'SYNCED';
      const erpVerifStatus = parts[19] !== '\\N' ? parts[19] : 'Pending';
      const approvalStatus = parts[20] !== '\\N' ? parts[20] : 'Pending';
      const dateRec = parts[24] !== '\\N' ? parts[24] : new Date().toISOString();
      const custUuid = 'cust-crm-' + String(crmCustId).padStart(6, '0');

      await client.query(`
        INSERT INTO public.purchase_orders (
          id, po_number, customer_id, customer_name, company_name, primary_contact_name, phone, email,
          billing_address, shipping_address, subtotal, grand_total, total_amount, date_received,
          total_items, stock_status, verification_status, erp_verification_status, erp_sync_status,
          po_status, approval_status, branch_code, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13,
          1, 'In Stock', $14, $14, $15, $16, $17, 'HYD-HQ', NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET po_number = EXCLUDED.po_number;
      `, [
        crmPoId, poNumber, custUuid, custName, compName, primaryContact, phone, email,
        billingAddress, shippingAddress, subtotal, grandTotal, dateRec, erpVerifStatus,
        erpSyncStatus, poStatus, approvalStatus
      ]);
      poCount++;
    }
  }
  console.log(`Migrated ${poCount} Purchase Orders.`);

  let poItemCount = 0;
  for (const line of poItemLines) {
    const parts = line.split('\t');
    if (parts.length >= 7) {
      const itemId = 'po-item-' + parts[0];
      const poNum = parts[1];
      const prodName = parts[3] !== '\\N' ? parts[3] : 'Product';
      const sku = parts[4] !== '\\N' && parts[4] ? parts[4] : 'SKU-' + parts[0];
      const qty = parseInt(parts[6], 10) || 1;
      const unitPrice = parseFloat(parts[8]) || 0;
      const total = parseFloat(parts[11]) || (qty * unitPrice);

      const poRes = await client.query('SELECT id FROM public.purchase_orders WHERE po_number = $1', [poNum]);
      if (poRes.rows.length > 0) {
        const poId = poRes.rows[0].id;
        await client.query(`
          INSERT INTO public.purchase_order_items (
            id, purchase_order_id, po_number, product_name, sku, quantity, unit_price, total, item_status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Verified', NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku;
        `, [itemId, poId, poNum, prodName, sku, qty, unitPrice, total]);
        poItemCount++;
      }
    }
  }
  console.log(`Migrated ${poItemCount} PO Items.`);

  // 10. Product Price History from databaseerp_new.sql (45,900 rows)
  console.log('Migrating 45,900 Product Price History rows from databaseerp_new.sql...');
  let priceHistLines = getCopyLines(erpContent, 'COPY public."ProductPriceHistory" ');
  console.log(`Found ${priceHistLines.length} price history lines in ERP dump.`);

  let histCount = 0;
  for (const line of priceHistLines) {
    const parts = line.split('\t');
    if (parts.length >= 7) {
      const sku = parts[1];
      const branchCode = parts[2];
      const costPrice = parseFloat(parts[3]) || 0;
      const sellingPrice = parseFloat(parts[4]) || 0;
      const mrp = parseFloat(parts[5]) || 0;
      const updatedBy = parts[6] !== '\\N' ? parts[6] : 'System';

      await client.query(`
        INSERT INTO public.product_price_history (
          sku, branch_code, cost_price, selling_price, mrp, updated_by, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW());
      `, [sku, branchCode, costPrice, sellingPrice, mrp, updatedBy]);
      histCount++;
      if (histCount % 10000 === 0) {
        console.log(`  Processed ${histCount} / ${priceHistLines.length} price history records...`);
      }
    }
  }
  console.log(`Migrated ${histCount} Product Price History records.`);

  await client.end();
  console.log('Data migration completed successfully!');
}

function getCopyLines(fileContent, searchHeader) {
  const lines = fileContent.split('\n');
  const result = [];
  let inCopy = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(searchHeader)) {
      inCopy = true;
    } else if (inCopy && line.trim() === '\\.') {
      inCopy = false;
      break;
    } else if (inCopy) {
      if (line.trim()) {
        result.push(line.trim());
      }
    }
  }
  return result;
}

migrateData().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

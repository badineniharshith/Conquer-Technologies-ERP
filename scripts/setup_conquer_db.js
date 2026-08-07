import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function runConquerDbSetup() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
  console.log('Connecting to PostgreSQL database for Conquer_DB setup...');
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // 1. Execute conquer_db_schema.sql
    console.log('Reading scripts/conquer_db_schema.sql...');
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'scripts', 'conquer_db_schema.sql'), 'utf8');
    console.log('Applying Conquer_DB DDL Schema...');
    await client.query(schemaSql);
    console.log('Conquer_DB DDL Schema created successfully.');

    // 2. Execute sync_triggers.sql
    console.log('Reading scripts/sync_triggers.sql...');
    const triggerSql = fs.readFileSync(path.join(process.cwd(), 'scripts', 'sync_triggers.sql'), 'utf8');
    console.log('Applying Lightweight Triggers...');
    await client.query(triggerSql);
    console.log('Triggers created successfully.');

    // 3. Migrate & De-duplicate Master Branches
    console.log('Migrating Branches into conquer_db.branches...');
    await client.query(`
      INSERT INTO conquer_db.branches (id, name, code, created_at, updated_at)
      SELECT DISTINCT 
        COALESCE(id::text, 'BRANCH-' || gen_random_uuid()::text),
        name,
        COALESCE(name, 'HQ'),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM (
        SELECT id::text as id, name FROM public."Branch"
        UNION
        SELECT id::text as id, name FROM crm.branches
      ) b
      ON CONFLICT (name) DO UPDATE SET updated_at = EXCLUDED.updated_at;
    `).catch(err => console.log('Branch Migration Notice:', err.message));

    // 4. Build Employee Master and Populate crm_users & erp_users
    console.log('Building Central Employees Master and Auth Tables...');
    await client.query(`
      -- Insert CRM Users into employees & crm_users
      DO $$
      DECLARE
        r RECORD;
        emp_id INTEGER;
        is_ops BOOLEAN;
        is_admin BOOLEAN;
      BEGIN
        FOR r IN SELECT * FROM crm.users LOOP
          is_admin := (r."roleId" = 1);
          is_ops := (LOWER(COALESCE(r.branch, '')) LIKE '%ops%' OR LOWER(COALESCE(r."fullName", '')) LIKE '%ops%');

          INSERT INTO conquer_db.employees (
            full_name, email, phone, department, designation, branch_name, crm_access, erp_access, admin_access, is_active, created_at, updated_at
          ) VALUES (
            r."fullName", r.email, 'N/A', 
            CASE WHEN is_ops THEN 'Operations' ELSE 'Sales' END,
            CASE WHEN is_ops THEN 'Operations Executive' ELSE 'Sales Executive' END,
            COALESCE(r.branch, 'Head Office'),
            TRUE,
            (is_ops OR is_admin),
            is_admin,
            r."isActive",
            r."createdAt",
            r."updatedAt"
          )
          ON CONFLICT (email) DO UPDATE SET
            crm_access = TRUE,
            erp_access = EXCLUDED.erp_access OR conquer_db.employees.erp_access,
            admin_access = EXCLUDED.admin_access OR conquer_db.employees.admin_access
          RETURNING id INTO emp_id;

          IF emp_id IS NULL THEN
            SELECT id INTO emp_id FROM conquer_db.employees WHERE email = r.email;
          END IF;

          INSERT INTO conquer_db.crm_users (
            id, email, password_hash, full_name, role_id, employee_id, is_active, branch, status, created_at, updated_at
          ) VALUES (
            r.id, r.email, r."passwordHash", r."fullName", r."roleId", emp_id, r."isActive", r.branch, r.status, r."createdAt", r."updatedAt"
          )
          ON CONFLICT (email) DO UPDATE SET
            employee_id = EXCLUDED.employee_id,
            password_hash = EXCLUDED.password_hash;
        END LOOP;

        -- Insert ERP Users into employees & erp_users
        FOR r IN SELECT * FROM public."User" LOOP
          is_admin := (r."roleId" IN ('SUPER_ADMIN', 'ADMIN'));
          is_ops := (r."roleId" IN ('SUPER_ADMIN', 'ADMIN') OR LOWER(COALESCE(r."roleId", '')) LIKE '%ops%' OR LOWER(COALESCE(r.name, '')) LIKE '%ops%');

          INSERT INTO conquer_db.employees (
            full_name, email, phone, department, designation, branch_name, crm_access, erp_access, admin_access, is_active, created_at, updated_at
          ) VALUES (
            r.name, r.email, r.phone,
            CASE WHEN is_ops THEN 'Operations' ELSE 'Sales' END,
            CASE WHEN is_ops THEN 'Operations Executive' ELSE 'Sales Executive' END,
            COALESCE(r."branchName", 'Head Office'),
            TRUE,
            (is_ops OR is_admin),
            is_admin,
            r."isActive",
            r."createdAt",
            r."updatedAt"
          )
          ON CONFLICT (email) DO UPDATE SET
            erp_access = TRUE,
            admin_access = EXCLUDED.admin_access OR conquer_db.employees.admin_access
          RETURNING id INTO emp_id;

          IF emp_id IS NULL THEN
            SELECT id INTO emp_id FROM conquer_db.employees WHERE email = r.email;
          END IF;

          INSERT INTO conquer_db.erp_users (
            id, name, email, password_hash, role_id, branch_id, employee_id, is_active, status, branch_name, address, phone, customer_type, created_at, updated_at
          ) VALUES (
            r.id, r.name, r.email, r."passwordHash", r."roleId", r."branchId", emp_id, r."isActive", r.status, r."branchName", r.address, r.phone, r."customerType", r."createdAt", r."updatedAt"
          )
          ON CONFLICT (email) DO UPDATE SET
            employee_id = EXCLUDED.employee_id,
            password_hash = EXCLUDED.password_hash;
        END LOOP;
      END $$;
    `);

    // 5. Migrate Shared Categories and Products
    console.log('Migrating Categories into conquer_db.categories...');
    await client.query(`
      INSERT INTO conquer_db.categories (id, name, created_at)
      SELECT DISTINCT 
        id::text, 
        name, 
        CURRENT_TIMESTAMP
      FROM public."Category"
      ON CONFLICT (name) DO NOTHING;
    `).catch(err => console.log('Category Migration Notice:', err.message));

    console.log('Migrating Products into conquer_db.products...');
    await client.query(`
      INSERT INTO conquer_db.products (
        id, sku, name, category_id, brand, serial_tracking, barcode, reorder_level, safety_stock, status, created_at, updated_at
      )
      SELECT 
        p.id::text, p.sku, p.name, p."categoryId"::text, p.brand, p."serialTracking", p.barcode, p."reorderLevel", p."safetyStock", p.status, p."createdAt", p."updatedAt"
      FROM public."Product" p
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        brand = EXCLUDED.brand;
    `).catch(err => console.log('Product Migration Notice:', err.message));

    // 6. Migrate Inventory
    console.log('Migrating Inventory into conquer_db.inventory...');
    await client.query(`
      INSERT INTO conquer_db.inventory (
        id, product_id, branch_id, sku, branch_code, item_name, available_stock, reserved_stock, damaged_stock, reorder_level, created_at, updated_at
      )
      SELECT 
        i.id::text, i."productId"::text, i."branchId"::text, i.sku, i."branchCode", i."itemName", i."availableStock", i."reservedStock", i."damagedStock", i."reorderLevel", i."createdAt", i."updatedAt"
      FROM public."Inventory" i
      ON CONFLICT (id) DO NOTHING;
    `).catch(err => console.log('Inventory Migration Notice:', err.message));

    // 7. Migrate Customers
    console.log('Migrating Customers into conquer_db.customers...');
    await client.query(`
      INSERT INTO conquer_db.customers (
        id, name, company_legal_name, customer_code, gst_number, email, phone, billing_street, billing_city, billing_state, billing_zip, shipping_street, shipping_city, shipping_state, shipping_zip, created_at, updated_at
      )
      SELECT 
        c.id, c.name, c.company_legal_name, c.customer_code, c."gstNumber", 'customer@conquer.com', 'N/A', c."billingStreet", c."billingCity", c."billingState", c."billingZip", c."shippingStreet", c."shippingCity", c."shippingState", c."shippingZip", c."createdAt", c."updatedAt"
      FROM crm.customers c
      ON CONFLICT (id) DO NOTHING;
    `).catch(err => console.log('Customer Migration Notice:', err.message));

    // 8. Migrate Purchase Orders & Seed Workflow Engine
    console.log('Migrating Purchase Orders into conquer_db.purchase_orders...');
    await client.query(`
      INSERT INTO conquer_db.purchase_orders (
        id, po_number, quotation_id, file_path, created_at, updated_at
      )
      SELECT 
        po.id, po."poNumber", po."quotationId", po."filePath", po."createdAt", po."updatedAt"
      FROM crm.purchase_orders po
      ON CONFLICT (po_number) DO NOTHING;
    `).catch(err => console.log('Purchase Order Migration Notice:', err.message));

    // Seed po_workflow records for all purchase orders
    console.log('Seeding po_workflow records...');
    await client.query(`
      INSERT INTO conquer_db.po_workflow (
        id, po_id, current_stage, created_at, updated_at
      )
      SELECT 
        'wf-' || gen_random_uuid()::text,
        po.id,
        'PENDING_VERIFICATION',
        po.created_at,
        po.updated_at
      FROM conquer_db.purchase_orders po
      ON CONFLICT DO NOTHING;
    `);

    // 9. Validation & Metrics Output
    console.log('\n==================================================');
    console.log('CONQUER_DB MIGRATION SUMMARY METRICS');
    console.log('==================================================');

    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM conquer_db.employees'),
      client.query('SELECT COUNT(*) FROM conquer_db.crm_users'),
      client.query('SELECT COUNT(*) FROM conquer_db.erp_users'),
      client.query('SELECT COUNT(*) FROM conquer_db.customers'),
      client.query('SELECT COUNT(*) FROM conquer_db.products'),
      client.query('SELECT COUNT(*) FROM conquer_db.inventory'),
      client.query('SELECT COUNT(*) FROM conquer_db.purchase_orders'),
      client.query('SELECT COUNT(*) FROM conquer_db.po_workflow'),
      client.query('SELECT COUNT(*) FROM conquer_db.branches')
    ]);

    console.log(`- Employees Master Total : ${counts[0].rows[0].count}`);
    console.log(`- CRM Users Total        : ${counts[1].rows[0].count}`);
    console.log(`- ERP Users Total        : ${counts[2].rows[0].count}`);
    console.log(`- Customers Total        : ${counts[3].rows[0].count}`);
    console.log(`- Products Total         : ${counts[4].rows[0].count}`);
    console.log(`- Inventory Total        : ${counts[5].rows[0].count}`);
    console.log(`- Purchase Orders Total  : ${counts[6].rows[0].count}`);
    console.log(`- PO Workflows Total     : ${counts[7].rows[0].count}`);
    console.log(`- Branches Total         : ${counts[8].rows[0].count}`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Error during Conquer_DB setup:', err);
  } finally {
    await client.end();
  }
}

runConquerDbSetup();

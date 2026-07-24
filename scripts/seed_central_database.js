const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

const hashPassword = (plain) => bcrypt.hashSync(plain, 10);
const defaultPasswordHash = hashPassword("Admin@123");

async function main() {
  console.log("🚀 Starting data migration into central_database...");

  const sourceClient = new Client({
    host: dbHost, port: 5432, user, password, database: "conquer_global_db", ssl: { rejectUnauthorized: false }
  });

  const targetClient = new Client({
    host: dbHost, port: 5432, user, password, database: "central_database", ssl: { rejectUnauthorized: false }
  });

  await sourceClient.connect();
  await targetClient.connect();

  console.log("Connected to source (conquer_global_db) and target (central_database).");

  try {
    // 1. BUSINESS UNITS & REGIONS & BRANCHES
    console.log("Seeding Business Units, Regions, and Branches...");
    await targetClient.query(`
      INSERT INTO "public"."business_units" ("id", "name", "code", "description", "status", "updated_at")
      VALUES (1, 'Conquer Enterprise Core', 'CEC', 'Main ERP & CRM Business Unit', 'ACTIVE', CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO NOTHING;
    `);

    await targetClient.query(`
      INSERT INTO "public"."regions" ("id", "name") VALUES
        (1, 'South India Region'),
        (2, 'West India Region'),
        (3, 'North India Region')
      ON CONFLICT ("id") DO NOTHING;
    `);

    const branchesList = [
      { id: 1, name: 'Hyderabad Corporate Office', region_id: 1 },
      { id: 2, name: 'Hyderabad T-Hub Experience Center', region_id: 1 },
      { id: 3, name: 'Hyderabad Jubilee Hills', region_id: 1 },
      { id: 4, name: 'Bengaluru HSR Layout', region_id: 1 },
      { id: 5, name: 'Chennai Anna Nagar', region_id: 1 },
      { id: 6, name: 'Mumbai Worli', region_id: 2 },
      { id: 7, name: 'Gurgaon Delhi NCR', region_id: 3 },
      { id: 8, name: 'Visakhapatnam', region_id: 1 },
      { id: 9, name: 'Vijayawada', region_id: 1 }
    ];

    for (const b of branchesList) {
      await targetClient.query(`
        INSERT INTO "public"."branches" ("id", "name", "region_id")
        VALUES ($1, $2, $3)
        ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";
      `, [b.id, b.name, b.region_id]);
    }

    // 2. ROLES
    console.log("Seeding Roles into central_database...");
    const rolesList = [
      { name: 'SUPER_ADMIN', level: 1, permissions: { all: true } },
      { name: 'DIRECTOR_OPERATIONS', level: 1, permissions: { operations: true, scm: true } },
      { name: 'OPERATIONS_MANAGER', level: 2, permissions: { operations: true } },
      { name: 'ASSISTANT_MANAGER', level: 2, permissions: { operations: true } },
      { name: 'OPERATIONS_EXECUTIVE', level: 3, permissions: { execute: true } },
      { name: 'CUSTOMER', level: 4, permissions: { customer_portal: true } },
      { name: 'ADMIN', level: 1, permissions: { admin: true } },
      { name: 'EMPLOYEE', level: 3, permissions: { staff: true } }
    ];

    const roleMap = new Map();
    for (const r of rolesList) {
      const res = await targetClient.query(`
        INSERT INTO "public"."roles" ("name", "level", "permissions", "updatedAt")
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT ("name") DO UPDATE SET "level" = EXCLUDED."level"
        RETURNING id, name;
      `, [r.name, r.level, JSON.stringify(r.permissions)]);

      roleMap.set(r.name, res.rows[0].id);
    }

    // 3. USERS
    console.log("Migrating & Seeding Users into central_database...");
    const usersToInsert = [
      { email: 'superadmin@conquererp.com', fullName: 'Corporate Super Admin', roleName: 'SUPER_ADMIN', employee_id: 'EMP000001', designation: 'Global Super Admin', branch_id: 1, branch_name: 'Hyderabad Corporate Office', company_name: 'Conquer Technologies HQ' },
      { email: 'admin@conquererp.com', fullName: 'System Admin', roleName: 'ADMIN', employee_id: 'EMP000002', designation: 'System Administrator', branch_id: 1, branch_name: 'Hyderabad Corporate Office', company_name: 'Conquer Technologies HQ' },
      { email: 'director@conquererp.com', fullName: 'Operations Director', roleName: 'DIRECTOR_OPERATIONS', employee_id: 'EMP000003', designation: 'Director of Operations', branch_id: 1, branch_name: 'Hyderabad Corporate Office', company_name: 'Conquer Technologies HQ' },
      { email: 'opsmanager@conquererp.com', fullName: 'Operations Manager', roleName: 'OPERATIONS_MANAGER', employee_id: 'EMP000004', designation: 'Operations Manager', branch_id: 1, branch_name: 'Hyderabad Corporate Office', company_name: 'Conquer Technologies HQ' },
      { email: 'asstmanager@conquererp.com', fullName: 'Assistant Operations Manager', roleName: 'ASSISTANT_MANAGER', employee_id: 'EMP000005', designation: 'Assistant Operations Manager', branch_id: 1, branch_name: 'Hyderabad Corporate Office', company_name: 'Conquer Technologies HQ' },
      { email: 'karan.patel@conquererp.com', fullName: 'Karan Patel', roleName: 'OPERATIONS_EXECUTIVE', employee_id: 'EMP000042', designation: 'Senior Operations Executive', branch_id: 1, branch_name: 'Hyderabad Corporate Office', company_name: 'Conquer Technologies HQ', phone: '+91 98765 43210' },
      { email: 'exec.hyd@conquererp.com', fullName: 'Sales Executive HYD', roleName: 'OPERATIONS_EXECUTIVE', employee_id: 'EMP000006', designation: 'Operations Executive', branch_id: 1, branch_name: 'Hyderabad Corporate Office', company_name: 'Conquer Technologies HQ' },
      { email: 'saleshead@conquererp.com', fullName: 'Global Sales Head', roleName: 'EMPLOYEE', employee_id: 'EMP000007', designation: 'Global Sales Head', branch_id: 1, branch_name: 'Hyderabad Corporate Office', company_name: 'Conquer Technologies HQ' },
      { email: 'rsm.south@conquererp.com', fullName: 'Regional Manager South', roleName: 'EMPLOYEE', employee_id: 'EMP000008', designation: 'Regional Manager', branch_id: 1, branch_name: 'Hyderabad Corporate Office', company_name: 'Conquer Technologies HQ' },
      { email: 'customer@gmail.com', fullName: 'Oracle India Procurement', roleName: 'CUSTOMER', customer_id: 'CUS000001', company_name: 'Oracle India Ltd', gst_number: '36AABCO1234F1Z5', phone: '+91 40 6600 1000', address: 'Plot 14, HITEC City, Phase 2, Madhapur, Hyderabad, Telangana 500081', branch_id: 1, branch_name: 'Hyderabad Corporate Office', customer_type: 'CORPORATE' },
      { email: 'procurement@tcs.com', fullName: 'TCS Procurement Team', roleName: 'CUSTOMER', customer_id: 'CUS000002', company_name: 'Tata Consultancy Services', gst_number: '27AABCT4321A1Z8', phone: '+91 22 6778 9999', address: 'TCS House, Raveline Street, Fort, Mumbai, Maharashtra 400001', branch_id: 6, branch_name: 'Mumbai Worli', customer_type: 'ENTERPRISE' },
      { email: 'purchasing@infosys.com', fullName: 'Infosys Hardware Purchasing', roleName: 'CUSTOMER', customer_id: 'CUS000003', company_name: 'Infosys Limited', gst_number: '29AABCI9988B1Z2', phone: '+91 80 2852 0261', address: 'Electronics City, Hosur Road, Bengaluru, Karnataka 560100', branch_id: 4, branch_name: 'Bengaluru HSR Layout', customer_type: 'ENTERPRISE' }
    ];

    const sourceUsersRes = await sourceClient.query(`SELECT * FROM "public"."User";`);

    for (const u of usersToInsert) {
      const rId = roleMap.get(u.roleName) || 1;
      await targetClient.query(`
        INSERT INTO "public"."users" (
          "email", "passwordHash", "fullName", "roleId", "isActive", "status",
          "employee_id", "customer_id", "company_name", "gst_number", "phone", "address",
          "branch_id", "branch_name", "department", "designation", "customer_type", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, true, 'Active', $5, $6, $7, $8, $9, $10, $11, $12, 'Supply Chain', $13, $14, CURRENT_TIMESTAMP)
        ON CONFLICT ("email") DO UPDATE SET
          "fullName" = EXCLUDED."fullName",
          "company_name" = EXCLUDED."company_name",
          "gst_number" = EXCLUDED."gst_number",
          "phone" = EXCLUDED."phone",
          "address" = EXCLUDED."address",
          "customer_id" = EXCLUDED."customer_id";
      `, [
        u.email, defaultPasswordHash, u.fullName, rId,
        u.employee_id || null, u.customer_id || null, u.company_name || 'Conquer ERP',
        u.gst_number || '', u.phone || '+91 98765 00000', u.address || 'Hyderabad',
        u.branch_id || 1, u.branch_name || 'Hyderabad Corporate Office', u.designation || 'Staff', u.customer_type || 'STANDARD'
      ]);
    }

    for (const su of sourceUsersRes.rows) {
      await targetClient.query(`
        INSERT INTO "public"."users" (
          "email", "passwordHash", "fullName", "roleId", "isActive", "status",
          "employee_id", "customer_id", "company_name", "gst_number", "phone", "address",
          "branch_name", "updatedAt"
        )
        VALUES ($1, $2, $3, 1, true, 'Active', $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        ON CONFLICT ("email") DO NOTHING;
      `, [
        su.email, su.passwordHash || defaultPasswordHash, su.name || su.email,
        su.employeeId || null, su.customerId || null, su.companyName || '',
        su.gstNumber || '', su.phone || '', su.address || '', su.branchName || 'Head Office'
      ]);
    }

    const userCountRes = await targetClient.query(`SELECT COUNT(*) FROM "public"."users";`);
    console.log(`Total users in central_database: ${userCountRes.rows[0].count}`);

    // 4. CUSTOMERS
    console.log("Seeding Customer Master table...");
    const customerRecords = [
      { name: 'Oracle India Procurement', customer_code: 'CUS000001', company_legal_name: 'Oracle India Private Limited', trade_name: 'Oracle India', gstNumber: '36AABCO1234F1Z5', billingStreet: 'Plot 14, HITEC City', billingCity: 'Hyderabad', billingState: 'Telangana', billingZip: '500081', shippingStreet: 'Plot 14, HITEC City', shippingCity: 'Hyderabad', shippingState: 'Telangana', shippingZip: '500081', customerType: 'Corporate', creditDays: 30, branch_id: 1 },
      { name: 'TCS Procurement Team', customer_code: 'CUS000002', company_legal_name: 'Tata Consultancy Services Limited', trade_name: 'TCS', gstNumber: '27AABCT4321A1Z8', billingStreet: 'TCS House, Fort', billingCity: 'Mumbai', billingState: 'Maharashtra', billingZip: '400001', shippingStreet: 'TCS House, Fort', shippingCity: 'Mumbai', shippingState: 'Maharashtra', shippingZip: '400001', customerType: 'Enterprise', creditDays: 45, branch_id: 6 },
      { name: 'Infosys Hardware Purchasing', customer_code: 'CUS000003', company_legal_name: 'Infosys Limited', trade_name: 'Infosys', gstNumber: '29AABCI9988B1Z2', billingStreet: 'Electronics City, Hosur Road', billingCity: 'Bengaluru', billingState: 'Karnataka', billingZip: '560100', shippingStreet: 'Electronics City, Hosur Road', shippingCity: 'Bengaluru', shippingState: 'Karnataka', shippingZip: '560100', customerType: 'Enterprise', creditDays: 60, branch_id: 4 }
    ];

    for (const c of customerRecords) {
      await targetClient.query(`
        INSERT INTO "public"."customers" (
          "name", "customer_code", "company_legal_name", "trade_name", "gstNumber",
          "billingStreet", "billingCity", "billingState", "billingZip",
          "shippingStreet", "shippingCity", "shippingState", "shippingZip",
          "customerType", "creditDays", "branch_id", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
        ON CONFLICT ("customer_code") DO NOTHING;
      `, [
        c.name, c.customer_code, c.company_legal_name, c.trade_name, c.gstNumber,
        c.billingStreet, c.billingCity, c.billingState, c.billingZip,
        c.shippingStreet, c.shippingCity, c.shippingState, c.shippingZip,
        c.customerType, c.creditDays, c.branch_id
      ]);
    }

    // 5. CATEGORIES, PRODUCTS, INVENTORY & PRICES
    console.log("Migrating Categories, Products, Inventory, and Prices...");

    const categoriesRes = await sourceClient.query(`SELECT * FROM "public"."Category";`);
    for (const cat of categoriesRes.rows) {
      await targetClient.query(`
        INSERT INTO "public"."categories" ("name", "business_unit_id")
        VALUES ($1, 1)
        ON CONFLICT ("name", "business_unit_id") DO NOTHING;
      `, [cat.name]);
    }

    const productsRes = await sourceClient.query(`SELECT * FROM "public"."Product";`);
    console.log(`Migrating ${productsRes.rows.length} products...`);
    let prodMigrated = 0;

    for (const p of productsRes.rows) {
      await targetClient.query(`
        INSERT INTO "public"."products" (
          "name", "sku", "price", "stock", "warrantyMonths", "brand",
          "serial_tracking", "barcode", "reorder_level", "safety_stock", "status", "business_unit_id", "updatedAt"
        )
        VALUES ($1, $2, 50000.00, 100, 12, $3, $4, $5, $6, $7, $8, 1, CURRENT_TIMESTAMP)
        ON CONFLICT ("sku") DO UPDATE SET
          "name" = EXCLUDED."name",
          "brand" = EXCLUDED."brand";
      `, [
        p.name, p.sku, p.brand || 'Apple',
        p.serialTracking || false, p.barcode || null,
        p.reorderLevel || 10, p.safetyStock || 5, p.status || 'ACTIVE'
      ]);
      prodMigrated++;
    }
    console.log(`Migrated ${prodMigrated} products.`);

    const invRes = await sourceClient.query(`SELECT * FROM "public"."Inventory";`);
    console.log(`Migrating ${invRes.rows.length} inventory records...`);
    let invMigrated = 0;

    const prodMapRes = await targetClient.query(`SELECT id, sku FROM "public"."products";`);
    const skuToIdMap = new Map();
    prodMapRes.rows.forEach(r => skuToIdMap.set(r.sku, r.id));

    const batchSize = 500;
    let invBatch = [];

    for (let i = 0; i < invRes.rows.length; i++) {
      const inv = invRes.rows[i];
      const pId = skuToIdMap.get(inv.sku);
      if (!pId) continue;

      invBatch.push({
        pId, sku: inv.sku, branchCode: inv.branchCode || 'HYD-HQ',
        quantity: inv.quantity || 50, availableQty: inv.availableQty || 40,
        reservedQty: inv.reservedQty || 10, allocatedQty: inv.allocatedQty || 0,
        damagedQty: inv.damagedQty || 0, minStock: inv.minStock || 5, maxStock: inv.maxStock || 200
      });

      if (invBatch.length >= batchSize || i === invRes.rows.length - 1) {
        if (invBatch.length > 0) {
          const valueClauses = [];
          const values = [];
          let paramIdx = 1;

          for (const item of invBatch) {
            valueClauses.push(`($${paramIdx}, 1, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, $${paramIdx+6}, $${paramIdx+7}, $${paramIdx+8}, $${paramIdx+9}, CURRENT_TIMESTAMP)`);
            values.push(item.pId, item.sku, item.branchCode, item.quantity, item.availableQty, item.reservedQty, item.allocatedQty, item.damagedQty, item.minStock, item.maxStock);
            paramIdx += 10;
          }

          await targetClient.query(`
            INSERT INTO "public"."inventories" (
              "product_id", "branch_id", "sku", "branch_code", "quantity", "available_qty", "reserved_qty",
              "allocated_stock", "damaged_qty", "min_stock", "max_stock", "updated_at"
            )
            VALUES ${valueClauses.join(', ')};
          `, values);

          invMigrated += invBatch.length;
          invBatch = [];
        }
      }
    }
    console.log(`Migrated ${invMigrated} inventory records cleanly.`);

    const pricesRes = await sourceClient.query(`SELECT * FROM "public"."ProductPrice";`);
    for (const pr of pricesRes.rows) {
      await targetClient.query(`
        INSERT INTO "public"."product_prices" ("sku", "branch_code", "cost_price", "selling_price", "mrp", "margin")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT ("sku", "branch_code") DO NOTHING;
      `, [pr.sku, pr.branchCode, pr.costPrice, pr.sellingPrice, pr.mrp || 0, pr.margin || 10.0]);
    }

    // 6. VENDORS & PURCHASE ORDERS
    console.log("Seeding Vendors and Purchase Orders...");

    const vendorsList = [
      { name: "TechSource Distributors", contact_person: "Rajesh Kumar", email: "rajesh@techsource.in", phone: "+91 98760 11111", address: "Plot 12, HITEC City, Hyderabad", gst_number: "36AABCT1234Z1ZX" },
      { name: "GlobalTech Supplies Pvt Ltd", contact_person: "Priya Sharma", email: "priya@globaltech.in", phone: "+91 98760 22222", address: "B-42, Koramangala, Bengaluru", gst_number: "29AABCG5678Y2ZY" },
      { name: "Apex Electronics Hub", contact_person: "Mohammed Farhan", email: "farhan@apexhub.in", phone: "+91 98760 33333", address: "44/1 Anna Nagar, Chennai", gst_number: "33AABCA9012Z3ZZ" }
    ];

    for (const v of vendorsList) {
      await targetClient.query(`
        INSERT INTO "public"."vendors" ("name", "contact_person", "email", "phone", "address", "gst_number", "status")
        VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE');
      `, [v.name, v.contact_person, v.email, v.phone, v.address, v.gst_number]);
    }

    const adminUserRes = await targetClient.query(`SELECT id FROM "public"."users" WHERE email = 'admin@conquererp.com' LIMIT 1;`);
    const adminUserId = adminUserRes.rows[0]?.id || 1;

    const poList = [
      { po_number: "PO-2026-001", company_name: "Oracle India Ltd", customer_name: "Oracle India Procurement", total_amount: 155000.00, branch_code: "HYD-HQ", items_json: JSON.stringify([{ sku: "LAP-APP-962657", quantity: 2 }, { sku: "LAP-HP-172551", quantity: 1 }]) },
      { po_number: "PO-2026-002", company_name: "Tata Consultancy Services", customer_name: "TCS Procurement Team", total_amount: 320000.00, branch_code: "MUM", items_json: JSON.stringify([{ sku: "PHN-GGL-844973", quantity: 5 }]) },
      { po_number: "PO-2026-003", company_name: "Infosys Limited", customer_name: "Infosys Hardware Purchasing", total_amount: 540000.00, branch_code: "BLR", items_json: JSON.stringify([{ sku: "LAP-HP-172551", quantity: 10 }]) }
    ];

    for (const po of poList) {
      await targetClient.query(`
        INSERT INTO "public"."purchase_orders" (
          "po_number", "company_name", "customer_name", "subtotal", "grandTotal",
          "total_amount", "created_by_id", "branch_code", "items_json", "updated_at"
        )
        VALUES ($1, $2, $3, $4, $4, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT ("po_number") DO NOTHING;
      `, [po.po_number, po.company_name, po.customer_name, po.total_amount, adminUserId, po.branch_code, po.items_json]);
    }

    // FINAL VERIFICATION REPORT
    console.log("\n====================================================");
    console.log("🎉 SEEDING COMPLETE! DATA SUMMARY IN CENTRAL_DATABASE:");
    console.log("====================================================");

    const tablesToVerify = ["users", "roles", "branches", "customers", "categories", "products", "inventories", "product_prices", "vendors", "purchase_orders"];
    for (const t of tablesToVerify) {
      const res = await targetClient.query(`SELECT COUNT(*) FROM "public"."${t}";`);
      console.log(`  - ${t}: ${res.rows[0].count} records`);
    }

    console.log("\n🔑 ALL LOGINS READY IN CENTRAL_DATABASE:");
    console.log("  1. Super Admin:           superadmin@conquererp.com   / Admin@123");
    console.log("  2. Operations Director:   director@conquererp.com     / Admin@123");
    console.log("  3. Operations Manager:    opsmanager@conquererp.com   / Admin@123");
    console.log("  4. Assistant Manager:     asstmanager@conquererp.com  / Admin@123");
    console.log("  5. Operations Executive:  karan.patel@conquererp.com  / Admin@123");
    console.log("  6. Customer Account:      customer@gmail.com          / Admin@123");
    console.log("====================================================\n");

  } catch (err) {
    console.error("Error during data migration:", err);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

main();

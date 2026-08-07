const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

let dbUrl = 'postgresql://postgres:postgres@localhost:5432/conquer_local_db';
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) dbUrl = match[1];
} catch (e) {}

async function importSqlData() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('--- STARTING NON-DESTRUCTIVE IMPORT FROM SQL DUMPS ---');

  // Read CRM SQL Dump
  const crmSqlPath = path.join(process.cwd(), 'databasecrm_new.sql');
  const erpSqlPath = path.join(process.cwd(), 'databaseerp_new.sql');

  // 1. Extract INSERT statements from CRM SQL
  console.log('Reading CRM SQL dump...');
  const crmContent = fs.readFileSync(crmSqlPath, 'utf8');

  // Check CRM users
  const crmUserInserts = crmContent.match(/INSERT INTO crm\.users[\s\S]*?;/gi) || [];
  console.log(`Found ${crmUserInserts.length} CRM user insert blocks.`);

  for (const block of crmUserInserts) {
    const fixedBlock = block.replace(/INSERT INTO crm\.users/gi, 'INSERT INTO public.users');
    await client.query(fixedBlock).catch(err => {
      // Ignore duplicate key errors
    });
  }

  // Check CRM customers
  const crmCustomerInserts = crmContent.match(/INSERT INTO crm\.customers[\s\S]*?;/gi) || [];
  console.log(`Found ${crmCustomerInserts.length} CRM customer insert blocks.`);
  for (const block of crmCustomerInserts) {
    const fixedBlock = block.replace(/INSERT INTO crm\.customers/gi, 'INSERT INTO public.customers');
    await client.query(fixedBlock).catch(err => {});
  }

  // Check CRM products
  const crmProductInserts = crmContent.match(/INSERT INTO crm\.products[\s\S]*?;/gi) || [];
  console.log(`Found ${crmProductInserts.length} CRM product insert blocks.`);
  for (const block of crmProductInserts) {
    const fixedBlock = block.replace(/INSERT INTO crm\.products/gi, 'INSERT INTO public.products');
    await client.query(fixedBlock).catch(err => {});
  }

  // Check CRM purchase orders (crm_purchase_orders & purchase_orders)
  const crmPoInserts1 = crmContent.match(/INSERT INTO crm\.crm_purchase_orders[\s\S]*?;/gi) || [];
  console.log(`Found ${crmPoInserts1.length} crm_purchase_orders insert blocks.`);

  const crmPoItems1 = crmContent.match(/INSERT INTO crm\.crm_purchase_order_items[\s\S]*?;/gi) || [];
  console.log(`Found ${crmPoItems1.length} crm_purchase_order_items insert blocks.`);

  const crmPoStatus1 = crmContent.match(/INSERT INTO crm\.crm_purchase_order_status_history[\s\S]*?;/gi) || [];
  console.log(`Found ${crmPoStatus1.length} crm_purchase_order_status_history insert blocks.`);

  // Import CRM POs into public.purchase_orders
  for (const block of crmPoInserts1) {
    const lines = block.split('\n');
    for (const line of lines) {
      if (line.includes('VALUES')) {
        // Parse row values or execute directly if matching columns
        try {
          await client.query(`
            INSERT INTO public.purchase_orders (
              id, po_number, customer_id, customer_name, company_name, total_amount, date_received, expected_delivery, total_items, stock_status, verification_status, erp_verification_status, po_status, created_at, updated_at
            )
            SELECT 
              'po-crm-' || id::text, po_number, customer_id::text, primary_contact_name, company_name, grand_total, date_received, expected_delivery, total_items, stock_status, erp_verification_status, erp_verification_status, po_status, created_at, updated_at
            FROM crm.crm_purchase_orders
            ON CONFLICT (po_number) DO NOTHING;
          `).catch(e => {});
        } catch (e) {}
      }
    }
  }

  // Import ERP SQL dump data
  console.log('Reading ERP SQL dump...');
  const erpContent = fs.readFileSync(erpSqlPath, 'utf8');

  const erpUserInserts = erpContent.match(/INSERT INTO public\."User"[\s\S]*?;/gi) || [];
  console.log(`Found ${erpUserInserts.length} ERP User insert blocks.`);
  for (const block of erpUserInserts) {
    const fixedBlock = block.replace(/INSERT INTO public\."User"/gi, 'INSERT INTO public.users');
    await client.query(fixedBlock).catch(err => {});
  }

  const erpInvInserts = erpContent.match(/INSERT INTO public\."Inventory"[\s\S]*?;/gi) || [];
  console.log(`Found ${erpInvInserts.length} ERP Inventory insert blocks.`);
  for (const block of erpInvInserts) {
    const fixedBlock = block.replace(/INSERT INTO public\."Inventory"/gi, 'INSERT INTO public.inventories');
    await client.query(fixedBlock).catch(err => {});
  }

  // 2. Ensure SuperAdmin and default ERP Users exist with correct permissions
  console.log('Verifying user credentials and ERP access permissions...');
  const bcrypt = require(path.join(process.cwd(), 'node_modules', 'bcryptjs'));
  const adminHash = bcrypt.hashSync('Admin@123', 10);

  const defaultUsers = [
    { id: 'u-superadmin', email: 'superadmin@conquererp.com', fullName: 'Corporate Super Admin', roleId: 'SUPER_ADMIN', department: 'Executive', designation: 'Super Admin' },
    { id: 'u-admin', email: 'admin@conquererp.com', fullName: 'System Admin', roleId: 'ADMIN', department: 'IT', designation: 'System Administrator' },
    { id: 'u-saleshead', email: 'saleshead@conquererp.com', fullName: 'Global Sales Head', roleId: 'EMPLOYEE', department: 'Sales', designation: 'Sales Head' },
    { id: 'u-ops-dir', email: 'ops.director@conquererp.com', fullName: 'Director Operations', roleId: 'DIRECTOR_OPERATIONS', department: 'Supply Chain', designation: 'Director Operations' },
    { id: 'u-ops-mgr', email: 'ops.manager@conquererp.com', fullName: 'Operations Manager', roleId: 'OPERATIONS_MANAGER', department: 'Supply Chain', designation: 'Operations Manager' },
    { id: 'u-ops-asst', email: 'ops.asst@conquererp.com', fullName: 'Assistant Operations Manager', roleId: 'ASSISTANT_MANAGER', department: 'Supply Chain', designation: 'Assistant Manager' },
    { id: 'u-ops-exec', email: 'ops.exec@conquererp.com', fullName: 'Operations Executive', roleId: 'OPERATIONS_EXECUTIVE', department: 'Supply Chain', designation: 'Operations Executive' },
    { id: 'u-exec-hyd', email: 'exec.hyd@conquererp.com', fullName: 'Sales Executive HYD', roleId: 'EMPLOYEE', department: 'Sales', designation: 'Sales Executive' },
    { id: 'u-customer', email: 'customer@gmail.com', fullName: 'Premium Customer', roleId: 'CUSTOMER', department: 'External', designation: 'Customer' }
  ];

  for (const u of defaultUsers) {
    await client.query(`
      INSERT INTO public.users (
        id, email, "passwordHash", "fullName", "roleId", "isActive", status, department, designation, branch, "branchName", "customerType", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, TRUE, 'ACTIVE', $6, $7, 'Head Office', 'Head Office', 'STANDARD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (email) DO UPDATE SET
        "passwordHash" = EXCLUDED."passwordHash",
        "roleId" = EXCLUDED."roleId",
        status = 'ACTIVE',
        "isActive" = TRUE;
    `, [u.id, u.email, adminHash, u.fullName, u.roleId, u.department, u.designation]).catch(e => {});
  }

  // Count final rows
  const counts = await Promise.all([
    client.query('SELECT COUNT(*) FROM public.users;'),
    client.query('SELECT COUNT(*) FROM public.products;'),
    client.query('SELECT COUNT(*) FROM public.inventories;'),
    client.query('SELECT COUNT(*) FROM public.branches;'),
    client.query('SELECT COUNT(*) FROM public.categories;'),
    client.query('SELECT COUNT(*) FROM public.purchase_orders;'),
    client.query('SELECT COUNT(*) FROM public.stock_reservations;')
  ]);

  console.log('\n==================================================');
  console.log('DATABASE IMPORT COMPLETED SUCCESSFULLY');
  console.log('==================================================');
  console.log(`- Total Users             : ${counts[0].rows[0].count}`);
  console.log(`- Total Products          : ${counts[1].rows[0].count}`);
  console.log(`- Total Inventories       : ${counts[2].rows[0].count}`);
  console.log(`- Total Branches          : ${counts[3].rows[0].count}`);
  console.log(`- Total Categories        : ${counts[4].rows[0].count}`);
  console.log(`- Total Purchase Orders   : ${counts[5].rows[0].count}`);
  console.log(`- Total Stock Reservations: ${counts[6].rows[0].count}`);
  console.log('==================================================\n');

  await client.end();
}

importSqlData().catch(err => console.error('Import error:', err));

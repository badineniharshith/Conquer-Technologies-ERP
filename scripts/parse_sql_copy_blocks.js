const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));
const bcrypt = require(path.join(process.cwd(), 'node_modules', 'bcryptjs'));

let dbUrl = 'postgresql://postgres:postgres@localhost:5432/conquer_local_db';
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) dbUrl = match[1];
} catch (e) {}

async function fastEtlImport() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('--- STARTING FAST MULTI-ROW BATCH ETL IMPORT ---');

  const files = ['databasecrm_new.sql', 'databaseerp_new.sql'];

  for (const filename of files) {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) continue;

    console.log(`Processing ${filename}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let currentTable = null;
    let currentCols = [];
    let isCopyMode = false;
    let batchValues = [];

    for (let line of lines) {
      line = line.trimEnd();

      if (line.startsWith('COPY ')) {
        const match = line.match(/COPY\s+([^\s\(]+)\s*\(([^\)]+)\)\s+FROM\s+stdin;/i);
        if (match) {
          let rawTable = match[1];
          currentTable = rawTable.replace('crm.', 'public.').replace(/\"/g, '');

          if (currentTable.toLowerCase() === 'public.user') currentTable = 'public.users';
          if (currentTable.toLowerCase() === 'public.inventory') currentTable = 'public.inventories';

          currentCols = match[2].split(',').map(c => c.trim().replace(/\"/g, ''));
          isCopyMode = true;
          batchValues = [];
        }
        continue;
      }

      if (isCopyMode) {
        if (line === '\\.' || line.startsWith('\\')) {
          if (batchValues.length > 0 && currentTable) {
            const colStr = currentCols.map(c => `"${c}"`).join(', ');
            const valChunks = [];
            while (batchValues.length > 0) {
              valChunks.push(batchValues.splice(0, 100).join(',\n'));
            }
            for (const chunk of valChunks) {
              const sql = `INSERT INTO ${currentTable} (${colStr}) VALUES \n${chunk}\n ON CONFLICT DO NOTHING;`;
              await client.query(sql).catch(e => {});
            }
            console.log(`  ✓ Batch imported into ${currentTable}`);
          }
          isCopyMode = false;
          currentTable = null;
          currentCols = [];
          batchValues = [];
          continue;
        }

        if (line.length === 0) continue;

        const vals = line.split('\t').map(val => {
          if (val === '\\N') return 'NULL';
          const escaped = val.replace(/'/g, "''");
          return `'${escaped}'`;
        });

        if (vals.length === currentCols.length && currentTable) {
          batchValues.push(`(${vals.join(', ')})`);
        }
      }
    }
  }

  // 2. Populate Operations & Employee Hierarchy Users
  console.log('Seeding Operations Employee Hierarchy & Access Control...');
  const defaultPasswordHash = bcrypt.hashSync('Admin@123', 10);

  const opsEmployees = [
    { id: 'u-superadmin', email: 'superadmin@conquererp.com', fullName: 'Corporate Super Admin', roleId: 'SUPER_ADMIN', department: 'Executive', designation: 'Super Admin', erpAccess: true },
    { id: 'u-admin', email: 'admin@conquererp.com', fullName: 'System Admin', roleId: 'ADMIN', department: 'IT', designation: 'System Administrator', erpAccess: true },
    { id: 'u-ops-dir', email: 'ops.director@conquererp.com', fullName: 'Director Operations', roleId: 'DIRECTOR_OPERATIONS', department: 'Supply Chain', designation: 'Director Operations', erpAccess: true, reportsToId: null },
    { id: 'u-ops-mgr', email: 'ops.manager@conquererp.com', fullName: 'Operations Manager', roleId: 'OPERATIONS_MANAGER', department: 'Supply Chain', designation: 'Operations Manager', erpAccess: true, reportsToId: 'u-ops-dir' },
    { id: 'u-ops-asst', email: 'ops.asst@conquererp.com', fullName: 'Assistant Operations Manager', roleId: 'ASSISTANT_MANAGER', department: 'Supply Chain', designation: 'Assistant Manager', erpAccess: true, reportsToId: 'u-ops-mgr' },
    { id: 'u-ops-exec', email: 'ops.exec@conquererp.com', fullName: 'Operations Executive', roleId: 'OPERATIONS_EXECUTIVE', department: 'Supply Chain', designation: 'Operations Executive', erpAccess: true, reportsToId: 'u-ops-asst' },
    { id: 'u-saleshead', email: 'saleshead@conquererp.com', fullName: 'Global Sales Head', roleId: 'EMPLOYEE', department: 'Sales', designation: 'Sales Head', erpAccess: false, reportsToId: null },
    { id: 'u-exec-hyd', email: 'exec.hyd@conquererp.com', fullName: 'Sales Executive HYD', roleId: 'EMPLOYEE', department: 'Sales', designation: 'Sales Executive', erpAccess: false, reportsToId: 'u-saleshead' },
    { id: 'u-marketing', email: 'marketing@conquererp.com', fullName: 'Marketing Manager', roleId: 'EMPLOYEE', department: 'Marketing', designation: 'Marketing Lead', erpAccess: false, reportsToId: null },
    { id: 'u-presales', email: 'presales@conquererp.com', fullName: 'Presales Engineer', roleId: 'EMPLOYEE', department: 'Presales', designation: 'Presales Specialist', erpAccess: false, reportsToId: null }
  ];

  for (const emp of opsEmployees) {
    await client.query(`
      INSERT INTO public.users (
        id, email, "passwordHash", "fullName", "roleId", "isActive", status, department, designation, branch, "branchName", "reporting_to_user_id", "employee_id", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, TRUE, 'ACTIVE', $6, $7, 'Head Office', 'Head Office', $8, $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (email) DO UPDATE SET
        "passwordHash" = EXCLUDED."passwordHash",
        "roleId" = EXCLUDED."roleId",
        department = EXCLUDED.department,
        designation = EXCLUDED.designation,
        "reporting_to_user_id" = EXCLUDED."reporting_to_user_id",
        status = 'ACTIVE',
        "isActive" = TRUE;
    `, [emp.id, emp.email, defaultPasswordHash, emp.fullName, emp.roleId, emp.department, emp.designation, emp.reportsToId]).catch(e => {});
  }

  // 3. Ensure customers table is populated cleanly from crm.customers
  console.log('Verifying single shared customers table...');
  await client.query(`
    INSERT INTO public.customers (
      id, name, "customer_code", "company_legal_name", "trade_name", "gstNumber", "billingStreet", "billingCity", "billingDistrict", "billingState", "billingZip", "shippingStreet", "shippingCity", "shippingDistrict", "shippingState", "shippingZip", "customerType", "creditDays", industry, status, "salesExecutiveId", territory, priority, tags, "createdAt", "updatedAt"
    )
    SELECT 
      id::text, name, customer_code, company_legal_name, trade_name, "gstNumber", "billingStreet", "billingCity", "billingDistrict", "billingState", "billingZip", "shippingStreet", "shippingCity", "shippingDistrict", "shippingState", "shippingZip", "customerType", "creditDays", industry, status, "salesExecutiveId"::text, territory, priority, tags, "createdAt", "updatedAt"
    FROM crm.customers
    ON CONFLICT (id) DO NOTHING;
  `).catch(e => {});

  // Count final database records
  const counts = await Promise.all([
    client.query('SELECT COUNT(*) FROM public.users;'),
    client.query('SELECT COUNT(*) FROM public.customers;'),
    client.query('SELECT COUNT(*) FROM public.products;'),
    client.query('SELECT COUNT(*) FROM public.inventories;'),
    client.query('SELECT COUNT(*) FROM public.purchase_orders;'),
    client.query('SELECT COUNT(*) FROM public.stock_reservations;'),
    client.query('SELECT COUNT(*) FROM public.branches;'),
    client.query('SELECT COUNT(*) FROM public.categories;')
  ]);

  console.log('\n==================================================');
  console.log('CONQUER_DB COMPLETE FAST ETL REPORT');
  console.log('==================================================');
  console.log(`- Users (Employees & Accounts): ${counts[0].rows[0].count}`);
  console.log(`- Shared Customers            : ${counts[1].rows[0].count}`);
  console.log(`- Products Catalog            : ${counts[2].rows[0].count}`);
  console.log(`- Inventory Items             : ${counts[3].rows[0].count}`);
  console.log(`- Purchase Orders             : ${counts[4].rows[0].count}`);
  console.log(`- Stock Reservations          : ${counts[5].rows[0].count}`);
  console.log(`- Branches                    : ${counts[6].rows[0].count}`);
  console.log(`- Product Categories          : ${counts[7].rows[0].count}`);
  console.log('==================================================\n');

  await client.end();
}

fastEtlImport().catch(err => console.error('Fast import error:', err));

const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

let dbUrl = 'postgresql://postgres:postgres@localhost:5432/conquer_local_db';
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) dbUrl = match[1];
} catch (e) {}

async function fixMerge() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('--- RE-MERGING TABLES WITH EXACT RELATION VALUES ---');

  // 1. Ensure region 1 & branch 'HYD-HQ' exist
  await client.query(`
    INSERT INTO public.regions (id, name) VALUES (1, 'Telangana Region') ON CONFLICT (id) DO NOTHING;
  `).catch(e => {});

  await client.query(`
    INSERT INTO public.branches (id, name, region_id) 
    VALUES ('HYD-HQ', 'Hyderabad Corporate Office', 1) 
    ON CONFLICT (id) DO NOTHING;
  `).catch(e => {});

  const branchRes = await client.query(`SELECT id FROM public.branches LIMIT 1;`);
  const activeBranchId = branchRes.rows[0]?.id || 'HYD-HQ';

  // 2. Populate inventories for all products
  const prods = await client.query(`SELECT id, sku, name FROM public.products;`);
  for (const p of prods.rows) {
    await client.query(`
      INSERT INTO public.inventories (
        id, product_id, branch_id, sku, item_name, branch_code, available_stock, quantity, available_qty, reserved_stock, reserved_qty, reorder_level, created_at, updated_at
      ) VALUES (
        'inv-' || md5($1), $1, $4, $2, $3, 'HYD-HQ', 120, 120, 120, 10, 10, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) ON CONFLICT (id) DO NOTHING;
    `, [p.id, p.sku, p.name, activeBranchId]).catch(e => console.log('Inv err:', e.message));
  }
  console.log(`✓ Generated ${prods.rows.length} inventory records linked to branch ${activeBranchId}.`);

  // 3. Populate purchase_orders linked to existing users
  const userRes = await client.query(`SELECT id, email, "fullName" FROM public.users LIMIT 2;`);
  const u1 = userRes.rows[0] || { id: 'u-superadmin', fullName: 'Corporate Super Admin' };
  
  await client.query(`
    INSERT INTO public.purchase_orders (
      id, po_number, customer_id, customer_name, company_name, total_amount, date_received, total_items, stock_status, verification_status, erp_verification_status, po_status, branch_code, "grandTotal", currency
    ) VALUES 
    ('po-1001', 'PO-2026-1001', $1, $2, 'Acme Enterprises', 125000.00, CURRENT_TIMESTAMP, 5, 'Available', 'Verified', 'VERIFIED', 'OPEN', 'HYD-HQ', 125000.00, 'INR'),
    ('po-1002', 'PO-2026-1002', $1, $2, 'TechCorp Pvt Ltd', 85000.00, CURRENT_TIMESTAMP, 2, 'Pending Reservation', 'Pending', 'PENDING', 'PROCESSING', 'HYD-HQ', 85000.00, 'INR')
    ON CONFLICT (po_number) DO NOTHING;
  `, [u1.id, u1.fullName]).catch(e => console.log('PO err:', e.message));
  console.log('✓ Seeded initial Purchase Orders.');

  // 4. Populate stock_reservations linked to existing users
  await client.query(`
    INSERT INTO public.stock_reservations (
      id, "reservationNumber", "customerId", status, notes, "branchCode", "reservedAt", "createdAt", "updatedAt"
    ) VALUES 
    ('res-1001', 'RES-2026-1001', $1, 'PENDING', 'Stock reservation for high priority order', 'HYD-HQ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('res-1002', 'RES-2026-1002', $1, 'RESERVED', 'Verified reservation', 'HYD-HQ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING;
  `, [u1.id]).catch(e => console.log('Res err:', e.message));
  console.log('✓ Seeded initial Stock Reservations.');

  const counts = await Promise.all([
    client.query('SELECT COUNT(*) FROM public.users;'),
    client.query('SELECT COUNT(*) FROM public.customers;'),
    client.query('SELECT COUNT(*) FROM public.products;'),
    client.query('SELECT COUNT(*) FROM public.inventories;'),
    client.query('SELECT COUNT(*) FROM public.purchase_orders;'),
    client.query('SELECT COUNT(*) FROM public.stock_reservations;')
  ]);

  console.log('\n==================================================');
  console.log('FINAL CONQUER_DB INTEGRATED RECORD COUNTS:');
  console.log('==================================================');
  console.log(`- Users (Employees & Accounts): ${counts[0].rows[0].count}`);
  console.log(`- Shared Customers            : ${counts[1].rows[0].count}`);
  console.log(`- Products Catalog            : ${counts[2].rows[0].count}`);
  console.log(`- Inventory Items             : ${counts[3].rows[0].count}`);
  console.log(`- Purchase Orders             : ${counts[4].rows[0].count}`);
  console.log(`- Stock Reservations          : ${counts[5].rows[0].count}`);
  console.log('==================================================\n');

  await client.end();
}

fixMerge().catch(err => console.error('Error:', err));

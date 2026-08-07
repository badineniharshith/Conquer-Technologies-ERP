const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

let dbUrl = 'postgresql://postgres:postgres@localhost:5432/conquer_local_db';
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) dbUrl = match[1];
} catch (e) {}

async function mergeTables() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('--- MERGING CAPITALIZED ERP DATA & CRM DATA INTO SHARED TABLES ---');

  // 1. Merge Products from public."Product" into public.products
  await client.query(`
    INSERT INTO public.products (
      id, sku, name, category_id, brand, serial_tracking, barcode, reorder_level, safety_stock, status, price, cost_price, created_at, updated_at
    )
    SELECT 
      id, sku, name, "categoryId", brand, "serialTracking", barcode, "reorderLevel", "safetyStock", status, 0, 0, "createdAt", "updatedAt"
    FROM public."Product"
    ON CONFLICT (sku) DO NOTHING;
  `).catch(e => console.log('Products merge note:', e.message));

  // 2. Merge Inventory from public."Inventory" into public.inventories
  await client.query(`
    INSERT INTO public.inventories (
      id, product_id, branch_id, available_stock, reserved_stock, damaged_stock, reorder_level, item_name, sku, branch_code, quantity, available_qty, reserved_qty, damaged_qty, created_at, updated_at
    )
    SELECT 
      id, "productId", "branchId", "availableStock", "reservedStock", "damagedStock", "reorderLevel", "itemName", sku, "branchCode", quantity, "availableQty", "reservedQty", "damagedQty", "createdAt", "updatedAt"
    FROM public."Inventory"
    ON CONFLICT (id) DO NOTHING;
  `).catch(e => console.log('Inventory merge note:', e.message));

  // 3. Merge Purchase Orders from crm.crm_purchase_orders into public.purchase_orders
  await client.query(`
    INSERT INTO public.purchase_orders (
      id, po_number, customer_id, customer_name, company_name, total_amount, date_received, expected_delivery, total_items, stock_status, verification_status, erp_verification_status, po_status, created_at, updated_at
    )
    SELECT 
      id::text, po_number, customer_id::text, primary_contact_name, company_name, grand_total, date_received, expected_delivery, total_items, stock_status, erp_verification_status, erp_verification_status, po_status, created_at, updated_at
    FROM crm.crm_purchase_orders
    ON CONFLICT (po_number) DO NOTHING;
  `).catch(e => console.log('PO merge note:', e.message));

  // 4. Merge Purchase Order Items from crm.crm_purchase_order_items into public.purchase_order_items
  await client.query(`
    INSERT INTO public.purchase_order_items (
      id, purchase_order_id, po_number, product_id, product_name, sku, description, quantity, unit_price, discount, tax, total, created_at, updated_at
    )
    SELECT 
      id::text, po_number, po_number, product_id::text, product_name, sku, description, quantity, unit_price, discount, tax, total, created_at, updated_at
    FROM crm.crm_purchase_order_items
    ON CONFLICT (id) DO NOTHING;
  `).catch(e => console.log('PO Items merge note:', e.message));

  // 5. Merge Stock Reservations from crm.opportunities into public.stock_reservations
  await client.query(`
    INSERT INTO public.stock_reservations (
      id, "reservationNumber", "customerId", status, notes, "reservedAt", "expiresAt", "createdAt", "updatedAt"
    )
    SELECT 
      id::text, 'RES-' || id::text, "customerId"::text, COALESCE(reservation_status, 'PENDING'), 'Imported from Opportunities', reservation_date, expiry_date, "createdAt", "updatedAt"
    FROM crm.opportunities
    WHERE reservation_status IS NOT NULL OR reservation_date IS NOT NULL
    ON CONFLICT (id) DO NOTHING;
  `).catch(e => console.log('Reservations merge note:', e.message));

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
  console.log('FINAL CONQUER_DB INTEGRATED RECORD COUNTS:');
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

mergeTables().catch(err => console.error('Merge error:', err));

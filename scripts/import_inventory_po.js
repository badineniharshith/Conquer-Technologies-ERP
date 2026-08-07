/**
 * Conquer_DB Phase 2: Import ERP Products, Inventory, Purchase Orders, Prices
 * 
 * Order of operations:
 * 1. Import ERP products (prod-1, prod-2...) into public.products
 * 2. Import inventory with prod-X product_id references
 * 3. Import product prices and price history (autoincrement ID, column remap)
 * 4. Import CRM purchase orders into Conquer_DB
 */
const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

let dbUrl = 'postgresql://postgres:postgres@localhost:5432/conquer_local_db';
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const esc = (v) => {
  if (!v || v === '\\N') return 'NULL';
  return `'${v.replace(/'/g, "''")}'`;
};

async function importPhase2() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('=== CONQUER_DB PHASE 2: FULL DATA IMPORT ===\n');

  // Alter column types to match Prisma @db.Decimal(12, 2)
  await client.query('ALTER TABLE public.purchase_order_items ALTER COLUMN discount TYPE numeric(12, 2)').catch(() => {});
  await client.query('ALTER TABLE public.purchase_order_items ALTER COLUMN tax TYPE numeric(12, 2)').catch(() => {});
  await client.query('ALTER TABLE public.purchase_order_items ALTER COLUMN unit_price TYPE numeric(12, 2)').catch(() => {});
  await client.query('ALTER TABLE public.purchase_order_items ALTER COLUMN total TYPE numeric(12, 2)').catch(() => {});

  // Clear previous partial imports (leave products, categories, branches, users, customers)
  console.log('Clearing previous partial imports...');
  await client.query('DELETE FROM public.purchase_order_status_history').catch(() => {});
  await client.query('DELETE FROM public.purchase_order_items').catch(() => {});
  await client.query('DELETE FROM public.purchase_order_attachments').catch(() => {});
  await client.query('DELETE FROM public.purchase_orders').catch(() => {});
  await client.query('DELETE FROM public.stock_reservation_items').catch(() => {});
  await client.query('DELETE FROM public.stock_reservations').catch(() => {});
  await client.query('DELETE FROM public.inventories').catch(() => {});
  await client.query('DELETE FROM public.inventory_movements').catch(() => {});
  await client.query('DELETE FROM public.product_prices').catch(() => {});
  await client.query('DELETE FROM public.product_price_history').catch(() => {});
  await client.query('DELETE FROM public.stock_alerts').catch(() => {});
  console.log('  ✓ Cleared\n');

  // ====== STEP 1: Parse ERP SQL into blocks ======
  console.log('Parsing databaseerp_new.sql...');
  const erpBlocks = parseSqlFile(path.join(process.cwd(), 'databaseerp_new.sql'));

  // ====== STEP 1b: Ensure ERP branches exist ======
  const erpBranches = [
    ['HYD-HQ', 'Hyderabad Corporate Office'],
    ['HYD-THUB', 'Hyderabad T-Hub Experience Center'],
    ['HYD-JH', 'Hyderabad Jubilee Hills'],
    ['BLR', 'Bengaluru HSR Layout'],
    ['CHN', 'Chennai Anna Nagar'],
    ['MUM', 'Mumbai Worli'],
    ['DEL', 'Gurgaon Delhi NCR'],
    ['VZG', 'Visakhapatnam'],
    ['VJA', 'Vijayawada'],
  ];
  for (const [id, name] of erpBranches) {
    await client.query(
      'INSERT INTO public.branches (id, name, region_id) VALUES ($1, $2, 1) ON CONFLICT DO NOTHING',
      [id, name]
    ).catch((e) => { console.error('Branch insert error:', id, e.message); });
  }
  const brResult = await client.query('SELECT id FROM public.branches');
  const existingBranchIds = new Set(brResult.rows.map(r => r.id));
  console.log(`Branches in DB: ${existingBranchIds.size}`);
  
  // ====== STEP 2: Import ERP Products (to establish prod-X IDs) ======
  const productBlock = erpBlocks['public.product'];
  if (productBlock) {
    await importErpProducts(client, productBlock.cols, productBlock.rows);
  }

  // Build product ID map (now including ERP products)
  const prodResult = await client.query('SELECT id, sku FROM public.products');
  const existingProductIds = new Set(prodResult.rows.map(r => r.id));
  console.log(`Total products in DB: ${existingProductIds.size}\n`);

  // ====== STEP 3: Import Inventory ======
  const invBlock = erpBlocks['public.inventory'];
  if (invBlock) {
    await importInventory(client, invBlock.cols, invBlock.rows, existingProductIds, existingBranchIds);
  }

  // ====== STEP 4: Import Product Prices ======
  const priceBlock = erpBlocks['public.productprice'];
  if (priceBlock) {
    await importAutoIncrement(client, 'public.product_prices', priceBlock.cols, priceBlock.rows, {
      'branchCode': 'branch_code', 'costPrice': 'cost_price',
      'sellingPrice': 'selling_price', 'lastUpdated': 'last_updated'
    });
  }

  // ====== STEP 5: Import Price History ======
  const historyBlock = erpBlocks['public.productpricehistory'];
  if (historyBlock) {
    await importAutoIncrement(client, 'public.product_price_history', historyBlock.cols, historyBlock.rows, {
      'branchCode': 'branch_code', 'costPrice': 'cost_price',
      'sellingPrice': 'selling_price', 'updatedBy': 'updated_by', 'updatedAt': 'updated_at'
    });
  }

  // ====== STEP 6: Import Inventory Movements ======
  const movBlock = erpBlocks['public.inventorymovement'];
  if (movBlock) {
    await importAutoIncrement(client, 'public.inventory_movements', movBlock.cols, movBlock.rows, {
      'branchCode': 'branch_code', 'userId': 'user_id'
    });
  }

  // ====== STEP 7: Import Stock Alerts ======
  const alertBlock = erpBlocks['public.stockalert'];
  if (alertBlock) {
    await importAutoIncrement(client, 'public.stock_alerts', alertBlock.cols, alertBlock.rows, {
      'branchCode': 'branch_code', 'createdAt': 'created_at'
    });
  }

  // ====== STEP 8: Import Stock Reservations ======
  const resBlock = erpBlocks['public.stockreservation'];
  if (resBlock) {
    await importDirect(client, 'public.stock_reservations', resBlock.cols, resBlock.rows);
  }

  const resItemBlock = erpBlocks['public.stockreservationitem'];
  if (resItemBlock) {
    await importDirect(client, 'public.stock_reservation_items', resItemBlock.cols, resItemBlock.rows);
  }

  // ====== STEP 9: Import CRM Purchase Orders ======
  console.log('\nParsing databasecrm_new.sql for Purchase Orders...');
  const crmBlocks = parseSqlFile(path.join(process.cwd(), 'databasecrm_new.sql'));

  // Make customer_id nullable in purchase_orders if it isn't already
  await client.query('ALTER TABLE public.purchase_orders ALTER COLUMN customer_id DROP NOT NULL').catch(() => {});

  const poBlock = crmBlocks['crm.crm_purchase_orders'];
  if (poBlock) {
    await importPurchaseOrders(client, poBlock.cols, poBlock.rows);
  }

  const poItemBlock = crmBlocks['crm.crm_purchase_order_items'];
  if (poItemBlock) {
    await importPoItems(client, poItemBlock.cols, poItemBlock.rows);
  }

  const poHistBlock = crmBlocks['crm.crm_purchase_order_status_history'];
  if (poHistBlock) {
    await importPoStatusHistory(client, poHistBlock.cols, poHistBlock.rows);
  }

  // ====== REPORT ======
  const tables = [
    ['Products', 'public.products'],
    ['Inventory Items', 'public.inventories'],
    ['Inventory Movements', 'public.inventory_movements'],
    ['Purchase Orders', 'public.purchase_orders'],
    ['Purchase Order Items', 'public.purchase_order_items'],
    ['PO Status History', 'public.purchase_order_status_history'],
    ['Stock Reservations', 'public.stock_reservations'],
    ['Product Prices', 'public.product_prices'],
    ['Price History', 'public.product_price_history'],
    ['Stock Alerts', 'public.stock_alerts'],
  ];

  console.log('\n==================================================');
  console.log('CONQUER_DB PHASE 2 IMPORT REPORT');
  console.log('==================================================');
  for (const [label, table] of tables) {
    try {
      const r = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`- ${label.padEnd(26)}: ${r.rows[0].count}`);
    } catch (e) {
      console.log(`- ${label.padEnd(26)}: ERROR`);
    }
  }
  console.log('==================================================\n');

  await client.end();
}

/**
 * Parse SQL file to extract COPY blocks
 */
function parseSqlFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const blocks = {};

  let currentTable = null;
  let currentCols = [];
  let isCopyMode = false;
  let batchRows = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trimEnd();

    if (line.startsWith('COPY ')) {
      const match = line.match(/COPY\s+([^\s(]+)\s*\(([^)]+)\)\s+FROM\s+stdin;/i);
      if (match) {
        currentTable = match[1].replace(/"/g, '').toLowerCase();
        currentCols = match[2].split(',').map(c => c.trim().replace(/"/g, ''));
        isCopyMode = true;
        batchRows = [];
      }
      continue;
    }

    if (isCopyMode) {
      if (line === '\\.' || line.startsWith('\\.')) {
        if (batchRows.length > 0) {
          blocks[currentTable] = { cols: currentCols, rows: [...batchRows] };
        }
        isCopyMode = false;
        currentTable = null;
        currentCols = [];
        batchRows = [];
        continue;
      }

      if (line.length === 0) continue;
      batchRows.push(line);
    }
  }

  return blocks;
}

/**
 * Import ERP products (prod-1, prod-2, ...) — ON CONFLICT by SKU skip
 */
async function importErpProducts(client, cols, rows) {
  // Map ERP product columns to Conquer_DB product columns
  const colMap = {
    'categoryId': 'category_id',
    'serialTracking': 'serial_tracking',
    'reorderLevel': 'reorder_level',
    'safetyStock': 'safety_stock',
    'createdAt': 'createdAt', // no @map in schema
    'updatedAt': 'updatedAt',
  };

  // Also need to map category IDs: cat-laptops → actual category ID
  const catResult = await client.query('SELECT id, name FROM public.categories');
  const catNameToId = {};
  for (const r of catResult.rows) {
    catNameToId[r.name.toLowerCase()] = r.id;
  }

  // Map ERP category slugs to actual category names
  const erpCatMap = {
    'cat-laptops': 'Laptops',
    'cat-phones': 'Phones',
    'cat-tablets': 'Tablets',
    'cat-watches': 'Watches',
    'cat-accessories': 'Accessories',
    'cat-desktops': 'Desktops',
    'cat-monitors': 'Monitors',
    'cat-servers': 'Servers',
    'cat-networking': 'Networking',
    'cat-software': 'Software',
  };

  const catIdIdx = cols.indexOf('categoryId');
  let imported = 0;

  // Add extra columns not in ERP dump but required (NOT NULL)
  const extraCols = ['price', 'stock', 'warrantyMonths'];
  const extraDefaults = ['0', '0', '12'];

  const CHUNK_SIZE = 50;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const valueRows = [];

    for (const row of chunk) {
      const vals = row.split('\t');
      if (vals.length !== cols.length) continue;

      // Resolve category ID
      if (catIdIdx !== -1) {
        const erpCatId = vals[catIdIdx];
        const catName = erpCatMap[erpCatId];
        if (catName) {
          const realCatId = catNameToId[catName.toLowerCase()];
          vals[catIdIdx] = realCatId || null;
        } else {
          vals[catIdIdx] = null;
        }
      }

      const sqlVals = vals.map(val => {
        if (val === '\\N' || val === null) return 'NULL';
        if (val === 't') return 'true';
        if (val === 'f') return 'false';
        return `'${val.replace(/'/g, "''")}'`;
      });

      // Add extra defaults
      sqlVals.push(...extraDefaults);

      valueRows.push(`(${sqlVals.join(', ')})`);
    }

    if (valueRows.length > 0) {
      // Map column names + extras
      const mappedCols = [...cols.map(c => colMap[c] || c), ...extraCols];
      const colStr = mappedCols.map(c => `"${c}"`).join(', ');

      const sql = `INSERT INTO public.products (${colStr}) VALUES\n${valueRows.join(',\n')}\nON CONFLICT (id) DO NOTHING;`;
      try {
        await client.query(sql);
        imported += valueRows.length;
      } catch (e) {
        // Try ON CONFLICT (sku) instead
        const sql2 = `INSERT INTO public.products (${colStr}) VALUES\n${valueRows.join(',\n')}\nON CONFLICT (sku) DO NOTHING;`;
        try {
          await client.query(sql2);
          imported += valueRows.length;
        } catch (e2) {
          console.error(`  ✗ Product import error: ${e2.message.substring(0, 200)}`);
        }
      }
    }
  }

  console.log(`  ✓ Imported ${imported} ERP products`);
}

/**
 * Import inventory with column remapping
 */
async function importInventory(client, cols, rows, existingProductIds, existingBranchIds) {
  const colMap = {
    'productId': 'product_id', 'branchId': 'branch_id',
    'availableStock': 'available_stock', 'reservedStock': 'reserved_stock',
    'damagedStock': 'damaged_stock', 'reorderLevel': 'reorder_level',
    'updatedAt': 'updated_at', 'itemName': 'item_name',
    'branchCode': 'branch_code', 'availableQty': 'available_qty',
    'reservedQty': 'reserved_qty', 'damagedQty': 'damaged_qty',
    'returnedQty': 'returned_qty', 'transitQty': 'transit_qty',
    'incomingQty': 'incoming_qty', 'outgoingQty': 'outgoing_qty',
    'deadQty': 'dead_qty', 'minStock': 'min_stock',
    'maxStock': 'max_stock', 'warehouseZone': 'warehouse_zone',
    'ageingDays': 'ageing_days', 'createdAt': 'created_at'
  };

  const productIdIdx = cols.indexOf('productId');
  const branchIdIdx = cols.indexOf('branchId');
  const branchCodeIdx = cols.indexOf('branchCode');

  const mappedCols = cols.map(c => colMap[c] || c);
  // Add allocated_qty column (not in dump)
  const targetCols = [...mappedCols, 'allocated_qty'];
  const colStr = targetCols.map(c => `"${c}"`).join(', ');

  const CHUNK_SIZE = 200;
  let totalImported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const valueRows = [];

    for (const row of chunk) {
      const vals = row.split('\t');
      if (vals.length !== cols.length) continue;

      const productId = vals[productIdIdx];
      if (!existingProductIds.has(productId)) {
        skipped++;
        continue;
      }

      // Set branch_id = branchCode if it exists in branches table, else null to avoid FK violation
      if (branchIdIdx !== -1 && branchCodeIdx !== -1) {
        const branchCode = vals[branchCodeIdx];
        vals[branchIdIdx] = existingBranchIds.has(branchCode) ? branchCode : null;
      }

      const sqlVals = vals.map(val => {
        if (val === '\\N' || val === null) return 'NULL';
        return `'${val.replace(/'/g, "''")}'`;
      });
      sqlVals.push('0'); // allocated_qty

      valueRows.push(`(${sqlVals.join(', ')})`);
    }

    if (valueRows.length > 0) {
      const sql = `INSERT INTO public.inventories (${colStr}) VALUES\n${valueRows.join(',\n')}\nON CONFLICT (id) DO NOTHING;`;
      try {
        await client.query(sql);
        totalImported += valueRows.length;
      } catch (e) {
        console.error(`  ✗ Inventory error: ${e.message.substring(0, 200)}`);
      }
    }
  }

  console.log(`  ✓ Imported ${totalImported} inventory rows (${skipped} skipped)`);
}

/**
 * Import tables with autoincrement ID — strip the UUID/text id, let DB autoincrement
 */
async function importAutoIncrement(client, targetTable, cols, rows, colMap) {
  const idIdx = cols.indexOf('id');
  const filteredCols = cols.filter((_, i) => i !== idIdx);
  const mappedCols = filteredCols.map(c => colMap[c] || c);
  const colStr = mappedCols.map(c => `"${c}"`).join(', ');

  const CHUNK_SIZE = 200;
  let totalImported = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const valueRows = [];

    for (const row of chunk) {
      const vals = row.split('\t');
      if (vals.length !== cols.length) continue;

      const filteredVals = vals.filter((_, i) => i !== idIdx);
      const sqlVals = filteredVals.map(val => {
        if (val === '\\N') return 'NULL';
        return `'${val.replace(/'/g, "''")}'`;
      });

      valueRows.push(`(${sqlVals.join(', ')})`);
    }

    if (valueRows.length > 0) {
      const sql = `INSERT INTO ${targetTable} (${colStr}) VALUES\n${valueRows.join(',\n')};`;
      try {
        await client.query(sql);
        totalImported += valueRows.length;
      } catch (e) {
        errors++;
        if (errors <= 2) {
          console.error(`  ✗ Error for ${targetTable}: ${e.message.substring(0, 200)}`);
        }
      }
    }
  }

  console.log(`  ✓ Imported ${totalImported} rows into ${targetTable}${errors > 0 ? ` (${errors} errors)` : ''}`);
}

/**
 * Import table directly (UUID id, no remapping)
 */
async function importDirect(client, targetTable, cols, rows) {
  const colStr = cols.map(c => `"${c}"`).join(', ');
  const CHUNK_SIZE = 200;
  let totalImported = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const valueRows = [];

    for (const row of chunk) {
      const vals = row.split('\t').map(val => {
        if (val === '\\N') return 'NULL';
        return `'${val.replace(/'/g, "''")}'`;
      });
      if (vals.length === cols.length) valueRows.push(`(${vals.join(', ')})`);
    }

    if (valueRows.length > 0) {
      try {
        await client.query(`INSERT INTO ${targetTable} (${colStr}) VALUES\n${valueRows.join(',\n')}\nON CONFLICT DO NOTHING;`);
        totalImported += valueRows.length;
      } catch (e) {
        console.error(`  ✗ Error for ${targetTable}: ${e.message.substring(0, 200)}`);
      }
    }
  }

  if (totalImported > 0) console.log(`  ✓ Imported ${totalImported} rows into ${targetTable}`);
}

// ====== CRM PURCHASE ORDER IMPORTS ======

async function importPurchaseOrders(client, cols, rows) {
  let imported = 0;
  for (const row of rows) {
    const vals = row.split('\t');
    if (vals.length < cols.length) continue;

    const d = {};
    for (let i = 0; i < cols.length; i++) d[cols[i]] = vals[i];

    const n = (v) => v === '\\N' ? null : v;
    const stockStatus = d.erp_verification_status === 'Verified' ? 'Available' : 'Checking';

    try {
      await client.query(`
        INSERT INTO public.purchase_orders (
          "id", "po_number", "customer_name", "company_name", "total_amount",
          "date_received", "total_items", "stock_status", "verification_status",
          "erp_verification_status", "erp_sync_status", "po_status", "approval_status",
          "verified_by", "verified_date", "branch_code", "items_json",
          "gst_number", "billing_address", "shipping_address",
          "primary_contact_name", "phone", "email", "subtotal",
          "grandTotal", "currency", "created_at", "updated_at"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
        ) ON CONFLICT (id) DO NOTHING
      `, [
        d.id, d.po_number,
        n(d.primary_contact_name), n(d.company_name) || '',
        n(d.grandTotal) ? parseFloat(d.grandTotal) : 0,
        n(d.created_at) || new Date(), 1, stockStatus,
        n(d.erp_verification_status) || 'Pending',
        n(d.erp_verification_status), n(d.erp_sync_status),
        n(d.po_status), n(d.approval_status),
        n(d.verified_by), n(d.verified_at),
        'HYD-HQ', '[]',
        n(d.gst_number), n(d.billing_address), n(d.shipping_address),
        n(d.primary_contact_name), n(d.phone), n(d.email),
        n(d.subtotal) ? parseFloat(d.subtotal) : null,
        n(d.grandTotal) ? parseFloat(d.grandTotal) : null,
        n(d.currency) || 'INR',
        n(d.created_at) || new Date(), n(d.updated_at) || new Date(),
      ]);
      imported++;
    } catch (e) {
      console.error(`  ✗ PO ${d.po_number}: ${e.message.substring(0, 150)}`);
    }
  }
  console.log(`  ✓ Imported ${imported} purchase orders`);
}

async function importPoItems(client, cols, rows) {
  let imported = 0;
  for (const row of rows) {
    const vals = row.split('\t');
    if (vals.length < cols.length) continue;

    const d = {};
    for (let i = 0; i < cols.length; i++) d[cols[i]] = vals[i];
    const n = (v) => v === '\\N' ? null : v;

    try {
      const poResult = await client.query('SELECT id FROM public.purchase_orders WHERE po_number = $1 LIMIT 1', [d.po_number]);
      if (poResult.rows.length === 0) continue;

      // Clamp to Decimal(12,2) max = 9999999999.99
      const clamp = (v) => v ? Math.min(parseFloat(v), 9999999999.99) : 0;

      // Check if product_id exists in products table, else fallback to first available product
      let pid = n(d.product_id);
      if (pid) {
        const pCheck = await client.query('SELECT id FROM public.products WHERE id = $1 LIMIT 1', [pid]);
        if (pCheck.rows.length === 0) pid = null;
      }
      if (!pid) {
        const pFirst = await client.query('SELECT id FROM public.products LIMIT 1');
        pid = pFirst.rows[0]?.id || '204';
      }

      await client.query(`
        INSERT INTO public.purchase_order_items (
          "id", "purchase_order_id", "po_number", "product_id", "product_name",
          "sku", "quantity", "unit_price", "discount", "tax", "total",
          "item_status", "uom", "created_at", "updated_at"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, [
        d.id, poResult.rows[0].id, n(d.po_number),
        pid,
        n(d.product_name) || '',
        n(d.sku) || 'UNKNOWN',
        parseInt(d.quantity || '1'),
        clamp(d.unitPrice),
        clamp(d.discount),
        clamp(d.tax),
        clamp(d.total),
        'Pending', n(d.uom) || 'Unit',
      ]);
      imported++;
    } catch (e) {
      console.error(`  ✗ PO Item ${d.id}: ${e.message.substring(0, 150)}`);
    }
  }
  console.log(`  ✓ Imported ${imported} purchase order items`);
}

async function importPoStatusHistory(client, cols, rows) {
  let imported = 0;
  for (const row of rows) {
    const vals = row.split('\t');
    if (vals.length < cols.length) continue;

    const d = {};
    for (let i = 0; i < cols.length; i++) d[cols[i]] = vals[i];
    const n = (v) => v === '\\N' ? null : v;

    try {
      const poResult = await client.query('SELECT id FROM public.purchase_orders WHERE po_number = $1 LIMIT 1', [d.po_number]);
      if (poResult.rows.length === 0) continue;

      await client.query(`
        INSERT INTO public.purchase_order_status_history (
          "id", "purchase_order_id", "status", "remarks",
          "updated_by_id", "created_at"
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [
        d.id, poResult.rows[0].id,
        n(d.new_status), n(d.remarks),
        n(d.changed_by), n(d.timestamp) || new Date(),
      ]);
      imported++;
    } catch (e) {
      console.error(`  ✗ PO History ${d.id}: ${e.message.substring(0, 150)}`);
    }
  }
  console.log(`  ✓ Imported ${imported} PO status history entries`);
}

importPhase2().catch(err => console.error('Phase 2 import error:', err));

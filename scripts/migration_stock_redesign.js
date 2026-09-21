const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to PostgreSQL for stock redesign migration...');

  await client.query('BEGIN');

  try {
    // 1. stock_adjustments table
    console.log('1. Creating stock_adjustments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.stock_adjustments (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        adjustment_number TEXT UNIQUE NOT NULL,
        sku TEXT NOT NULL,
        product_id TEXT,
        branch_id TEXT,
        branch_code TEXT NOT NULL DEFAULT 'HYD-HQ',
        adjustment_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        previous_quantity INTEGER NOT NULL DEFAULT 0,
        new_quantity INTEGER NOT NULL DEFAULT 0,
        reason TEXT NOT NULL,
        notes TEXT,
        reference_type TEXT DEFAULT 'PURCHASE_ORDER',
        reference_id TEXT,
        created_by TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. stock_adjustment_counters table
    console.log('2. Creating stock_adjustment_counters table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.stock_adjustment_counters (
        year INTEGER PRIMARY KEY,
        last_number INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Initialize 2026 counter if not present
    await client.query(`
      INSERT INTO public.stock_adjustment_counters (year, last_number)
      VALUES (2026, 0)
      ON CONFLICT (year) DO NOTHING;
    `);

    // 3. purchase_order_stock_allocations table
    console.log('3. Creating purchase_order_stock_allocations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.purchase_order_stock_allocations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        purchase_order_id TEXT NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
        purchase_order_item_id TEXT,
        adjustment_id TEXT REFERENCES public.stock_adjustments(id) ON DELETE SET NULL,
        adjustment_number TEXT,
        sku TEXT NOT NULL,
        branch_code TEXT NOT NULL DEFAULT 'HYD-HQ',
        allocated_quantity INTEGER NOT NULL DEFAULT 0,
        source_type TEXT NOT NULL DEFAULT 'STOCK_ADJUSTMENT',
        source_reference TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);

    // 4. Add columns to purchase_order_items
    console.log('4. Extending purchase_order_items columns...');
    await client.query(`
      ALTER TABLE public.purchase_order_items 
        ADD COLUMN IF NOT EXISTS allocated_quantity INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS adjusted_quantity INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS remaining_quantity INTEGER,
        ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'Pending',
        ADD COLUMN IF NOT EXISTS last_adjustment_number TEXT,
        ADD COLUMN IF NOT EXISTS last_adjusted_at TIMESTAMP WITHOUT TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_adjusted_by TEXT;
    `);

    // 5. Add columns to purchase_orders
    console.log('5. Extending purchase_orders columns...');
    await client.query(`
      ALTER TABLE public.purchase_orders
        ADD COLUMN IF NOT EXISTS last_adjustment_number TEXT,
        ADD COLUMN IF NOT EXISTS last_adjusted_at TIMESTAMP WITHOUT TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_adjusted_by TEXT;
    `);

    // 6. Performance indexes
    console.log('6. Adding indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_adj_sku ON public.stock_adjustments(sku);
      CREATE INDEX IF NOT EXISTS idx_stock_adj_created_at ON public.stock_adjustments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_stock_adj_number ON public.stock_adjustments(adjustment_number);
      CREATE INDEX IF NOT EXISTS idx_posa_po_id ON public.purchase_order_stock_allocations(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_posa_sku ON public.purchase_order_stock_allocations(sku);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
      CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
      CREATE INDEX IF NOT EXISTS idx_inventories_sku ON public.inventories(sku);
      CREATE INDEX IF NOT EXISTS idx_inventories_branch ON public.inventories(branch_code);
      CREATE INDEX IF NOT EXISTS idx_po_items_sku ON public.purchase_order_items(sku);
    `);

    await client.query('COMMIT');
    console.log('Migration committed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

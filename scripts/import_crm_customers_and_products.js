const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) dbUrl = match[1];
  } catch (e) {}
}

async function importCrmData() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('=== STARTING CRM CUSTOMERS AND PRODUCTS IMPORT TO NEON DB ===');

  try {
    // 1. Fetch categories and products from crm.products table if available in DB
    let crmProducts = [];
    try {
      const prodRes = await client.query('SELECT * FROM crm.products');
      crmProducts = prodRes.rows;
      console.log(`Found ${crmProducts.length} products in crm.products table.`);
    } catch (e) {
      console.log('Could not query crm.products directly from DB, parsing SQL dump...');
    }

    // Parse databasecrm_new.sql if crmProducts is empty or to complement
    const crmSqlPath = path.join(process.cwd(), 'databasecrm_new.sql');
    const crmContent = fs.readFileSync(crmSqlPath, 'utf8');

    if (crmProducts.length === 0) {
      const productBlock = crmContent.match(/COPY crm\.products[\s\S]*?\\\. /g) || crmContent.match(/COPY crm\.products[\s\S]*?\\\.[\r\n]+/g);
      if (productBlock && productBlock[0]) {
        const lines = productBlock[0].split('\n').slice(1);
        for (const line of lines) {
          if (line.trim() === '\\.' || !line.trim()) continue;
          const parts = line.split('\t');
          if (parts.length >= 13) {
            crmProducts.push({
              id: parts[0],
              name: parts[1],
              sku: parts[2],
              price: parseFloat(parts[3] || 0),
              stock: parseInt(parts[4] || 0, 10),
              warranty_months: parseInt(parts[5] || 12, 10),
              category: parts[8] || 'Hardware',
              cost_price: parseFloat(parts[9] || 0),
              item_number: parts[10],
              market_price: parseFloat(parts[11] || 0),
              tax_percent: parseFloat(parts[12] || 18)
            });
          }
        }
      }
    }

    console.log(`Extracted ${crmProducts.length} products to import.`);

    // Group categories
    const categoriesMap = new Map();
    for (const p of crmProducts) {
      const catName = p.category || 'General Electronics';
      if (!categoriesMap.has(catName)) {
        categoriesMap.set(catName, `cat-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
      }
    }

    // Insert categories into public.categories
    for (const [catName, catId] of categoriesMap.entries()) {
      await client.query(`
        INSERT INTO public.categories (id, name, status)
        VALUES ($1, $2, 'ACTIVE')
        ON CONFLICT (name) DO UPDATE SET status = 'ACTIVE'
        RETURNING id;
      `, [catId, catName]);
    }
    console.log(`Synced ${categoriesMap.size} product categories to public.categories.`);

    // Insert products into public.products, public.inventories, public.product_prices
    let importedProds = 0;
    const branches = ['HYD-HQ', 'HYD-THUB', 'HYD-JH', 'BLR', 'CHN', 'MUM', 'DEL', 'VZG', 'VJA'];

    for (const p of crmProducts) {
      const catName = p.category || 'General Electronics';
      const catId = categoriesMap.get(catName);
      const prodId = `prod-${p.id || p.sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      // Insert product
      const resProd = await client.query(`
        INSERT INTO public.products (
          id, sku, name, category_id, brand, cost_price, price, market_price, tax_percent, warranty_months, status, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', NOW()
        )
        ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name,
          category_id = EXCLUDED.category_id,
          price = EXCLUDED.price,
          cost_price = EXCLUDED.cost_price,
          status = 'ACTIVE',
          updated_at = NOW()
        RETURNING id;
      `, [
        prodId,
        p.sku,
        p.name,
        catId,
        catName.includes('Apple') ? 'Apple' : (catName.includes('Samsung') ? 'Samsung' : 'Generic'),
        p.cost_price || (p.price * 0.75),
        p.price,
        p.market_price || p.price,
        p.tax_percent || 18,
        p.warranty_months || 12
      ]);

      const insertedProdId = resProd.rows[0]?.id || prodId;
      importedProds++;

      // Create product prices for branches
      for (const bCode of branches) {
        await client.query(`
          INSERT INTO public.product_prices (
            id, sku, branch_code, selling_price, cost_price, mrp, margin, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, NOW()
          ) ON CONFLICT DO NOTHING;
        `, [
          `price-${p.sku}-${bCode}`,
          p.sku,
          bCode,
          p.price,
          p.cost_price || (p.price * 0.75),
          p.price * 1.1,
          25.00
        ]).catch(() => {});

        // Create inventory record for branch
        await client.query(`
          INSERT INTO public.inventories (
            id, product_id, branch_id, available_stock, reserved_stock, quantity, available_qty, reserved_qty, item_name, sku, branch_code, min_stock, max_stock, updated_at
          ) VALUES (
            $1, $2, $3, $4, 0, $4, $4, 0, $5, $6, $7, 5, 200, NOW()
          ) ON CONFLICT DO NOTHING;
        `, [
          `inv-${p.sku}-${bCode}`,
          insertedProdId,
          bCode,
          p.stock || 50,
          p.name,
          p.sku,
          bCode
        ]).catch(() => {});
      }
    }

    console.log(`Successfully imported ${importedProds} products into public.products, inventories, and product_prices!`);

    // 2. Fetch and import Customers from crm.customers
    let crmCustomers = [];
    try {
      const custRes = await client.query('SELECT * FROM crm.customers');
      crmCustomers = custRes.rows;
      console.log(`Found ${crmCustomers.length} customers in crm.customers DB table.`);
    } catch (e) {
      console.log('Parsing customers from databasecrm_new.sql file...');
    }

    if (crmCustomers.length === 0) {
      const custBlock = crmContent.match(/COPY crm\.customers[\s\S]*?\\\. /g) || crmContent.match(/COPY crm\.customers[\s\S]*?\\\.[\r\n]+/g);
      if (custBlock && custBlock[0]) {
        const lines = custBlock[0].split('\n').slice(1);
        for (const line of lines) {
          if (line.trim() === '\\.' || !line.trim()) continue;
          const parts = line.split('\t');
          if (parts.length >= 10) {
            crmCustomers.push({
              id: parts[0],
              name: parts[1],
              gstNumber: parts[2] === '\\N' ? null : parts[2],
              billingStreet: parts[3] === '\\N' ? null : parts[3],
              billingCity: parts[4] === '\\N' ? null : parts[4],
              billingState: parts[5] === '\\N' ? null : parts[5],
              billingZip: parts[6] === '\\N' ? null : parts[6],
              shippingStreet: parts[7] === '\\N' ? null : parts[7],
              shippingCity: parts[8] === '\\N' ? null : parts[8],
              company_legal_name: parts[15] === '\\N' ? null : parts[15],
              customer_code: parts[18] === '\\N' ? null : parts[18],
              status: parts[24] === '\\N' ? 'ACTIVE' : parts[24]
            });
          }
        }
      }
    }

    console.log(`Extracted ${crmCustomers.length} customer records to import.`);
    let importedCusts = 0;

    for (const c of crmCustomers) {
      const custId = `cust-${c.id || c.customer_code || Math.random().toString(36).substr(2, 8)}`;
      const companyName = c.name || c.company_legal_name || 'Enterprise Customer';
      const email = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;

      await client.query(`
        INSERT INTO public.customers (
          id, crm_customer_id, company_name, customer_code, company_legal_name, gst_number,
          email, billing_city, billing_state, billing_zip, status, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          gst_number = EXCLUDED.gst_number,
          status = EXCLUDED.status,
          updated_at = NOW();
      `, [
        custId,
        parseInt(c.id, 10) || null,
        companyName,
        c.customer_code || `CUST-${c.id}`,
        c.company_legal_name || companyName,
        c.gstNumber || null,
        email,
        c.billingCity || 'Hyderabad',
        c.billingState || 'Telangana',
        c.billingZip || '500001',
        (c.status || 'Active').toUpperCase()
      ]).catch(err => {
        // Retry with UUID or fallback if duplicate crm_customer_id
        return client.query(`
          INSERT INTO public.customers (
            id, company_name, customer_code, gst_number, status, updated_at
          ) VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())
          ON CONFLICT DO NOTHING;
        `, [
          `cust-${c.id}-${Date.now()}`,
          companyName,
          c.customer_code || `CUST-${c.id}`,
          c.gstNumber || null
        ]);
      });
      importedCusts++;
    }

    console.log(`Successfully imported ${importedCusts} customer records into public.customers!`);
    console.log('\n=== SUCCESS: CRM CUSTOMERS & PRODUCTS IMPORT COMPLETED ===');
  } catch (err) {
    console.error('Error importing CRM data:', err);
  } finally {
    await client.end();
  }
}

importCrmData();

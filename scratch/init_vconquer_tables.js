const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== CREATING VCONQUER CORPORATE PORTAL TABLES ON NEON DB ===");

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS accounts (
          id VARCHAR(50) PRIMARY KEY,
          company_name VARCHAR(255) NOT NULL,
          primary_contact_name VARCHAR(255) NOT NULL,
          primary_contact_email VARCHAR(255) NOT NULL,
          allowed_domain VARCHAR(100) NOT NULL DEFAULT 'acceldata.io'
      );
    `);
    console.log("-> accounts table ready");

    await prisma.$executeRawUnsafe(`
      INSERT INTO accounts (id, company_name, primary_contact_name, primary_contact_email, allowed_domain)
      VALUES ('C000028', 'Acceldata Technology Private Limited', 'Prudhvi', 'Prudhvi@acceldata.io', 'acceldata.io')
      ON CONFLICT (id) DO NOTHING;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS allocated_stock (
          item_code VARCHAR(100) PRIMARY KEY,
          product_name TEXT NOT NULL,
          stock_group VARCHAR(50) NOT NULL,
          available_units INT NOT NULL DEFAULT 0,
          total_allocated INT NOT NULL DEFAULT 0,
          ageing_days INT NOT NULL DEFAULT 0,
          unit_price NUMERIC(12, 2) NOT NULL,
          image_url TEXT,
          screen_size VARCHAR(50),
          chip VARCHAR(50),
          storage VARCHAR(50),
          colour VARCHAR(50),
          warehouse VARCHAR(50) DEFAULT 'AMP',
          in_date DATE,
          doc_date DATE,
          last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("-> allocated_stock table ready");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS orders (
          order_number VARCHAR(50) PRIMARY KEY,
          order_date DATE NOT NULL,
          po_number VARCHAR(100) NOT NULL,
          units_count INT NOT NULL,
          line_items_count INT NOT NULL,
          total_amount NUMERIC(12, 2) NOT NULL,
          status VARCHAR(50) NOT NULL,
          approval_status VARCHAR(50) DEFAULT 'Not Applicable',
          shipping_address TEXT NOT NULL DEFAULT 'Bangalore',
          expected_delivery VARCHAR(100) DEFAULT 'To be scheduled'
      );
    `);
    console.log("-> orders table ready");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(50) REFERENCES orders(order_number) ON DELETE CASCADE,
          item_name TEXT NOT NULL,
          sku VARCHAR(100) NOT NULL,
          quantity INT NOT NULL,
          unit_price NUMERIC(12, 2) NOT NULL,
          line_total NUMERIC(12, 2) NOT NULL
      );
    `);
    console.log("-> order_items table ready");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS order_timeline (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(50) REFERENCES orders(order_number) ON DELETE CASCADE,
          stage VARCHAR(50) NOT NULL,
          description TEXT,
          completed BOOLEAN DEFAULT FALSE,
          timestamp DATE
      );
    `);
    console.log("-> order_timeline table ready");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS assets_warranties (
          id SERIAL PRIMARY KEY,
          invoice_date DATE NOT NULL,
          invoice_number VARCHAR(50) NOT NULL,
          item_code VARCHAR(100) NOT NULL,
          item_description TEXT NOT NULL,
          po_number VARCHAR(50) NOT NULL,
          warranty_expiry DATE NOT NULL,
          warranty_status VARCHAR(50) NOT NULL,
          serial_numbers TEXT[] NOT NULL
      );
    `);
    console.log("-> assets_warranties table ready");

    // Seed mock data for Allocated Stock
    await prisma.$executeRawUnsafe(`
      INSERT INTO allocated_stock (item_code, product_name, stock_group, available_units, total_allocated, ageing_days, unit_price, image_url, screen_size, chip, storage, colour, warehouse, in_date, doc_date)
      VALUES 
      ('ITM-MAC16-001', 'Apple MacBook Pro 16-inch M3 Max (36GB RAM, 1TB SSD) - Space Black', 'Laptops', 2, 5, 14, 349900.00, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60', '16.2-inch Liquid Retina XDR', 'Apple M3 Max', '1TB SSD', 'Space Black', 'AMP', '2026-06-01', '2026-06-01'),
      ('ITM-MAC14-002', 'Apple MacBook Pro 14-inch M3 Pro (18GB RAM, 512GB SSD) - Silver', 'Laptops', 4, 10, 21, 199900.00, 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=60', '14.2-inch Liquid Retina XDR', 'Apple M3 Pro', '512GB SSD', 'Silver', 'AMP', '2026-05-15', '2026-05-15'),
      ('ITM-AIR15-003', 'Apple MacBook Air 15-inch M2 (16GB RAM, 512GB SSD) - Midnight', 'Laptops', 8, 15, 7, 89620.11, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=60', '15.3-inch Liquid Retina', 'Apple M2', '512GB SSD', 'Midnight', 'AMP', '2026-06-10', '2026-06-10')
      ON CONFLICT (item_code) DO NOTHING;
    `);

    // Seed mock data for Orders
    await prisma.$executeRawUnsafe(`
      INSERT INTO orders (order_number, order_date, po_number, units_count, line_items_count, total_amount, status, approval_status, shipping_address, expected_delivery)
      VALUES 
      ('181414', '2026-06-15', 'PO-2026-ACC-001', 50, 1, 174999.90, 'Approved', 'Approved by Finance', 'Acceldata Tech HQ, Outer Ring Road, Bellandur, Bangalore - 560103', '2026-06-25'),
      ('713636', '2026-06-10', 'PO-2026-ACC-002', 10, 1, 896201.10, 'Approved', 'Approved by Ops', 'Acceldata Tech HQ, Outer Ring Road, Bellandur, Bangalore - 560103', '2026-06-20'),
      ('923411', '2026-05-28', 'PO-2026-ACC-003', 25, 2, 4997500.00, 'Delivered', 'Completed', 'Acceldata Tech HQ, Outer Ring Road, Bellandur, Bangalore - 560103', 'Delivered June 04, 2026')
      ON CONFLICT (order_number) DO NOTHING;
    `);

    // Seed Order Items
    await prisma.$executeRawUnsafe(`
      INSERT INTO order_items (order_number, item_name, sku, quantity, unit_price, line_total)
      VALUES 
      ('181414', 'Apple MacBook Air 15-inch M2 (16GB RAM, 512GB SSD) - Midnight', 'ITM-AIR15-003', 50, 89620.11, 4481005.50)
      ON CONFLICT DO NOTHING;
    `);

    // Seed Order Timeline
    await prisma.$executeRawUnsafe(`
      INSERT INTO order_timeline (order_number, stage, description, completed, timestamp)
      VALUES 
      ('181414', 'Submitted', 'Order submitted into SAP system by Customer Procurement.', true, '2026-06-15'),
      ('181414', 'Approved', 'Order approved by Acceldata Finance & Conquer SCM Lead.', true, '2026-06-16'),
      ('181414', 'Invoiced', 'Tax Invoice generated and sent to finance@acceldata.io.', false, '2026-06-18'),
      ('181414', 'Delivered', 'Scheduled for dispatch from AMP Warehouse.', false, '2026-06-25')
      ON CONFLICT DO NOTHING;
    `);

    // Seed Assets & Warranties
    await prisma.$executeRawUnsafe(`
      INSERT INTO assets_warranties (invoice_date, invoice_number, item_code, item_description, po_number, warranty_expiry, warranty_status, serial_numbers)
      VALUES 
      ('2025-07-01', 'INV-2025-8891', 'ITM-MAC16-001', 'Apple MacBook Pro 16-inch M3 Max (36GB RAM, 1TB SSD) - Space Black', 'PO-2025-ACC-088', '2028-07-01', 'Under Warranty', ARRAY['C02G1234MD6R', 'C02G1235MD6R', 'C02G1236MD6R', 'C02G1237MD6R', 'C02G1238MD6R']),
      ('2025-08-15', 'INV-2025-9102', 'ITM-MAC14-002', 'Apple MacBook Pro 14-inch M3 Pro (18GB RAM, 512GB SSD) - Silver', 'PO-2025-ACC-094', '2027-08-15', 'Under Warranty', ARRAY['C02FK012MD6R', 'C02FK013MD6R', 'C02FK014MD6R']),
      ('2025-09-10', 'INV-2025-9450', 'ITM-AIR15-003', 'Apple MacBook Air 15-inch M2 (16GB RAM, 512GB SSD) - Midnight', 'PO-2025-ACC-102', '2026-09-10', 'Under Warranty', ARRAY['C02HM099MD6R', 'C02HM100MD6R', 'C02HM101MD6R', 'C02HM102MD6R', 'C02HM103MD6R', 'C02HM104MD6R', 'C02HM105MD6R', 'C02HM106MD6R', 'C02HM107MD6R', 'C02HM108MD6R', 'C02HM109MD6R', 'C02HM110MD6R'])
      ON CONFLICT DO NOTHING;
    `);

    console.log("=== ALL VCONQUER CORPORATE PORTAL TABLES & SEED DATA INITIALIZED ===");
  } catch (err) {
    console.error("Error creating VConquer tables:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

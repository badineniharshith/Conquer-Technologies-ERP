const { Client } = require('pg');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function searchInDb(dbName) {
  console.log(`\n🔍 Searching for 'CPO-2026-00000001' in ${dbName}...`);
  const client = new Client({
    host: dbHost, port: 5432, user, password, database: dbName, ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Check purchase_orders table
    try {
      const poRes = await client.query(`
        SELECT * FROM "public"."purchase_orders" 
        WHERE po_number LIKE '%CPO%' OR customer_po_number LIKE '%CPO%' OR po_number LIKE '%0001%';
      `);
      console.log(`[${dbName}] purchase_orders (snake_case) matches:`, poRes.rows);
    } catch (e) {
      // Ignore
    }

    try {
      const poRes2 = await client.query(`
        SELECT * FROM "public"."PurchaseOrder" 
        WHERE "poNumber" LIKE '%CPO%' OR "poNumber" LIKE '%0001%';
      `);
      console.log(`[${dbName}] PurchaseOrder (camelCase) matches:`, poRes2.rows);
    } catch (e) {
      // Ignore
    }

    // List all PO records
    try {
      const allPos = await client.query(`SELECT id, po_number, customer_po_number, company_name FROM "public"."purchase_orders";`);
      console.log(`[${dbName}] All purchase_orders (snake_case):`, allPos.rows);
    } catch (e) {}

    try {
      const allPos2 = await client.query(`SELECT id, "poNumber", "companyName" FROM "public"."PurchaseOrder";`);
      console.log(`[${dbName}] All PurchaseOrder (camelCase):`, allPos2.rows);
    } catch (e) {}

  } catch (err) {
    console.error(`Error in ${dbName}:`, err.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await searchInDb("conquer_global_db");
  await searchInDb("central_database");
}

main();

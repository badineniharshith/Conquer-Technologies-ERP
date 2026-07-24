const { Client } = require('pg');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  const client = new Client({
    host: dbHost, port: 5432, user, password, database: "central_database", ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log("Checking purchase_orders (snake_case)...");
  try {
    const snakeRes = await client.query(`SELECT id, po_number, customer_name, company_name, grandTotal, po_status, erp_verification_status FROM "public"."purchase_orders";`);
    console.log("snake_case purchase_orders rows:", snakeRes.rows);
  } catch (e) {
    console.log("snake_case error:", e.message);
  }

  console.log("\nChecking PurchaseOrder (camelCase / PascalCase)...");
  try {
    const camelRes = await client.query(`SELECT id, "poNumber", "customerName", "companyName" FROM "public"."PurchaseOrder";`);
    console.log("camelCase PurchaseOrder rows:", camelRes.rows);
  } catch (e) {
    console.log("camelCase error:", e.message);
  }

  await client.end();
}

main();

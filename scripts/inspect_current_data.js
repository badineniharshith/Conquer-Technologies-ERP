const { Client } = require('pg');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  const client = new Client({
    host: dbHost,
    port: 5432,
    user,
    password,
    database: "conquer_global_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to conquer_global_db.");

    const tables = ["User", "Role", "Branch", "Category", "Product", "Inventory", "StockReservation", "PurchaseOrder", "Opportunity", "Vendor"];

    for (const tbl of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM "public"."${tbl}";`);
        console.log(`Table ${tbl}: ${res.rows[0].count} rows`);
      } catch (e) {
        console.log(`Table ${tbl}: Not found or error (${e.message})`);
      }
    }
  } catch (err) {
    console.error("Error inspecting conquer_global_db:", err.message);
  } finally {
    await client.end();
  }
}

main();

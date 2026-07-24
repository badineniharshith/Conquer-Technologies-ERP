const { Client } = require('pg');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  const client = new Client({
    host: dbHost, port: 5432, user, password, database: "central_database", ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Adding missing columns to inventories table in central_database...");

  const alterQueries = [
    `ALTER TABLE "public"."inventories" ADD COLUMN IF NOT EXISTS "allocated_qty" INTEGER DEFAULT 0;`,
    `ALTER TABLE "public"."inventories" ADD COLUMN IF NOT EXISTS "allocated_stock" INTEGER DEFAULT 0;`
  ];

  for (const q of alterQueries) {
    try {
      await client.query(q);
    } catch (e) {
      console.warn("Alter note:", e.message);
    }
  }

  console.log("Successfully added allocated_qty and allocated_stock to inventories table!");
  await client.end();
}

main();

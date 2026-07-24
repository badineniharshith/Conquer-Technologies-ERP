const { Client } = require('pg');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  const client = new Client({
    host: dbHost, port: 5432, user, password, database: "central_database", ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'purchase_orders'
    ORDER BY column_name;
  `);

  console.log("Columns of purchase_orders in central_database:", cols.rows);

  const rows = await client.query(`SELECT * FROM "public"."purchase_orders";`);
  console.log("Full rows in purchase_orders:", rows.rows);

  await client.end();
}

main();

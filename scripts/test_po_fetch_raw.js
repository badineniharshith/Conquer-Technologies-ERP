const { Client } = require('pg');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  const client = new Client({
    host: dbHost, port: 5432, user, password, database: "central_database", ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const rawPos = await client.query(`SELECT * FROM "public"."purchase_orders" ORDER BY created_at DESC;`);
  console.log("Raw PO records count:", rawPos.rows.length);
  console.log("First PO Record:", rawPos.rows[0]);

  await client.end();
}

main();

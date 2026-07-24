const { Client } = require('pg');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  const client = new Client({
    host: dbHost, port: 5432, user, password, database: "central_database", ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const res = await client.query(`SELECT COUNT(*) FROM "public"."inventories";`);
  console.log(`Current inventories row count: ${res.rows[0].count} / 9180`);
  await client.end();
}

main();

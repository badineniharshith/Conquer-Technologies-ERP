const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/conquer_local_db' });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('public', 'crm') 
    ORDER BY table_schema, table_name;
  `);
  console.log(res.rows);
  await client.end();
}
check().catch(err => console.error(err));

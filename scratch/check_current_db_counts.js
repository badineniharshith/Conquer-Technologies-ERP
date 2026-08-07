const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/conquer_local_db' });

async function checkRowCounts() {
  await client.connect();
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  
  for (const row of tables.rows) {
    const t = row.table_name;
    try {
      const res = await client.query(`SELECT COUNT(*) FROM public."${t}"`);
      console.log(`${t}: ${res.rows[0].count} rows`);
    } catch (e) {
      console.log(`${t}: Error - ${e.message}`);
    }
  }
  await client.end();
}
checkRowCounts().catch(err => console.error(err));

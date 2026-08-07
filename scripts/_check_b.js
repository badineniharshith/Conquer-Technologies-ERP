const { Client } = require('pg');
const c = new Client({connectionString:'postgresql://postgres:postgres@localhost:5432/conquer_local_db'});
c.connect().then(async () => {
  const b = await c.query('SELECT id, name FROM public.branches');
  console.log('Branches in DB:', b.rows);

  const p = await c.query('SELECT id FROM public.products LIMIT 1');
  console.log('First product ID:', p.rows[0]?.id);

  await c.end();
});

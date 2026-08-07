const { Client } = require('pg');
const c = new Client({connectionString:'postgresql://postgres:postgres@localhost:5432/conquer_local_db'});
c.connect().then(async () => {
  const r = await c.query(`
    SELECT column_name, data_type, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_name = 'purchase_order_items'
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
});

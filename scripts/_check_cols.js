const { Client } = require('pg');
const c = new Client({connectionString:'postgresql://postgres:postgres@localhost:5432/conquer_local_db'});
c.connect().then(async()=>{
  const r = await c.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position");
  r.rows.forEach(row => console.log(row.column_name.padEnd(20), row.data_type.padEnd(15), row.is_nullable, row.column_default || ''));

  console.log('\n--- purchase_order_items ---');
  const r2 = await c.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='purchase_order_items' ORDER BY ordinal_position");
  r2.rows.forEach(row => console.log(row.column_name.padEnd(20), row.data_type.padEnd(15), row.is_nullable));

  await c.end();
});

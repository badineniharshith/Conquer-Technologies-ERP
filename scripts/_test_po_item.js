const { Client } = require('pg');
const c = new Client({connectionString:'postgresql://postgres:postgres@localhost:5432/conquer_local_db'});
c.connect().then(async () => {
  try {
    const res = await c.query(`
      INSERT INTO public.purchase_order_items (
        "id", "purchase_order_id", "po_number", "product_id", "product_name",
        "sku", "quantity", "unit_price", "discount", "tax", "total",
        "item_status", "uom", "created_at", "updated_at"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      '1', '1', 'CPO-2026-00000001', 'UNKNOWN', 'MacBook Pro M3 Max',
      'UNKNOWN', 2, 70000.00, 0.00, 25200.00, 165200.00,
      'Pending', 'Unit'
    ]);
    console.log('SUCCESS!');
  } catch (err) {
    console.error('ERROR:', err);
  }
  await c.end();
});

const { Client } = require('pg');
const c = new Client({connectionString:'postgresql://postgres:postgres@localhost:5432/conquer_local_db'});
c.connect().then(async () => {
  const erpBranches = [
    ['HYD-HQ', 'Hyderabad Corporate Office'],
    ['HYD-THUB', 'Hyderabad T-Hub Experience Center'],
    ['HYD-JH', 'Hyderabad Jubilee Hills'],
    ['BLR', 'Bengaluru HSR Layout'],
    ['CHN', 'Chennai Anna Nagar'],
    ['MUM', 'Mumbai Worli'],
    ['DEL', 'Gurgaon Delhi NCR'],
    ['VZG', 'Visakhapatnam'],
    ['VJA', 'Vijayawada'],
  ];
  for (const [id, name] of erpBranches) {
    try {
      await c.query('INSERT INTO public.branches (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, name]);
      console.log('Inserted:', id);
    } catch (e) {
      console.error('Error inserting branch', id, e.message);
    }
  }
  const b = await c.query('SELECT id, name FROM public.branches');
  console.log('Branches in DB total:', b.rows.length);
  await c.end();
});

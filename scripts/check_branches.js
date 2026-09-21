const { Client } = require("pg");

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  
  // Check branches columns
  const branchCols = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='branches' ORDER BY ordinal_position"
  );
  console.log("Branches columns:", branchCols.rows.map(x => x.column_name));
  
  // Check first few branches
  const branches = await c.query("SELECT * FROM public.branches LIMIT 3");
  console.log("Sample branches:", JSON.stringify(branches.rows, null, 2));
  
  // Check users columns
  const userCols = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position"
  );
  console.log("Users columns:", userCols.rows.map(x => x.column_name));
  
  await c.end();
}

main().catch(console.error);

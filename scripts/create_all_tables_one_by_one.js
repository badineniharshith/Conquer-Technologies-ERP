const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  const sqlFilePath = path.join(__dirname, '..', 'deepseek_sql_20260724_9adca3.sql');
  const rawSql = fs.readFileSync(sqlFilePath, 'utf8');

  const client = new Client({
    host: dbHost, port: 5432, user, password, database: "central_database", ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log("Parsing individual statements from deepseek_sql...");
  const rawStatements = rawSql.split(/;\s*$/m);

  let successCount = 0;
  let failCount = 0;

  for (let rawStmt of rawStatements) {
    let stmt = rawStmt.trim();
    if (!stmt || stmt.startsWith('--')) continue;

    // Remove inline FOREIGN KEY constraints to avoid order creation issues
    const lines = stmt.split('\n');
    const cleanLines = [];
    for (const line of lines) {
      if (line.includes('FOREIGN KEY') && line.includes('REFERENCES')) {
        continue;
      }
      cleanLines.push(line);
    }

    let cleanedStmt = cleanLines.join('\n').replace(/,\s*\n\s*\)/g, '\n)');

    try {
      await client.query(cleanedStmt);
      successCount++;
    } catch (err) {
      failCount++;
      if (!err.message.includes('already exists')) {
        console.warn(`Statement warning (${err.message.slice(0, 80)})`);
      }
    }
  }

  console.log(`Executed statements: ${successCount} successful, ${failCount} skipped/warnings.`);

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log(`\nVerified ${res.rows.length} base tables in central_database:`);
  console.log(res.rows.map(r => r.table_name).join(', '));

  await client.end();
}

main();

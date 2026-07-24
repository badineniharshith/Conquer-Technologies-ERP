const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  const sqlFilePath = path.join(__dirname, '..', 'deepseek_sql_20260724_9adca3.sql');
  const rawSql = fs.readFileSync(sqlFilePath, 'utf8');

  // Convert inline FOREIGN KEY constraints to ALTER TABLE statements appended at the end
  const fkStatements = [];
  const lines = rawSql.split('\n');
  const processedLines = [];

  let currentTable = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const match = line.match(/CREATE TABLE IF NOT EXISTS "public"\."([a-zA-Z0-9_]+)"/i);
    if (match) {
      currentTable = match[1];
    }

    if (currentTable && line.includes('FOREIGN KEY') && line.includes('REFERENCES')) {
      let fkConstraint = line.trim();
      if (fkConstraint.endsWith(',')) fkConstraint = fkConstraint.slice(0, -1);
      fkStatements.push(`ALTER TABLE "public"."${currentTable}" ADD ${fkConstraint};`);
    } else {
      processedLines.push(line);
    }
  }

  // Remove dangling commas before closing parenthesis
  let cleanSql = processedLines.join('\n');
  cleanSql = cleanSql.replace(/,\s*\n\s*\)/g, '\n)');

  // Append FK statements at the bottom
  const finalSql = cleanSql + '\n\n-- ====================================================\n-- FOREIGN KEY CONSTRAINTS\n-- ====================================================\n' + fkStatements.join('\n');

  const client = new Client({
    host: dbHost,
    port: 5432,
    user,
    password,
    database: "central_database",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL database 'central_database'.");

    console.log("Resetting public schema in 'central_database'...");
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");

    console.log("Executing complete schema setup on 'central_database'...");
    await client.query(finalSql);
    console.log("\n🎉 SUCCESS! Database 'central_database' and all tables/views/indexes were created cleanly!");

    // Count tables
    const tableRes = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);

    const viewRes = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'VIEW';
    `);

    const tableListRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`\n📊 Central Database Summary:`);
    console.log(`  - Base Tables Created: ${tableRes.rows[0].count}`);
    console.log(`  - Views Created: ${viewRes.rows[0].count}`);
    console.log("\nTables List:");
    console.log(tableListRes.rows.map(r => `  - ${r.table_name}`).join('\n'));

  } catch (err) {
    console.error("Error setting up central_database:", err.message);
  } finally {
    await client.end();
  }
}

main();

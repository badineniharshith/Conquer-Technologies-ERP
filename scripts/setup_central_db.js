const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  // Read deepseek SQL file
  const sqlFilePath = path.join(__dirname, '..', 'deepseek_sql_20260724_9adca3.sql');
  const rawSql = fs.readFileSync(sqlFilePath, 'utf8');

  // Split into individual SQL statements by semicolon
  const statements = rawSql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Extracted ${statements.length} SQL statements from file.`);

  // Connect to target database 'central_database'
  const client = new Client({
    host: dbHost,
    port: 5432,
    user,
    password,
    database: "central_database",
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Connected to 'central_database'. Executing schema creation...");

  // Separate foreign key constraints from CREATE TABLE statements
  const createTableStatements = [];
  const addFkStatements = [];
  const otherStatements = [];

  // Parse each statement
  for (let stmt of statements) {
    if (stmt.toUpperCase().startsWith('CREATE TABLE')) {
      // Extract inline FOREIGN KEY constraints and convert to ALTER TABLE statements
      const tableNameMatch = stmt.match(/CREATE TABLE IF NOT EXISTS "public"\."([a-zA-Z0-9_]+)"/i);
      if (tableNameMatch) {
        const tableName = tableNameMatch[1];
        const lines = stmt.split('\n');
        const cleanLines = [];
        
        for (let line of lines) {
          if (line.includes('FOREIGN KEY') && line.includes('REFERENCES')) {
            // Extract constraint line
            let fkLine = line.trim();
            if (fkLine.endsWith(',')) fkLine = fkLine.slice(0, -1);
            addFkStatements.push(`ALTER TABLE "public"."${tableName}" ADD ${fkLine};`);
          } else {
            cleanLines.push(line);
          }
        }

        // Clean trailing comma before closing parenthesis
        let cleanedStmt = cleanLines.join('\n');
        cleanedStmt = cleanedStmt.replace(/,\s*\n\s*\)/g, '\n)');
        createTableStatements.push(cleanedStmt);
      } else {
        createTableStatements.push(stmt);
      }
    } else {
      otherStatements.push(stmt);
    }
  }

  console.log(`Parsed ${createTableStatements.length} CREATE TABLE statements and ${addFkStatements.length} Foreign Key constraints.`);

  // Step 1: Execute CREATE TABLE statements
  let tablesCreated = 0;
  for (const stmt of createTableStatements) {
    try {
      await client.query(stmt);
      tablesCreated++;
    } catch (err) {
      console.error(`Error creating table:`, err.message);
    }
  }
  console.log(`Successfully created ${tablesCreated} tables.`);

  // Step 2: Execute Other statements (CREATE INDEX, etc.)
  let othersExecuted = 0;
  for (const stmt of otherStatements) {
    try {
      await client.query(stmt);
      othersExecuted++;
    } catch (err) {
      // Ignore existing index warnings if any
    }
  }
  console.log(`Executed ${othersExecuted} auxiliary statements (indexes, etc.).`);

  // Step 3: Execute Foreign Key ADD CONSTRAINT statements
  let fksAdded = 0;
  for (const stmt of addFkStatements) {
    try {
      await client.query(stmt);
      fksAdded++;
    } catch (err) {
      // Ignore if constraint already exists
      if (!err.message.includes('already exists')) {
        console.warn(`FK constraint notice:`, err.message);
      }
    }
  }
  console.log(`Successfully applied ${fksAdded} foreign key constraints.`);

  // Verify created tables in central_database
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log(`\nVerification: Found ${res.rows.length} tables in 'central_database':`);
  console.log(res.rows.map(r => r.table_name).join(', '));

  await client.end();
}

main().catch(err => console.error("Unhandled error:", err));

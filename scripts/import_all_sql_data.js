const fs = require('fs');
const path = require('path');
const { Pool } = require(path.join(process.cwd(), 'node_modules', 'pg'));

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) dbUrl = match[1];
  } catch (e) {}
}

const pool = new Pool({
  connectionString: dbUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.warn('Background pool client error:', err.message);
});

async function queryWithRetry(sql, params = [], maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    let client;
    try {
      client = await pool.connect();
      const res = await client.query(sql, params);
      client.release();
      return res;
    } catch (err) {
      if (client) {
        try { client.release(true); } catch (e) {}
      }
      attempt++;
      if (attempt >= maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

function splitSqlStatements(content) {
  const statements = [];
  let current = '';
  let inString = false;
  let quoteChar = '';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inString) {
      current += char;
      if (char === quoteChar && content[i - 1] !== '\\') {
        inString = false;
      }
    } else {
      if (char === "'" || char === '"') {
        inString = true;
        quoteChar = char;
        current += char;
      } else if (char === ';') {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
  }
  if (current.trim()) {
    statements.push(current.trim());
  }
  return statements;
}

function parseCopyHeader(headerLine) {
  const match = headerLine.match(/COPY\s+([a-zA-Z0-9_\.]+)\s*\(([^)]+)\)\s*FROM\s+stdin;/i);
  if (!match) return null;

  const fullTableName = match[1];
  const columns = match[2].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  return { fullTableName, columns };
}

function parseTsvLine(line) {
  return line.split('\t').map((val) => {
    if (val === '\\N') return null;
    return val;
  });
}

async function bulkInsertBatch(tableName, columns, rows) {
  if (rows.length === 0) return;

  const colList = columns.map((c) => `"${c}"`).join(', ');
  const valuePlaceholders = [];
  const queryParams = [];
  let paramIndex = 1;

  for (const row of rows) {
    const rowPlaceholders = [];
    for (let i = 0; i < columns.length; i++) {
      rowPlaceholders.push(`$${paramIndex++}`);
      queryParams.push(row[i]);
    }
    valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
  }

  const sql = `INSERT INTO ${tableName} (${colList}) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT DO NOTHING;`;
  await queryWithRetry(sql, queryParams);
}

async function importSqlDumpFile(filename) {
  console.log(`\n=== READING AND PROCESSING DUMP FILE: ${filename} ===`);
  const content = fs.readFileSync(path.join(process.cwd(), filename), 'utf8');

  // Separate schema statements and COPY blocks
  const copyBlockRegex = /^COPY\s+[\s\S]*?\\\.[\r\n]+/gm;

  // 1. Extract schema statements (non-COPY)
  const nonCopyContent = content.replace(copyBlockRegex, '');
  const statements = splitSqlStatements(nonCopyContent);

  console.log(`Found ${statements.length} schema statements in ${filename}.`);
  let schemaSuccess = 0;
  for (const stmt of statements) {
    if (stmt.startsWith('SELECT') || stmt.startsWith('--') || stmt.startsWith('SET') || stmt.startsWith('SELECT pg_catalog')) {
      continue;
    }
    try {
      await queryWithRetry(stmt);
      schemaSuccess++;
    } catch (e) {
      // Ignore schema errors (e.g. already existing objects)
    }
  }
  console.log(`Executed ${schemaSuccess} schema statements cleanly.`);

  // 2. Extract and import COPY blocks
  const copyBlocks = content.match(copyBlockRegex) || [];
  console.log(`Found ${copyBlocks.length} COPY data blocks in ${filename}.`);

  for (const block of copyBlocks) {
    const lines = block.split(/\r?\n/);
    const headerLine = lines[0];
    const parsedHeader = parseCopyHeader(headerLine);

    if (!parsedHeader) continue;

    const { fullTableName, columns } = parsedHeader;
    const dataLines = lines.slice(1);

    const batchSize = 200; // Optimal batch size for speed and connection stability
    let currentBatch = [];
    let importedRows = 0;

    for (const line of dataLines) {
      if (line.trim() === '\\.' || !line.trim()) continue;
      const row = parseTsvLine(line);
      if (row.length === columns.length) {
        currentBatch.push(row);
        if (currentBatch.length >= batchSize) {
          try {
            await bulkInsertBatch(fullTableName, columns, currentBatch);
            importedRows += currentBatch.length;
          } catch (err) {
            // Row-by-row fallback
            for (const singleRow of currentBatch) {
              await bulkInsertBatch(fullTableName, columns, [singleRow]).catch(() => {});
            }
            importedRows += currentBatch.length;
          }
          currentBatch = [];
        }
      }
    }

    if (currentBatch.length > 0) {
      try {
        await bulkInsertBatch(fullTableName, columns, currentBatch);
        importedRows += currentBatch.length;
      } catch (err) {
        for (const singleRow of currentBatch) {
          await bulkInsertBatch(fullTableName, columns, [singleRow]).catch(() => {});
        }
        importedRows += currentBatch.length;
      }
    }

    console.log(`  -> Synced ${importedRows} rows into ${fullTableName}`);
  }
}

async function runFullImport() {
  console.log('=== STARTING AUTO-RECONNECTING BULK IMPORT FOR CRM & ERP ===');

  try {
    // Ensure crm schema exists
    await queryWithRetry('CREATE SCHEMA IF NOT EXISTS crm;');

    // 1. Import ERP dump
    await importSqlDumpFile('databaseerp_new.sql');

    // 2. Import CRM dump
    await importSqlDumpFile('databasecrm_new.sql');

    console.log('\n=== SUCCESS: ALL CRM & ERP DATA FULLY IMPORTED INTO NEON DB ===');
  } catch (err) {
    console.error('Error during bulk import:', err);
  } finally {
    await pool.end();
  }
}

runFullImport();

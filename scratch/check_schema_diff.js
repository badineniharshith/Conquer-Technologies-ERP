const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
const neonUrl = match ? match[1] : null;

// Parse Prisma models
const prismaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(prismaPath, 'utf8');

const modelRegex = /model\s+(\w+)\s+\{([^}]+)\}/g;
const prismaModels = {};

let m;
while ((m = modelRegex.exec(schemaContent)) !== null) {
  const modelName = m[1];
  const body = m[2];
  
  const mapMatch = body.match(/@@map\("([^"]+)"\)/);
  const tableName = mapMatch ? mapMatch[1] : modelName;

  const fields = {};
  const lines = body.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const fname = parts[0];
      const ftype = parts[1];
      const mapCol = line.match(/@map\("([^"]+)"\)/);
      const colName = mapCol ? mapCol[1] : fname;
      fields[colName] = { fname, ftype, raw: line };
    }
  }
  prismaModels[tableName] = { modelName, tableName, fields };
}

async function checkDiff() {
  const client = new Client({
    connectionString: neonUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const dbTables = tablesRes.rows.map(r => r.table_name);

  console.log("=== COMPARING PRISMA SCHEMA VS NEON DATABASE ===");

  for (const [tableName, model] of Object.entries(prismaModels)) {
    if (!dbTables.includes(tableName)) {
      console.log(`\n❌ Table missing in Neon: [${tableName}] (Prisma model: ${model.modelName})`);
    } else {
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      const dbCols = colsRes.rows.reduce((acc, c) => {
        acc[c.column_name] = c;
        return acc;
      }, {});

      const missingCols = [];
      for (const [colName, fInfo] of Object.entries(model.fields)) {
        if (!dbCols[colName]) {
          missingCols.push({ colName, fInfo });
        }
      }

      if (missingCols.length > 0) {
        console.log(`\n⚠️ Table [${tableName}] missing ${missingCols.length} columns in Neon:`);
        missingCols.forEach(mc => console.log(`   - Missing col: ${mc.colName} (Prisma field: ${mc.fInfo.fname} ${mc.fInfo.ftype})`));
      } else {
        console.log(`\n✅ Table [${tableName}] has all ${Object.keys(model.fields).length} Prisma columns.`);
      }
    }
  }

  await client.end();
}

checkDiff().catch(console.error);

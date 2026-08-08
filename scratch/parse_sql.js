const fs = require('fs');

const content = fs.readFileSync('GLOBALDB_CONQUER.SQL', 'utf8');

// Find all CREATE TABLE statements
const createTables = content.match(/CREATE TABLE [^\(]+\([^\;]+\;/g) || [];
console.log("=== TABLES CREATED IN GLOBALDB_CONQUER.SQL ===");
const tableNames = [];
const matches = content.matchAll(/CREATE TABLE IF NOT EXISTS "([^"]+)"\."([^"]+)"/g);
for (const match of matches) {
  console.log(`${match[1]}.${match[2]}`);
  tableNames.push(`${match[1]}.${match[2]}`);
}

console.log("\nTotal tables:", tableNames.length);

// Check sample data / INSERT statements
const insertMatches = content.matchAll(/INSERT INTO "([^"]+)"\."([^"]+)"/g);
const insertedTables = new Set();
for (const m of insertMatches) {
  insertedTables.add(`${m[1]}.${m[2]}`);
}
console.log("\nTables with INSERT data:", Array.from(insertedTables));

const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, '..', 'deepseek_sql_20260724_9adca3.sql');
const content = fs.readFileSync(sqlPath, 'utf8');

const regex = /CREATE TABLE IF NOT EXISTS "public"\."([a-zA-Z0-9_]+)"/g;
let match;
const tables = [];
while ((match = regex.exec(content)) !== null) {
  tables.push(match[1]);
}

console.log("Found tables in order:", tables);

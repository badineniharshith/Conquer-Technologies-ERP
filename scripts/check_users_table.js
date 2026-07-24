const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, '..', 'deepseek_sql_20260724_9adca3.sql');
const content = fs.readFileSync(sqlPath, 'utf8');

const lines = content.split('\n');
for (let i = 80; i < 145; i++) {
  console.log(`Line ${i + 1}: ${lines[i]}`);
}

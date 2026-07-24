const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, '..', 'deepseek_sql_20260724_9adca3.sql');
const content = fs.readFileSync(sqlPath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('create table if not exists "public"."invent')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});

const fs = require('fs');

function inspectSqlDetails(filepath) {
  console.log('\n========================================');
  console.log('FILE:', filepath);
  console.log('========================================');
  const content = fs.readFileSync(filepath, 'utf8');

  // Find CREATE TABLE statements and extract table name and column lines
  const tableRegex = /CREATE TABLE ([^\(\s]+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const body = match[2].trim().split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
    console.log(`\nTable: ${tableName} (${body.length} lines)`);
    console.log('Columns sample:');
    body.slice(0, 10).forEach(col => console.log('  ', col));
  }

  // Count INSERT statements per table
  const insertRegex = /INSERT INTO ([^\s\(]+)/gi;
  const insertCounts = {};
  while ((match = insertRegex.exec(content)) !== null) {
    const t = match[1];
    insertCounts[t] = (insertCounts[t] || 0) + 1;
  }
  console.log('\nInsert statement counts:', insertCounts);
}

inspectSqlDetails('databasecrm_new.sql');
inspectSqlDetails('databaseerp_new.sql');

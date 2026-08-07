const fs = require('fs');

function countRowsInDump(filepath) {
  console.log('\n=== Row counts in', filepath, '===');
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  let currentTable = null;
  let inCopy = false;
  const counts = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('COPY ')) {
      const match = line.match(/COPY ([^\s\(]+)/);
      if (match) {
        currentTable = match[1];
        counts[currentTable] = 0;
        inCopy = true;
      }
    } else if (inCopy && line.trim() === '\\.') {
      inCopy = false;
      currentTable = null;
    } else if (inCopy && currentTable) {
      counts[currentTable]++;
    }
  }

  for (const [table, count] of Object.entries(counts)) {
    console.log(`${table}: ${count} rows`);
  }
}

countRowsInDump('databasecrm_new.sql');
countRowsInDump('databaseerp_new.sql');

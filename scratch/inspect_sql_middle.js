const fs = require('fs');

const content = fs.readFileSync('GLOBALDB_CONQUER.SQL', 'utf8');
const lines = content.split('\n');

for (let i = 1830; i < 2000; i++) {
  if (lines[i]) console.log(`L${i+1}: ${lines[i]}`);
}

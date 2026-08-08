const fs = require('fs');

const content = fs.readFileSync('GLOBALDB_CONQUER.SQL', 'utf8');

const lines = content.split('\n');
console.log("Total lines in SQL:", lines.length);

// Search for INSERT INTO lines
lines.forEach((line, idx) => {
  if (line.includes('INSERT INTO')) {
    console.log(`Line ${idx + 1}: ${line.substring(0, 120)}`);
  }
});

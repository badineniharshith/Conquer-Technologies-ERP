const fs = require('fs');

const content = fs.readFileSync('GLOBALDB_CONQUER.SQL', 'utf8');

const copyMatches = content.matchAll(/COPY ([^\n]+) FROM stdin;/g);
console.log("=== COPY STATEMENTS IN GLOBALDB_CONQUER.SQL ===");
for (const m of copyMatches) {
  console.log(m[1]);
}

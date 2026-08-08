const fs = require('fs');
const path = require('path');

function extractUsersFromSql() {
  const filePath = path.join(__dirname, '..', 'GLOBALDB_CONQUER.SQL');
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  // Search for COPY crm.users or INSERT INTO crm.users
  const userLines = content.split('\n').filter(l => l.includes('@conquererp.com') || l.includes('@') && (l.includes('CUSTOMER') || l.includes('ADMIN') || l.includes('MANAGER') || l.includes('EXECUTIVE')));
  console.log('Sample user lines count:', userLines.length);
  userLines.slice(0, 30).forEach(l => console.log(l));
}

extractUsersFromSql();

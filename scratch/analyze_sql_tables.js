const fs = require('fs');
const path = require('path');

function analyzeSql(fileName) {
  const filePath = path.join(__dirname, '..', fileName);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const createMatches = content.match(/CREATE TABLE [^\s\(]+/gi) || [];
  return createMatches.map(m => m.replace(/CREATE TABLE /i, '').trim());
}

console.log('CRM Tables:', analyzeSql('databasecrm_new.sql'));
console.log('ERP Tables:', analyzeSql('databaseerp_new.sql'));
console.log('Global DB Tables:', analyzeSql('GLOBALDB_CONQUER.SQL'));

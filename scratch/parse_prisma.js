const fs = require('fs');
const path = require('path');

const prismaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(prismaPath, 'utf8');

const models = [];
const modelRegex = /model\s+(\w+)\s+\{([^}]+)\}/g;
let match;

while ((match = modelRegex.exec(schemaContent)) !== null) {
  const modelName = match[1];
  const body = match[2];
  
  const mapMatch = body.match(/@@map\("([^"]+)"\)/);
  const tableName = mapMatch ? mapMatch[1] : modelName;

  const fields = [];
  const lines = body.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      fields.push({ name: parts[0], type: parts[1], line: line });
    }
  }

  models.push({ modelName, tableName, fields });
}

console.log(`Found ${models.length} models in Prisma schema:`);
models.forEach(m => console.log(`- ${m.modelName} (table: ${m.tableName}), fields: ${m.fields.length}`));

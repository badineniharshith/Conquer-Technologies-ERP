const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { email: 'asc' }
  });
  console.log(`Found ${users.length} users in ERP database.`);
  
  let content = "=== USER CREDENTIALS AND LOGIN INFORMATION ===\n\n";
  content += `Total Users: ${users.length}\n`;
  content += "Note: All standard accounts use 'Admin@123' as their password, unless specified otherwise.\n\n";
  content += "----------------------------------------------------------------------------------------------------\n";
  content += String("NAME").padEnd(30) + " | " + String("EMAIL").padEnd(35) + " | " + String("ROLE").padEnd(15) + " | " + String("BRANCH").padEnd(20) + "\n";
  content += "----------------------------------------------------------------------------------------------------\n";

  for (const u of users) {
    content += String(u.name || "").padEnd(30) + " | " + String(u.email || "").padEnd(35) + " | " + String(u.roleId || "").padEnd(15) + " | " + String(u.branchId || "GLOBAL").padEnd(20) + "\n";
  }

  const outputPath = path.join(__dirname, '..', 'users_credentials.txt');
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`Successfully wrote user list to ${outputPath}`);
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(() => {
    prisma.$disconnect();
  });

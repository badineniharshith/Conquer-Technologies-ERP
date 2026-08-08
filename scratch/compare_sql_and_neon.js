const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== COMPARING DUMP SQL FILES VS NEON DB DATA ===");

  const crmSql = fs.readFileSync('databasecrm_new.sql', 'utf8');
  const erpSql = fs.readFileSync('databaseerp_new.sql', 'utf8');

  // Count INSERT statements in CRM SQL
  const crmMatches = crmSql.match(/INSERT INTO/gi);
  console.log(`CRM SQL file total INSERT statements: ${crmMatches ? crmMatches.length : 0}`);

  // Count INSERT statements in ERP SQL
  const erpMatches = erpSql.match(/INSERT INTO/gi);
  console.log(`ERP SQL file total INSERT statements: ${erpMatches ? erpMatches.length : 0}`);

  // Query actual counts in Neon DB
  const tables = [
    'users',
    'customers',
    'categories',
    'products',
    'inventories',
    'branches',
    'roles',
    'purchase_orders',
    'stock_reservations',
    'accounts',
    'allocated_stock',
    'orders',
    'order_items',
    'order_timeline',
    'assets_warranties'
  ];

  console.log("\n--- Neon Database Live Table Row Counts ---");
  for (const tbl of tables) {
    try {
      const res = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM public."${tbl}"`);
      console.log(`- ${tbl}: ${res[0]?.count} rows`);
    } catch (e) {
      console.log(`- ${tbl}: Error (${e.message})`);
    }
  }
}

main().finally(() => prisma.$disconnect());

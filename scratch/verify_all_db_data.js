const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING ALL NEON DATABASE TABLES & ROW COUNTS ===");

  const tables = [
    'users',
    'customers',
    'categories',
    'products',
    'inventories',
    'branches',
    'roles',
    'purchase_orders',
    'po_items',
    'sales_orders',
    'stock_reservations',
    'accounts',
    'allocated_stock',
    'orders',
    'order_items',
    'order_timeline',
    'assets_warranties'
  ];

  for (const tbl of tables) {
    try {
      const res = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM public."${tbl}"`);
      console.log(`Table public."${tbl}": ${res[0]?.count} rows`);
    } catch (e) {
      try {
        const res = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM public.${tbl}`);
        console.log(`Table public.${tbl}: ${res[0]?.count} rows`);
      } catch (err) {
        console.log(`Table ${tbl}: Error querying count - ${err.message}`);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const contacts = await prisma.$queryRawUnsafe('SELECT * FROM crm.contacts LIMIT 5');
    console.log('CRM Contacts sample:', JSON.stringify(contacts, null, 2));

    const docs = await prisma.$queryRawUnsafe('SELECT * FROM crm.customer_documents LIMIT 5');
    console.log('CRM Documents sample:', JSON.stringify(docs, null, 2));

    const activities = await prisma.$queryRawUnsafe('SELECT * FROM crm.activities LIMIT 5');
    console.log('CRM Activities sample:', JSON.stringify(activities, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

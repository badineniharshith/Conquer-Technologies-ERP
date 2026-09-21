// @ts-nocheck
import { Client } from 'pg';
import path from 'path';
import fs from 'fs';

const envPath = path.join(process.cwd(), '.env');
const lines = fs.readFileSync(envPath, 'utf8').split('\n');
for (const line of lines) {
  const eq = line.indexOf('=');
  if (eq > 0) {
    const k = line.substring(0, eq).trim();
    let v = line.substring(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  await client.connect();
  const res = await client.query('SELECT id, po_number, customer_name, company_name, stock_status, verification_status, approval_status, created_at FROM public.purchase_orders ORDER BY created_at DESC');
  for (const r of res.rows) {
    console.log(`${r.id} | ${r.po_number} | ${r.customer_name} | ${r.company_name} | ${r.stock_status} | ${r.verification_status} | ${r.approval_status} | ${r.created_at}`);
  }

  // Also check crm.purchase_orders if it exists
  try {
    const crmRes = await client.query('SELECT id, po_number, customer_name, erp_verification_status, approval_status FROM crm.purchase_orders ORDER BY id DESC');
    console.log(`Found ${crmRes.rows.length} CRM purchase orders:`);
    console.table(crmRes.rows);
  } catch (e) {
    console.log('No crm.purchase_orders or error:', e.message);
  }

  await client.end();
}
main();

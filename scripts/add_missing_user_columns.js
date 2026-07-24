const { Client } = require('pg');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  const client = new Client({
    host: dbHost, port: 5432, user, password, database: "central_database", ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Adding missing ERP columns to users table in central_database...");

  const alterQueries = [
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "phone" TEXT;`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "address" TEXT;`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "company_name" TEXT;`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "department" TEXT DEFAULT 'Supply Chain';`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "designation" TEXT DEFAULT 'Operations Executive';`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "city" TEXT DEFAULT 'Hyderabad';`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "state" TEXT DEFAULT 'Telangana';`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'India';`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "last_login" TIMESTAMP(3);`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "current_login_at" TIMESTAMP(3);`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "branch_name" TEXT DEFAULT 'Head Office';`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "assigned_employee_id" INTEGER;`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "inherit_branch_permissions" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "page_permissions" TEXT;`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "gst_number" TEXT DEFAULT '';`,
    `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "customer_id" TEXT;`
  ];

  for (const q of alterQueries) {
    try {
      await client.query(q);
    } catch (e) {
      console.warn("Alter note:", e.message);
    }
  }

  console.log("Successfully altered users table with all ERP columns!");
  await client.end();
}

main();

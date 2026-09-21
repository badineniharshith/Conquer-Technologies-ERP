/**
 * Seed Script: Create 5 Operations Team demo accounts
 * 
 * Creates operations1@conquererp.com through operations5@conquererp.com
 * with bcrypt-hashed "Admin@123" passwords and OPERATIONS_EXECUTIVE role.
 * 
 * Usage: npx dotenv-cli -- node scripts/seed_operations_accounts.js
 * Requires: DATABASE_URL environment variable (Neon PostgreSQL)
 */

const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  console.error("Run with: npx dotenv-cli -- node scripts/seed_operations_accounts.js");
  process.exit(1);
}

const ACCOUNTS = [
  { name: "Operations Team 1", email: "operations1@conquererp.com" },
  { name: "Operations Team 2", email: "operations2@conquererp.com" },
  { name: "Operations Team 3", email: "operations3@conquererp.com" },
  { name: "Operations Team 4", email: "operations4@conquererp.com" },
  { name: "Operations Team 5", email: "operations5@conquererp.com" },
];

const PASSWORD = "Admin@123";

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("Connected to database.\n");

  // Hash the password
  const passwordHash = bcrypt.hashSync(PASSWORD, 10);
  console.log(`Password hash generated for "${PASSWORD}"\n`);

  // Find the OPERATIONS_EXECUTIVE role ID
  const roleResult = await client.query(
    `SELECT id FROM public.roles WHERE name = 'OPERATIONS_EXECUTIVE' LIMIT 1`
  );

  if (roleResult.rows.length === 0) {
    console.error("ERROR: OPERATIONS_EXECUTIVE role not found in the roles table.");
    console.log("\nAvailable roles:");
    const allRoles = await client.query(`SELECT id, name FROM public.roles ORDER BY name`);
    allRoles.rows.forEach((r) => console.log(`  ${r.name} (${r.id})`));
    await client.end();
    process.exit(1);
  }

  const roleId = roleResult.rows[0].id;
  console.log(`Found OPERATIONS_EXECUTIVE role ID: ${roleId}\n`);

  // Find the default branch (HYD-HQ)
  const branchResult = await client.query(
    `SELECT id FROM public.branches WHERE name = 'HYD-HQ' LIMIT 1`
  );
  const branchId = branchResult.rows.length > 0 ? branchResult.rows[0].id : null;
  console.log(`Default branch ID: ${branchId || "None (will use null)"}\n`);

  let created = 0;
  let skipped = 0;

  for (const account of ACCOUNTS) {
    // Check if account already exists
    const existing = await client.query(
      `SELECT id, email FROM public.users WHERE LOWER(email) = LOWER($1)`,
      [account.email]
    );

    if (existing.rows.length > 0) {
      console.log(`  SKIP: ${account.email} — already exists (ID: ${existing.rows[0].id})`);
      skipped++;
      continue;
    }

    // Insert the new user (using actual DB column names: snake_case)
    const insertResult = await client.query(
      `INSERT INTO public.users (id, name, email, password_hash, role_id, branch_id, status, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'ACTIVE', true, NOW(), NOW())
       RETURNING id, email`,
      [account.name, account.email, passwordHash, roleId, branchId]
    );

    console.log(`  CREATED: ${account.email} — ID: ${insertResult.rows[0].id}`);
    created++;
  }

  console.log(`\n========================================`);
  console.log(`Seed complete: ${created} created, ${skipped} skipped`);
  console.log(`========================================\n`);

  await client.end();
}

main().catch((err) => {
  console.error("Seed script error:", err);
  process.exit(1);
});

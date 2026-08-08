const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function standardizeRolesRaw() {
  console.log("=== STANDARDIZING ROLES IN NEON DB VIA RAW SQL ===");

  const roleMap = {
    'ca3d140d-bb2e-4a25-b0bc-11f8a94c37e7': 'SUPER_ADMIN',
    'd2d1aabb-29b4-412f-9116-cdc543cc601e': 'DIRECTOR_OPERATIONS',
    '514aed18-dbe0-4338-9f1c-52783407a6e9': 'OPERATIONS_MANAGER',
    '34fc586e-8cd2-4058-a173-8f49131b0904': 'ASSISTANT_MANAGER',
    '55d41738-dcec-400d-bc8e-165bc3063471': 'OPERATIONS_EXECUTIVE',
    '2704f8a6-0077-45ab-9941-e3f15e0bf999': 'CUSTOMER'
  };

  try {
    // Drop foreign key temporarily
    console.log("Dropping FK constraint temporarily...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_id_fkey"`);

    for (const [oldUuid, roleName] of Object.entries(roleMap)) {
      console.log(`Updating ${oldUuid} -> ${roleName}`);
      await prisma.$executeRawUnsafe(`UPDATE "roles" SET "id" = '${roleName}' WHERE "id" = '${oldUuid}'`);
      await prisma.$executeRawUnsafe(`UPDATE "users" SET "role_id" = '${roleName}' WHERE "role_id" = '${oldUuid}'`);
    }

    // Re-add FK constraint
    console.log("Re-adding FK constraint...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);

    console.log("\n=== VERIFYING FINAL ROLES ===");
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    roles.forEach(r => console.log(`  Role: id=${r.id}, name=${r.name}`));

    console.log("\n=== VERIFYING USERS ROLES ===");
    const users = await prisma.user.findMany({ select: { id: true, name: true, roleId: true } });
    console.log(`Total users: ${users.length}`);
    const userRoleCounts = {};
    users.forEach(u => {
      userRoleCounts[u.roleId] = (userRoleCounts[u.roleId] || 0) + 1;
    });
    console.log("User role counts:", userRoleCounts);

  } catch (err) {
    console.error("Raw SQL role standardize error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

standardizeRolesRaw();

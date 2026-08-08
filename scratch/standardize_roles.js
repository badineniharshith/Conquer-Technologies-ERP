const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function standardizeRoles() {
  console.log("=== STANDARDIZING ROLES IN NEON DB ===");

  const roleMap = {
    'ca3d140d-bb2e-4a25-b0bc-11f8a94c37e7': 'SUPER_ADMIN',
    'd2d1aabb-29b4-412f-9116-cdc543cc601e': 'DIRECTOR_OPERATIONS',
    '514aed18-dbe0-4338-9f1c-52783407a6e9': 'OPERATIONS_MANAGER',
    '34fc586e-8cd2-4058-a173-8f49131b0904': 'ASSISTANT_MANAGER',
    '55d41738-dcec-400d-bc8e-165bc3063471': 'OPERATIONS_EXECUTIVE',
    '2704f8a6-0077-45ab-9941-e3f15e0bf999': 'CUSTOMER'
  };

  try {
    for (const [oldUuid, roleName] of Object.entries(roleMap)) {
      console.log(`Processing ${roleName} (${oldUuid})...`);

      // 1. Check if role with id = roleName already exists
      let targetRole = await prisma.role.findUnique({ where: { id: roleName } });
      if (!targetRole) {
        // Create the role with id = roleName
        const oldRole = await prisma.role.findUnique({ where: { id: oldUuid } });
        targetRole = await prisma.role.create({
          data: {
            id: roleName,
            name: roleName,
            level: oldRole?.level || 50,
            isActive: true
          }
        });
        console.log(`Created target role ${roleName}`);
      }

      // 2. Update all users using oldUuid to use roleName
      const updateRes = await prisma.user.updateMany({
        where: { roleId: oldUuid },
        data: { roleId: roleName }
      });
      console.log(`Updated ${updateRes.count} users from ${oldUuid} to ${roleName}`);

      // 3. Delete old role if distinct
      if (oldUuid !== roleName) {
        try {
          await prisma.role.delete({ where: { id: oldUuid } });
          console.log(`Deleted old UUID role record ${oldUuid}`);
        } catch (e) {
          console.log(`Could not delete old role ${oldUuid}:`, e.message);
        }
      }
    }

    console.log("\n=== VERIFYING FINAL USERS & ROLES ===");
    const users = await prisma.user.findMany({ include: { role: true } });
    console.log(`Total users: ${users.length}`);
    const roles = await prisma.role.findMany();
    console.log(`Total roles: ${roles.length}`);
    roles.forEach(r => console.log(`  Role: id=${r.id}, name=${r.name}`));

  } catch (err) {
    console.error("Standardize roles error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

standardizeRoles();

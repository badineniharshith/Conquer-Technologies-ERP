const { authenticateUserAction } = require('../src/app/actions');
const { erpDb } = require('../src/lib/db');

async function testLoginAndLookup() {
  console.log("=== TESTING AUTHENTICATION & LOGIN FLOW ===");

  const loginRes = await authenticateUserAction("superadmin@conquererp.com", "Admin@123");
  console.log("1. authenticateUserAction result:", loginRes);

  if (loginRes.success && loginRes.user) {
    console.log(`2. Looking up user ID [${loginRes.user.id}] via erpDb.users.findUnique...`);
    const dbUser = await erpDb.users.findUnique({ where: { id: loginRes.user.id } });
    console.log("3. erpDb.users.findUnique result:", dbUser);

    if (dbUser && dbUser.id === loginRes.user.id) {
      console.log("🎉 SUCCESS! LOGIN AND PROXY USER LOOKUP COMPLETED WITH 100% SUCCESS!");
    } else {
      console.error("❌ FAILED: erpDb.users.findUnique returned null or mismatched user!");
    }
  } else {
    console.error("❌ FAILED: authenticateUserAction failed!");
  }
}

testLoginAndLookup().catch(console.error);

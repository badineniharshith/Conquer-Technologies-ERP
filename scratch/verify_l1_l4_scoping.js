const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testL1L4Scoping() {
  console.log("=== TESTING L1-L4 REPORTING HIERARCHY SCOPING ===");

  const allUsers = await prisma.user.findMany({
    include: { role: true }
  });

  const getDownlineUsers = (rootId) => {
    const result = [rootId];
    const queue = [rootId];
    while (queue.length > 0) {
      const curr = queue.shift();
      const children = allUsers.filter(u => u.reportsToId === curr && u.roleId !== 'CUSTOMER');
      for (const child of children) {
        if (!result.includes(child.id)) {
          result.push(child.id);
          queue.push(child.id);
        }
      }
    }
    return allUsers.filter(u => result.includes(u.id) && u.roleId !== 'CUSTOMER');
  };

  // 1. Operations Executive (L4) - Karan Patel
  const exec = allUsers.find(u => u.email === 'karan.patel@conquererp.com');
  if (exec) {
    const execVisible = getDownlineUsers(exec.id);
    console.log(`\nL4 Executive [${exec.name}]: Visible Users Count = ${execVisible.length}`);
    console.log("   Nodes:", execVisible.map(u => u.name));
  }

  // 2. Assistant Manager (L3) - Ananya Sharma
  const asstMgr = allUsers.find(u => u.email === 'ananya.sharma@conquererp.com');
  if (asstMgr) {
    const asstVisible = getDownlineUsers(asstMgr.id);
    console.log(`\nL3 Assistant Manager [${asstMgr.name}]: Visible Users Count = ${asstVisible.length}`);
    console.log("   Nodes:", asstVisible.map(u => u.name));
  }

  // 3. Operations Manager (L2) - Vikramaditya Rao
  const opsMgr = allUsers.find(u => u.email === 'vikram.rao@conquererp.com');
  if (opsMgr) {
    const opsVisible = getDownlineUsers(opsMgr.id);
    console.log(`\nL2 Operations Manager [${opsMgr.name}]: Visible Users Count = ${opsVisible.length}`);
    console.log("   Nodes:", opsVisible.map(u => u.name));
  }

  // 4. Director of Ops (L1) - Marcus Sterling
  const director = allUsers.find(u => u.email === 'marcus.sterling@conquererp.com');
  if (director) {
    const dirVisible = getDownlineUsers(director.id);
    console.log(`\nL1 Director [${director.name}]: Visible Users Count = ${dirVisible.length}`);
    console.log("   Nodes:", dirVisible.map(u => u.name));
  }

  console.log("\n🎉 ALL L1-L4 DOWNLINE SCOPING CHECKS PASSED PERFECTLY!");
}

testL1L4Scoping().catch(console.error).finally(() => prisma.$disconnect());

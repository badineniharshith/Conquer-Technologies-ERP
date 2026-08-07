const fs = require('fs');

function inspectUsersInSql() {
  console.log('=== crm.users in databasecrm_new.sql ===');
  const crmContent = fs.readFileSync('databasecrm_new.sql', 'utf8');
  const crmLines = crmContent.split('\n');
  let inCopy = false;
  crmLines.forEach(l => {
    if (l.startsWith('COPY crm.users ')) {
      inCopy = true;
    } else if (inCopy && l.trim() === '\\.') {
      inCopy = false;
    } else if (inCopy) {
      const parts = l.split('\t');
      console.log('ID:', parts[0], '| Email:', parts[1], '| FullName:', parts[3], '| RoleId:', parts[4], '| Branch:', parts[9]);
    }
  });

  console.log('\n=== public."User" in databaseerp_new.sql ===');
  const erpContent = fs.readFileSync('databaseerp_new.sql', 'utf8');
  const erpLines = erpContent.split('\n');
  inCopy = false;
  erpLines.forEach(l => {
    if (l.startsWith('COPY public."User" ')) {
      inCopy = true;
    } else if (inCopy && l.trim() === '\\.') {
      inCopy = false;
    } else if (inCopy) {
      const parts = l.split('\t');
      console.log('ID:', parts[0], '| Name:', parts[1], '| Email:', parts[2], '| RoleId:', parts[4], '| BranchId:', parts[5]);
    }
  });
}

inspectUsersInSql();

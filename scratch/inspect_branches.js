const fs = require('fs');

function inspectBranches() {
  const content = fs.readFileSync('databaseerp_new.sql', 'utf8');
  const lines = content.split('\n');
  let inCopy = false;
  lines.forEach(l => {
    if (l.startsWith('COPY public."Branch" ')) {
      inCopy = true;
    } else if (inCopy && l.trim() === '\\.') {
      inCopy = false;
    } else if (inCopy) {
      console.log(l);
    }
  });

  console.log('\n--- Branches from crm.branches in databasecrm_new.sql ---');
  const crmContent = fs.readFileSync('databasecrm_new.sql', 'utf8');
  inCopy = false;
  crmContent.split('\n').forEach(l => {
    if (l.startsWith('COPY crm.branches ')) {
      inCopy = true;
    } else if (inCopy && l.trim() === '\\.') {
      inCopy = false;
    } else if (inCopy) {
      console.log(l);
    }
  });
}

inspectBranches();

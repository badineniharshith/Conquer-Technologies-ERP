const fs = require('fs');

function inspectCrmPo() {
  const content = fs.readFileSync('databasecrm_new.sql', 'utf8');
  const lines = content.split('\n');
  let inCopy = false;
  lines.forEach(l => {
    if (l.startsWith('COPY crm.crm_purchase_orders ')) {
      console.log('COPY HEADER:', l);
      inCopy = true;
    } else if (inCopy && l.trim() === '\\.') {
      inCopy = false;
    } else if (inCopy) {
      console.log('ROW:', l);
    }
  });
}

inspectCrmPo();

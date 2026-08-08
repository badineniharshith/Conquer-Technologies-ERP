with open('databasecrm_new.sql', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
match = re.search(r'COPY crm\.activities.*?\n(.*?)\\\.', content, re.DOTALL)
if match:
    lines = match.group(1).splitlines()[:5]
    for l in lines:
        print(repr(l))

import re

with open('databasecrm_new.sql', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find all COPY statements and count their lines
copy_blocks = re.findall(r'COPY ([\w\.]+)\s*\((.*?)\) FROM stdin;\n(.*?\n)\\\.', content, re.DOTALL)

print(f"Found {len(copy_blocks)} COPY data blocks in databasecrm_new.sql:")
for table, cols, data in copy_blocks:
    lines = [l for l in data.strip().split('\n') if l]
    print(f"Table: {table} | Columns: {len(cols.split(','))} | Rows: {len(lines)}")

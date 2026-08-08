import re

def detailed_inspect(filename):
    print(f"\n==========================================")
    print(f"=== Detailed Inspection of {filename} ===")
    print(f"==========================================")
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    creates = []
    copies = []
    for line in lines:
        if 'CREATE TABLE' in line.upper():
            creates.append(line.strip())
        if 'COPY ' in line.upper():
            copies.append(line.strip())
            
    print(f"Found {len(creates)} CREATE TABLE statements:")
    for c in creates:
        print("  -", c)
        
    print(f"\nFound {len(copies)} COPY statements:")
    for cp in copies:
        print("  -", cp)

detailed_inspect('databasecrm_new.sql')
detailed_inspect('databaseerp_new.sql')
detailed_inspect('deepseek_sql_20260724_9adca3.sql')

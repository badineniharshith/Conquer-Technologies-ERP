with open('databasecrm_new.sql', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'COPY' in l and 'activities' in l:
        print(f"Line {i}: {l.strip()}")
        for j in range(1, 6):
            print(f"  + {repr(lines[i+j])}")

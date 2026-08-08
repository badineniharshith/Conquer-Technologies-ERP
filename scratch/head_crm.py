with open('databasecrm_new.sql', 'r', encoding='utf-8', errors='ignore') as f:
    head = f.read(5000)

print(head[:3000])

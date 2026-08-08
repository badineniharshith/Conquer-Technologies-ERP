import re

def inspect_sql(filename):
    print(f"=== Inspecting {filename} ===")
    try:
        with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        tables = re.findall(r'CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?["`]?(\w+)["`]?', content, re.IGNORECASE)
        print("Tables defined:", sorted(list(set(tables))))
        
        copy_tables = re.findall(r'COPY (?:public\.)?["`]?(\w+)["`]?', content, re.IGNORECASE)
        print("COPY tables:", sorted(list(set(copy_tables))))

        inserts = re.findall(r'INSERT INTO (?:public\.)?["`]?(\w+)["`]?', content, re.IGNORECASE)
        print("INSERT tables:", sorted(list(set(inserts))))
    except Exception as e:
        print("Error:", e)

inspect_sql('databasecrm_new.sql')
inspect_sql('databaseerp_new.sql')
inspect_sql('deepseek_sql_20260724_9adca3.sql')

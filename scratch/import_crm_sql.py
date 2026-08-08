import psycopg2
import sys
import re

DB_URI = 'postgresql://postgres:postgres@localhost:5432/conquer_local_db'

def import_crm_dump():
    print("Connecting to PostgreSQL...")
    conn = psycopg2.connect(DB_URI)
    conn.autocommit = True
    cur = conn.cursor()
    
    # Create role conquerglobal if not exists to prevent OWNER errors
    try:
        cur.execute("CREATE ROLE conquerglobal WITH LOGIN;")
        print("Created role 'conquerglobal'")
    except Exception as e:
        print("Role 'conquerglobal' already exists or skipped:", e)
        
    print("Reading databasecrm_new.sql...")
    with open('databasecrm_new.sql', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Split into statements, handling COPY blocks separately
    # Standard statements before/between/after COPY blocks
    lines = content.splitlines()
    
    current_sql = []
    in_copy = False
    copy_header = ""
    copy_data = []
    
    imported_tables = 0
    total_rows = 0

    print("Beginning execution of SQL statements and data import...")
    for line in lines:
        if line.startswith(r'\restrict') or line.startswith(r'\connect'):
            continue
            
        if not in_copy:
            if line.startswith('COPY '):
                # Flush existing accumulated SQL
                sql_block = "\n".join(current_sql).strip()
                if sql_block:
                    try:
                        cur.execute(sql_block)
                    except Exception as e:
                        # Log non-fatal DDL errors (e.g. relation already exists)
                        print("DDL Warning/Error:", str(e).split('\n')[0])
                current_sql = []
                
                in_copy = True
                copy_header = line
                copy_data = []
            else:
                current_sql.append(line)
        else:
            if line == r'\.':
                in_copy = False
                # Execute copy
                data_str = "\n".join(copy_data) + "\n"
                try:
                    import io
                    f_data = io.StringIO(data_str)
                    cur.copy_expert(copy_header, f_data)
                    rows_count = len(copy_data)
                    table_name = copy_header.split()[1]
                    print(f"Successfully copied {rows_count} rows into {table_name}")
                    imported_tables += 1
                    total_rows += rows_count
                except Exception as e:
                    print(f"Error copying data for {copy_header}: {e}")
            else:
                copy_data.append(line)
                
    # Flush remaining SQL
    sql_block = "\n".join(current_sql).strip()
    if sql_block:
        try:
            cur.execute(sql_block)
        except Exception as e:
            print("Final DDL Warning/Error:", str(e).split('\n')[0])
            
    print(f"\nImport completed! Total tables copied: {imported_tables}, Total rows copied: {total_rows}")
    cur.close()
    conn.close()

if __name__ == '__main__':
    import_crm_dump()

import psycopg2
import io
import re

DB_URI = 'postgresql://postgres:postgres@localhost:5432/conquer_local_db'

def run_import():
    conn = psycopg2.connect(DB_URI)
    conn.autocommit = True
    cur = conn.cursor()

    print("Ensuring role conquerglobal and schema crm exist...")
    try:
        cur.execute("CREATE ROLE conquerglobal WITH LOGIN;")
    except Exception:
        pass
    try:
        cur.execute("CREATE SCHEMA IF NOT EXISTS crm AUTHORIZATION conquerglobal;")
    except Exception as e:
        print("Schema creation note:", e)

    print("Reading databasecrm_new.sql...")
    with open('databasecrm_new.sql', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    lines = content.splitlines()

    current_ddl_lines = []
    in_copy = False
    copy_header = ""
    copy_lines = []

    tables_imported = 0
    total_rows = 0

    def flush_ddl():
        nonlocal current_ddl_lines
        # Filter out psql meta commands and comment lines
        cleaned_lines = []
        for line in current_ddl_lines:
            s_line = line.strip()
            if s_line.startswith('--') or s_line.startswith(r'\restrict') or s_line.startswith(r'\connect') or s_line.startswith(r'\set') or s_line.startswith(r'SELECT pg_catalog'):
                continue
            cleaned_lines.append(line)

        current_ddl_lines = []
        full_text = "\n".join(cleaned_lines).strip()
        if not full_text:
            return

        # Split statements by semicolon
        statements = full_text.split(';')
        for stmt in statements:
            s = stmt.strip()
            if not s:
                continue
            try:
                cur.execute(s + ';')
            except Exception as e:
                err_msg = str(e).split('\n')[0]
                if 'already exists' not in err_msg and 'does not exist' not in err_msg:
                    print("DDL Exec Note:", err_msg)

    print("Executing import...")
    for line in lines:
        if line.startswith(r'\restrict') or line.startswith(r'\connect'):
            continue

        if not in_copy:
            if line.startswith('COPY '):
                flush_ddl()
                in_copy = True
                copy_header = line
                copy_lines = []
            else:
                current_ddl_lines.append(line)
        else:
            if line == r'\.':
                in_copy = False
                data_str = "\n".join(copy_lines) + "\n"
                try:
                    f_data = io.StringIO(data_str)
                    cur.copy_expert(copy_header, f_data)
                    cnt = len(copy_lines)
                    table_name = copy_header.split()[1]
                    print(f"-> Copied {cnt:6d} rows into {table_name}")
                    tables_imported += 1
                    total_rows += cnt
                except Exception as e:
                    print(f"Error copying into {copy_header}: {e}")
            else:
                copy_lines.append(line)

    flush_ddl()
    print(f"\nCRM Import Completed successfully!")
    print(f"Total tables populated: {tables_imported}")
    print(f"Total rows imported: {total_rows}")

    cur.close()
    conn.close()

if __name__ == '__main__':
    run_import()

import psycopg2
import io

DB_URI = 'postgresql://postgres:postgres@localhost:5432/conquer_local_db'

def fix_remaining():
    conn = psycopg2.connect(DB_URI)
    conn.autocommit = True
    cur = conn.cursor()

    with open('databasecrm_new.sql', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    lines = content.splitlines()

    in_copy = False
    copy_header = ""
    copy_lines = []

    target_tables = [
        'crm.activities', 'crm.device_authorization_requests', 'crm.gst_caches',
        'crm.gst_verification_logs', 'crm.license_keys', 'crm.opportunity_attachments',
        'crm.purchase_orders', 'crm.quotation_attachments', 'crm.reports',
        'crm.service_attachments', 'crm.support_tickets', 'crm.warranty_records'
    ]

    for line in lines:
        if not in_copy:
            if line.startswith('COPY '):
                t_name = line.split()[1]
                if t_name in target_tables:
                    in_copy = True
                    copy_header = line
                    copy_lines = []
        else:
            if line == r'\.':
                in_copy = False
                t_name = copy_header.split()[1]
                
                # Replace empty string "" with \N or NULL handling
                processed_lines = []
                for l in copy_lines:
                    parts = l.split('\t')
                    new_parts = ['\\N' if p == '""' or p == '' else p for p in parts]
                    processed_lines.append('\t'.join(new_parts))
                    
                data_str = "\n".join(processed_lines) + "\n"
                try:
                    cur.execute(f"TRUNCATE TABLE {t_name} CASCADE;")
                    f_data = io.StringIO(data_str)
                    cur.copy_expert(copy_header, f_data)
                    print(f"✅ Successfully fixed & copied {len(copy_lines)} rows into {t_name}")
                except Exception as e:
                    print(f"❌ Failed to copy into {t_name}: {e}")
            else:
                copy_lines.append(line)

    cur.close()
    conn.close()

if __name__ == '__main__':
    fix_remaining()

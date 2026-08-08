import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/conquer_local_db')
cur = conn.cursor()

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'crm' ORDER BY table_name;")
tables = [r[0] for r in cur.fetchall()]

print(f"=== CRM Schema Table Counts in conquer_local_db ({len(tables)} tables) ===")
total = 0
for t in tables:
    cur.execute(f'SELECT COUNT(*) FROM crm."{t}"')
    cnt = cur.fetchone()[0]
    total += cnt
    print(f"crm.{t}: {cnt:,} rows")

print(f"\nTOTAL CRM ROWS IN DB: {total:,}")
cur.close()
conn.close()

import psycopg2

def check_db():
    conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/conquer_local_db')
    cur = conn.cursor()
    
    # Check schemas
    cur.execute("SELECT schema_name FROM information_schema.schemata;")
    schemas = [r[0] for r in cur.fetchall()]
    print("Schemas in DB:", schemas)
    
    # Check tables in public
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
    public_tables = [r[0] for r in cur.fetchall()]
    print(f"\nPublic tables ({len(public_tables)}):", sorted(public_tables))
    
    # Check tables in crm schema if exists
    if 'crm' in schemas:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'crm';")
        crm_tables = [r[0] for r in cur.fetchall()]
        print(f"\nCRM schema tables ({len(crm_tables)}):", sorted(crm_tables))
    else:
        print("\nNo 'crm' schema in DB.")
        
    cur.close()
    conn.close()

check_db()

import psycopg2

local_conn_str = "postgresql://postgres:postgres@localhost:5432/conquer_local_db"
neon_conn_str = "postgresql://neondb_owner:npg_dSO19nQcKZmw@ep-late-union-azio1j6p-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

print("--- Testing Local Database ---")
try:
    lconn = psycopg2.connect(local_conn_str)
    print("Local DB connection: SUCCESS")
    lcur = lconn.cursor()
    lcur.execute("""
        SELECT table_schema, count(*) 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema') 
        GROUP BY table_schema;
    """)
    print("Local schemas & table counts:", lcur.fetchall())
    lconn.close()
except Exception as e:
    print("Local DB connection FAILED:", e)

print("\n--- Testing Neon Database ---")
try:
    nconn = psycopg2.connect(neon_conn_str)
    print("Neon DB connection: SUCCESS")
    ncur = nconn.cursor()
    ncur.execute("""
        SELECT table_schema, count(*) 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema') 
        GROUP BY table_schema;
    """)
    print("Neon schemas & table counts:", ncur.fetchall())
    nconn.close()
except Exception as e:
    print("Neon DB connection FAILED:", e)

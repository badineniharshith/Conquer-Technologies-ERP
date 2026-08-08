import psycopg2
import io
import os

DB_URI = 'postgresql://postgres:postgres@localhost:5432/conquer_local_db'
OUTPUT_FILE = r'c:\Users\badin\OneDrive - gitam.in\Desktop\erp website\GLOBALDB_CONQUER.SQL'

def dump_global_db():
    print("Connecting to database...")
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write("-- ============================================================\n")
        out.write("-- CONQUER GLOBAL ERP & CRM UNIFIED DATABASE DUMP (GLOBALDB_CONQUER.SQL)\n")
        out.write("-- Unified PostgreSQL Database Schema & Data Dump\n")
        out.write("-- Includes both 'public' (ERP) and 'crm' (CRM) schemas\n")
        out.write("-- Generated for Conquer ERP/CRM Platform\n")
        out.write("-- ============================================================\n\n")

        out.write("SET statement_timeout = 0;\n")
        out.write("SET lock_timeout = 0;\n")
        out.write("SET client_encoding = 'UTF8';\n")
        out.write("SET standard_conforming_strings = on;\n")
        out.write("SET check_function_bodies = false;\n")
        out.write("SET xmloption = content;\n")
        out.write("SET client_min_messages = warning;\n")
        out.write("SET row_security = off;\n\n")

        out.write("CREATE SCHEMA IF NOT EXISTS public;\n")
        out.write("CREATE SCHEMA IF NOT EXISTS crm;\n\n")

    # Read deepseek_sql_20260724_9adca3.sql and databasecrm_new.sql DDL & data to assemble a perfect GLOBALDB_CONQUER.SQL
    print("Reading DDLs and Data...")
    
    # Read public schema DDL from deepseek_sql_20260724_9adca3.sql
    with open('deepseek_sql_20260724_9adca3.sql', 'r', encoding='utf-8', errors='ignore') as f:
        deepseek_sql = f.read()

    # Read crm schema DDL and data from databasecrm_new.sql
    with open('databasecrm_new.sql', 'r', encoding='utf-8', errors='ignore') as f:
        crm_sql = f.read()

    with open(OUTPUT_FILE, 'a', encoding='utf-8') as out:
        out.write("-- ============================================================\n")
        out.write("-- 1. PUBLIC SCHEMA DDL (ERP TABLES & CORE SYSTEM)\n")
        out.write("-- ============================================================\n\n")
        out.write(deepseek_sql)
        out.write("\n\n-- ============================================================\n")
        out.write("-- 2. CRM SCHEMA DDL & DATA (FULL CRM ENGINE & RECORDS)\n")
        out.write("-- ============================================================\n\n")
        out.write(crm_sql)

    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"Successfully generated {OUTPUT_FILE} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    dump_global_db()

import os
import re
import sys
import subprocess

def import_sql_dumps():
    db_url = "postgresql://postgres:postgres@localhost:5432/conquer_local_db"
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    db_url = line.split('=', 1)[1].strip().strip('"').strip("'")

    print(f"Importing SQL dumps into PostgreSQL: {db_url}")

    crm_sql = os.path.abspath('databasecrm_new.sql')
    erp_sql = os.path.abspath('databaseerp_new.sql')

    temp_sql_path = os.path.abspath('scratch_import.sql')
    with open(temp_sql_path, 'w', encoding='utf-8') as out:
        out.write("CREATE SCHEMA IF NOT EXISTS crm;\n")
        with open(crm_sql, 'r', encoding='utf-8', errors='ignore') as f:
            out.write(f.read())
        out.write("\n")
        with open(erp_sql, 'r', encoding='utf-8', errors='ignore') as f:
            out.write(f.read())
        out.write("\n")

        # Now migrate data from crm schema tables into public schema tables if missing
        out.write("""
        -- Populate public.users from crm.users
        INSERT INTO public.users (
            id, email, "passwordHash", "fullName", "roleId", "isActive", status, department, designation, branch, "branchName", "createdAt", "updatedAt"
        )
        SELECT 
            id::text, email, "passwordHash", "fullName", "roleId"::text, "isActive", COALESCE(status, 'Active'), 'Supply Chain', 'Operations Executive', COALESCE(branch, 'Head Office'), COALESCE(branch, 'Head Office'), "createdAt", "updatedAt"
        FROM crm.users
        ON CONFLICT (email) DO NOTHING;

        -- Populate public.customers from crm.customers
        INSERT INTO public.customers (
            id, name, "customer_code", "company_legal_name", "trade_name", "gstNumber", "billingStreet", "billingCity", "billingDistrict", "billingState", "billingZip", "shippingStreet", "shippingCity", "shippingDistrict", "shippingState", "shippingZip", "customerType", "creditDays", industry, status, "salesExecutiveId", territory, priority, tags, "createdAt", "updatedAt"
        )
        SELECT 
            id::text, name, customer_code, company_legal_name, trade_name, "gstNumber", "billingStreet", "billingCity", "billingDistrict", "billingState", "billingZip", "shippingStreet", "shippingCity", "shippingDistrict", "shippingState", "shippingZip", "customerType", "creditDays", industry, status, "salesExecutiveId"::text, territory, priority, tags, "createdAt", "updatedAt"
        FROM crm.customers
        ON CONFLICT (id) DO NOTHING;

        -- Populate public.products from crm.products
        INSERT INTO public.products (
            id, name, sku, price, stock, "warrantyMonths", "createdAt", "updatedAt", category, cost_price, item_number, market_price, tax_percent
        )
        SELECT 
            id::text, name, sku, price, stock, "warrantyMonths", "createdAt", "updatedAt", category, cost_price, item_number, market_price, tax_percent
        FROM crm.products
        ON CONFLICT (sku) DO NOTHING;

        -- Populate public.purchase_orders from crm.crm_purchase_orders
        INSERT INTO public.purchase_orders (
            id, po_number, customer_id, customer_name, company_name, total_amount, date_received, expected_delivery, total_items, stock_status, verification_status, erp_verification_status, po_status, created_at, updated_at
        )
        SELECT 
            id::text, po_number, customer_id::text, primary_contact_name, company_name, grand_total, date_received, expected_delivery, total_items, stock_status, erp_verification_status, erp_verification_status, po_status, created_at, updated_at
        FROM crm.crm_purchase_orders
        ON CONFLICT (po_number) DO NOTHING;

        -- Populate public.purchase_order_items from crm.crm_purchase_order_items
        INSERT INTO public.purchase_order_items (
            id, purchase_order_id, po_number, product_id, product_name, sku, description, quantity, unit_price, discount, tax, total, created_at, updated_at
        )
        SELECT 
            id::text, po_number, po_number, product_id::text, product_name, sku, description, quantity, unit_price, discount, tax, total, created_at, updated_at
        FROM crm.crm_purchase_order_items
        ON CONFLICT (id) DO NOTHING;

        -- Populate public.stock_reservations from crm.opportunities where reservation_status IS NOT NULL
        INSERT INTO public.stock_reservations (
            id, reservationNumber, customerId, status, notes, reservedAt, expiresAt, createdAt, updatedAt
        )
        SELECT 
            id::text, 'RES-' || id::text, "customerId"::text, COALESCE(reservation_status, 'PENDING'), 'Imported from Opportunities', reservation_date, expiry_date, "createdAt", "updatedAt"
        FROM crm.opportunities
        WHERE reservation_status IS NOT NULL OR reservation_date IS NOT NULL
        ON CONFLICT (id) DO NOTHING;
        """)

    print(f"Generated {temp_sql_path}. Applying to database via psql...")
    
    try:
        res = subprocess.run(["psql", db_url, "-f", temp_sql_path], capture_output=True, text=True)
        print("PSQL Output:", res.stdout[:500])
        if res.stderr:
            print("PSQL Stderr:", res.stderr[:500])
    except Exception as e:
        print("PSQL Execution error:", e)

    print("=== IMPORT PROCESS COMPLETED ===")

if __name__ == '__main__':
    import_sql_dumps()

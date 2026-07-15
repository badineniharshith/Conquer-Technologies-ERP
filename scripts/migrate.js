/**
 * Conquer ERP / CRM Consolidated Database Migration & ETL Script
 * 
 * This script connects to the Source CRM database, Source ERP database, and 
 * Consolidated Target database to migrate and sync schemas. It enforces CRM as 
 * the absolute source of truth for master records (users, customers, branches, products) 
 * while maintaining a lookup mapping table for ERP transaction and inventory records 
 * that use string/UUID IDs.
 * 
 * Execution requirements:
 * 1. Setup target unified schema (Consolidated DDL) on the target database.
 * 2. Configure the following environment variables:
 *    - CRM_DATABASE_URL: connection string to CRM source DB
 *    - ERP_DATABASE_URL: connection string to ERP source DB
 *    - TARGET_DATABASE_URL: connection string to Consolidated target DB
 * 3. Run: node scripts/migrate.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Ensure all environment variables are present
const crmUrl = process.env.CRM_DATABASE_URL;
const erpUrl = process.env.ERP_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

if (!crmUrl || !erpUrl || !targetUrl) {
    console.error('Error: Please configure CRM_DATABASE_URL, ERP_DATABASE_URL, and TARGET_DATABASE_URL/DATABASE_URL environment variables.');
    process.exit(1);
}

const crmPool = new Pool({ connectionString: crmUrl });
const erpPool = new Pool({ connectionString: erpUrl });
const targetPool = new Pool({ connectionString: targetUrl });

// Lookup maps to translate ERP UUIDs to CRM Integer IDs
const erpUserIdToCrmUserId = new Map();       // ERP User UUID -> CRM User Integer ID
const erpCustomerIdToCrmCustomerId = new Map(); // ERP Customer UUID -> CRM Customer Integer ID (from CRM users or customers)
const erpProductIdToCrmProductId = new Map();   // ERP Product UUID -> CRM Product Integer ID
const erpBranchIdToCrmBranchId = new Map();     // ERP Branch UUID -> CRM Branch Integer ID
const erpRoleIdToCrmRoleId = new Map();         // ERP Role UUID/Name -> CRM Role Integer ID

// Helper: Parse ERP address field into structured CRM billing/shipping addresses
function parseAddress(addressString) {
    const defaultAddress = {
        street: 'Not Provided',
        city: 'Hyderabad',
        state: 'Telangana',
        zip: '500081'
    };

    if (!addressString) return defaultAddress;

    const parts = addressString.split(',').map(p => p.trim());
    if (parts.length >= 4) {
        return {
            street: parts.slice(0, parts.length - 3).join(', '),
            city: parts[parts.length - 3],
            state: parts[parts.length - 2],
            zip: parts[parts.length - 1]
        };
    } else if (parts.length === 3) {
        return {
            street: parts[0],
            city: parts[1],
            state: parts[2],
            zip: defaultAddress.zip
        };
    } else if (parts.length === 2) {
        return {
            street: parts[0],
            city: parts[1],
            state: defaultAddress.state,
            zip: defaultAddress.zip
        };
    } else {
        return {
            street: parts[0],
            city: defaultAddress.city,
            state: defaultAddress.state,
            zip: defaultAddress.zip
        };
    }
}

// Helper: Map ERP Stock Status to Consolidated Enum Values
function mapStockStatus(status) {
    const s = String(status || '').toLowerCase().trim();
    if (s.includes('checking')) return 'Checking';
    if (s.includes('available') || s.includes('in stock') || s.includes('instock')) return 'In Stock';
    if (s.includes('shortage') || s.includes('partial')) return 'Partial Shortage';
    if (s.includes('out') || s.includes('out of stock')) return 'Out of Stock';
    return 'Checking'; // Default fallback
}

// Helper: Map ERP Verification Status to Consolidated Enum Values
function mapVerificationStatus(status) {
    const s = String(status || '').toLowerCase().trim();
    if (s.includes('pending')) return 'Pending';
    if (s.includes('billing') || s.includes('verified')) return 'Billing';
    if (s.includes('delivered') || s.includes('shipped') || s.includes('complete')) return 'Delivered';
    if (s.includes('cancel')) return 'Cancelled';
    return 'Pending'; // Default fallback
}

async function runMigration() {
    console.log('--- Database Migration and Synchronization Initiated ---');

    // Establish connections
    const crmClient = await crmPool.connect();
    const erpClient = await erpPool.connect();
    const targetClient = await targetPool.connect();

    try {
        // Enforce transaction on Consolidated Target Database
        await targetClient.query('BEGIN');

        // =========================================================================
        // PHASE 1: MIGRATE ROLES & BRANCHES (MASTER METADATA)
        // =========================================================================
        console.log('Migrating Roles and Branches...');

        // 1. Fetch CRM Roles
        const crmRolesRes = await crmClient.query('SELECT * FROM public.roles');
        console.log(`Fetched ${crmRolesRes.rows.length} Roles from CRM.`);
        for (const role of crmRolesRes.rows) {
            await targetClient.query(
                `INSERT INTO public.roles (id, name, permissions, "createdAt", "updatedAt", "isActive", level)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name, 
                    permissions = EXCLUDED.permissions, 
                    "updatedAt" = EXCLUDED."updatedAt"`,
                [role.id, role.name, role.permissions, role.createdAt, role.updatedAt, role.isActive, role.level]
            );
        }

        // Establish Role lookups for ERP (mapping ERP roles like 'ADMIN', 'EMPLOYEE' to CRM role integers)
        // Check ERP Roles from ERP Db
        const erpRolesRes = await erpClient.query('SELECT * FROM public."Role"');
        for (const erpRole of erpRolesRes.rows) {
            const matchedCrmRole = crmRolesRes.rows.find(
                r => r.name.toUpperCase() === erpRole.name.toUpperCase()
            );
            if (matchedCrmRole) {
                erpRoleIdToCrmRoleId.set(erpRole.id, matchedCrmRole.id);
            } else {
                // If role name doesn't exist in CRM, default to standard role (e.g. ID 3/Employee or similar)
                erpRoleIdToCrmRoleId.set(erpRole.id, 3); 
            }
        }

        // 2. Fetch CRM Branches
        const crmBranchesRes = await crmClient.query('SELECT * FROM public.branches');
        console.log(`Fetched ${crmBranchesRes.rows.length} Branches from CRM.`);
        for (const b of crmBranchesRes.rows) {
            await targetClient.query(
                `INSERT INTO public.branches (id, name, region_id)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id`,
                [b.id, b.name, b.region_id]
            );
        }

        // Map ERP branches to CRM branch IDs
        const erpBranchesRes = await erpClient.query('SELECT * FROM public."Branch"');
        for (const erpB of erpBranchesRes.rows) {
            // Match branch by name similarity or manual code mapping
            let matchedCrmBranch = crmBranchesRes.rows.find(
                b => b.name.toLowerCase().includes(erpB.name.toLowerCase()) || erpB.name.toLowerCase().includes(b.name.toLowerCase())
            );

            // Fallback for code mappings (e.g., 'HYD-HQ' maps to 'Hyderabad Corporate Office')
            if (!matchedCrmBranch) {
                if (erpB.id.startsWith('HYD')) {
                    matchedCrmBranch = crmBranchesRes.rows.find(b => b.name.includes('Hyderabad'));
                } else if (erpB.id.startsWith('BLR')) {
                    matchedCrmBranch = crmBranchesRes.rows.find(b => b.name.includes('Bengaluru') || b.name.includes('Bangalore'));
                } else if (erpB.id.startsWith('CHN')) {
                    matchedCrmBranch = crmBranchesRes.rows.find(b => b.name.includes('Chennai'));
                } else if (erpB.id.startsWith('MUM')) {
                    matchedCrmBranch = crmBranchesRes.rows.find(b => b.name.includes('Mumbai'));
                } else if (erpB.id.startsWith('DEL')) {
                    matchedCrmBranch = crmBranchesRes.rows.find(b => b.name.includes('Delhi') || b.name.includes('Gurgaon'));
                }
            }

            if (matchedCrmBranch) {
                erpBranchIdToCrmBranchId.set(erpB.id, matchedCrmBranch.id);
            } else {
                // Default to Headquarters (e.g., ID 1)
                erpBranchIdToCrmBranchId.set(erpB.id, 1);
            }
        }

        // =========================================================================
        // PHASE 2: MIGRATE CRM USERS AND CUSTOMERS (ABSOLUTE TRUTH DATA)
        // =========================================================================
        console.log('Migrating CRM Users and Customers...');

        // 1. CRM Users
        const crmUsersRes = await crmClient.query('SELECT * FROM public.users');
        console.log(`Fetched ${crmUsersRes.rows.length} Users from CRM.`);
        for (const u of crmUsersRes.rows) {
            await targetClient.query(
                `INSERT INTO public.users (
                    id, email, "passwordHash", "fullName", "roleId", "isActive", 
                    "createdAt", "updatedAt", branch, branch_id, manager_id, region, status, region_id
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 ON CONFLICT (id) DO UPDATE SET 
                    email = EXCLUDED.email,
                    "passwordHash" = EXCLUDED."passwordHash",
                    "fullName" = EXCLUDED."fullName",
                    "roleId" = EXCLUDED."roleId",
                    "isActive" = EXCLUDED."isActive",
                    "updatedAt" = EXCLUDED."updatedAt",
                    branch = EXCLUDED.branch,
                    branch_id = EXCLUDED.branch_id,
                    manager_id = EXCLUDED.manager_id,
                    region = EXCLUDED.region,
                    status = EXCLUDED.status,
                    region_id = EXCLUDED.region_id`,
                [
                    u.id, u.email, u.passwordHash, u.fullName, u.roleId, u.isActive,
                    u.createdAt, u.updatedAt, u.branch, u.branch_id, u.manager_id, u.region, u.status, u.region_id
                ]
            );
        }

        // 2. CRM Customers
        const crmCustomersRes = await crmClient.query('SELECT * FROM public.customers');
        console.log(`Fetched ${crmCustomersRes.rows.length} Customers from CRM.`);
        for (const c of crmCustomersRes.rows) {
            await targetClient.query(
                `INSERT INTO public.customers (
                    id, name, "gstNumber", "billingStreet", "billingCity", "billingState", "billingZip", 
                    "shippingStreet", "shippingCity", "shippingState", "shippingZip", "createdAt", "updatedAt", 
                    "customerType", industry, priority, "salesExecutiveId", status, tags, territory, 
                    "billingDistrict", "shippingDistrict", branch_id, region_id, company_legal_name, customer_code, trade_name
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
                 ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    "gstNumber" = EXCLUDED."gstNumber",
                    "billingStreet" = EXCLUDED."billingStreet",
                    "billingCity" = EXCLUDED."billingCity",
                    "billingState" = EXCLUDED."billingState",
                    "billingZip" = EXCLUDED."billingZip",
                    "shippingStreet" = EXCLUDED."shippingStreet",
                    "shippingCity" = EXCLUDED."shippingCity",
                    "shippingState" = EXCLUDED."shippingState",
                    "shippingZip" = EXCLUDED."shippingZip",
                    "updatedAt" = EXCLUDED."updatedAt",
                    "customerType" = EXCLUDED."customerType",
                    industry = EXCLUDED.industry,
                    priority = EXCLUDED.priority,
                    "salesExecutiveId" = EXCLUDED."salesExecutiveId",
                    status = EXCLUDED.status,
                    tags = EXCLUDED.tags,
                    territory = EXCLUDED.territory,
                    branch_id = EXCLUDED.branch_id,
                    region_id = EXCLUDED.region_id,
                    company_legal_name = EXCLUDED.company_legal_name,
                    customer_code = EXCLUDED.customer_code,
                    trade_name = EXCLUDED.trade_name`,
                [
                    c.id, c.name, c.gstNumber, c.billingStreet, c.billingCity, c.billingState, c.billingZip,
                    c.shippingStreet, c.shippingCity, c.shippingState, c.shippingZip, c.createdAt, c.updatedAt,
                    c.customerType, c.industry, c.priority, c.salesExecutiveId, c.status, c.tags, c.territory,
                    c.billingDistrict, c.shippingDistrict, c.branch_id, c.region_id, c.company_legal_name, c.customer_code, c.trade_name
                ]
            );
        }

        // =========================================================================
        // PHASE 3: MIGRATE ERP USERS & ESTABLISH LOOKUPS (RESOLVING STRING IDS)
        // =========================================================================
        console.log('Migrating and merging ERP Users...');

        // Fetch all ERP Users
        const erpUsersRes = await erpClient.query('SELECT * FROM public."User"');
        console.log(`Fetched ${erpUsersRes.rows.length} Users from ERP.`);

        // Determine starting ID for new users/customers to prevent primary key collisions
        let nextUserId = Math.max(...crmUsersRes.rows.map(u => u.id), 0) + 1;
        let nextCustomerId = Math.max(...crmCustomersRes.rows.map(c => c.id), 0) + 1;

        for (const erpUser of erpUsersRes.rows) {
            // Check if user already exists in CRM by email
            const matchedCrmUser = crmUsersRes.rows.find(
                u => u.email.toLowerCase() === erpUser.email.toLowerCase()
            );

            if (matchedCrmUser) {
                // User exists in CRM. Link ERP UUID to the CRM integer ID
                erpUserIdToCrmUserId.set(erpUser.id, matchedCrmUser.id);
                console.log(`Merged ERP User ${erpUser.email} (UUID: ${erpUser.id}) -> CRM User ID: ${matchedCrmUser.id}`);

                // If ERP user has customer role, find corresponding CRM customer
                if (erpUser.roleId === 'CUSTOMER') {
                    const matchedCrmCustomer = crmCustomersRes.rows.find(
                        c => c.name.toLowerCase() === matchedCrmUser.fullName.toLowerCase()
                    );
                    if (matchedCrmCustomer) {
                        erpCustomerIdToCrmCustomerId.set(erpUser.id, matchedCrmCustomer.id);
                    } else {
                        // Create a customer mapping for this merged user using a new customer record if none exists
                        const addressInfo = parseAddress(erpUser.address);
                        const newCustId = nextCustomerId++;
                        await targetClient.query(
                            `INSERT INTO public.customers (
                                id, name, "billingStreet", "billingCity", "billingState", "billingZip",
                                "shippingStreet", "shippingCity", "shippingState", "shippingZip",
                                "createdAt", "updatedAt", "customerType", status, "salesExecutiveId"
                             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                            [
                                newCustId, erpUser.name, addressInfo.street, addressInfo.city, addressInfo.state, addressInfo.zip,
                                addressInfo.street, addressInfo.city, addressInfo.state, addressInfo.zip,
                                erpUser.createdAt, erpUser.updatedAt, erpUser.customerType || 'Corporate',
                                erpUser.status === 'ACTIVE' ? 'Active' : 'Inactive',
                                erpUser.assignedEmployeeId ? erpUserIdToCrmUserId.get(erpUser.assignedEmployeeId) : null
                            ]
                        );
                        erpCustomerIdToCrmCustomerId.set(erpUser.id, newCustId);
                        console.log(`Created CRM customer entry for merged customer user ${erpUser.email}. Customer ID: ${newCustId}`);
                    }
                }
            } else {
                // User does NOT exist in CRM. Create a new record in target public.users
                const newUserId = nextUserId++;
                const targetRoleId = erpRoleIdToCrmRoleId.get(erpUser.roleId) || 3; // Default to Employee (3)
                const targetBranchId = erpBranchIdToCrmBranchId.get(erpUser.branchId) || null;
                const branchName = erpUser.branchName || 'Head Office';

                await targetClient.query(
                    `INSERT INTO public.users (
                        id, email, "passwordHash", "fullName", "roleId", "isActive", 
                        "createdAt", "updatedAt", branch, branch_id, status
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        newUserId, erpUser.email, erpUser.passwordHash, erpUser.name, targetRoleId, 
                        erpUser.isActive, erpUser.createdAt, erpUser.updatedAt, branchName, targetBranchId,
                        erpUser.status === 'ACTIVE' ? 'Active' : 'Inactive'
                    ]
                );

                erpUserIdToCrmUserId.set(erpUser.id, newUserId);
                console.log(`Imported ERP User ${erpUser.email} (UUID: ${erpUser.id}) -> New CRM User ID: ${newUserId}`);

                // If ERP User was a Customer, create a Customer entry
                if (erpUser.roleId === 'CUSTOMER') {
                    const addressInfo = parseAddress(erpUser.address);
                    const newCustId = nextCustomerId++;
                    await targetClient.query(
                        `INSERT INTO public.customers (
                            id, name, "billingStreet", "billingCity", "billingState", "billingZip",
                            "shippingStreet", "shippingCity", "shippingState", "shippingZip",
                            "createdAt", "updatedAt", "customerType", status, "salesExecutiveId"
                         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                        [
                            newCustId, erpUser.name, addressInfo.street, addressInfo.city, addressInfo.state, addressInfo.zip,
                            addressInfo.street, addressInfo.city, addressInfo.state, addressInfo.zip,
                            erpUser.createdAt, erpUser.updatedAt, erpUser.customerType || 'Corporate',
                            erpUser.status === 'ACTIVE' ? 'Active' : 'Inactive',
                            erpUser.assignedEmployeeId ? erpUserIdToCrmUserId.get(erpUser.assignedEmployeeId) : null
                        ]
                    );
                    erpCustomerIdToCrmCustomerId.set(erpUser.id, newCustId);
                    console.log(`Created CRM Customer mapping for ERP customer user ${erpUser.email}. Customer ID: ${newCustId}`);
                }
            }
        }

        // =========================================================================
        // PHASE 4: PRODUCTS CONSOLIDATION (CRM SKUS AS SOURCE OF TRUTH)
        // =========================================================================
        console.log('Migrating and merging Products catalog...');

        // 1. Import CRM Products
        const crmProductsRes = await crmClient.query('SELECT * FROM public.products');
        console.log(`Fetched ${crmProductsRes.rows.length} Products from CRM.`);
        for (const p of crmProductsRes.rows) {
            await targetClient.query(
                `INSERT INTO public.products (id, name, sku, price, "warrantyMonths", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name, 
                    sku = EXCLUDED.sku, 
                    price = EXCLUDED.price, 
                    "updatedAt" = EXCLUDED."updatedAt"`,
                [p.id, p.name, p.sku, p.price, p.warrantyMonths || 12, p.createdAt, p.updatedAt]
            );
        }

        // 2. Fetch ERP Products to create mapping
        const erpProductsRes = await erpClient.query('SELECT * FROM public."Product"');
        console.log(`Fetched ${erpProductsRes.rows.length} Products from ERP.`);

        let nextProductId = Math.max(...crmProductsRes.rows.map(p => p.id), 0) + 1;

        for (const erpP of erpProductsRes.rows) {
            // Match ERP product to CRM product by SKU
            const matchedCrmProduct = crmProductsRes.rows.find(
                p => p.sku.toLowerCase() === erpP.sku.toLowerCase()
            );

            if (matchedCrmProduct) {
                erpProductIdToCrmProductId.set(erpP.id, matchedCrmProduct.id);
            } else {
                // If ERP product is not in CRM, create a new product in public.products
                const newProdId = nextProductId++;
                // Check price in ProductPrice mapping from ERP or default
                const priceRes = await erpClient.query(
                    'SELECT "sellingPrice" FROM public."ProductPrice" WHERE sku = $1 LIMIT 1',
                    [erpP.sku]
                );
                const price = priceRes.rows.length > 0 ? parseFloat(priceRes.rows[0].sellingPrice) : 25000.00;

                await targetClient.query(
                    `INSERT INTO public.products (id, name, sku, price, "warrantyMonths", "createdAt", "updatedAt")
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [newProdId, erpP.name, erpP.sku, price, 12, erpP.createdAt, erpP.updatedAt]
                );

                erpProductIdToCrmProductId.set(erpP.id, newProdId);
                console.log(`Imported unique ERP product: ${erpP.sku} (UUID: ${erpP.id}) -> New CRM Product ID: ${newProdId}`);
            }
        }

        // =========================================================================
        // PHASE 5: MIGRATE INVENTORY (MAPPING ERP UUIDS -> CRM INTEGERS)
        // =========================================================================
        console.log('Migrating ERP Inventory to Unified Schema...');

        const erpInventoryRes = await erpClient.query('SELECT * FROM public."Inventory"');
        console.log(`Fetched ${erpInventoryRes.rows.length} Inventory records from ERP.`);

        for (const inv of erpInventoryRes.rows) {
            const mappedProductId = erpProductIdToCrmProductId.get(inv.productId);
            const mappedBranchId = erpBranchIdToCrmBranchId.get(inv.branchId);

            if (!mappedProductId) {
                console.warn(`Warning: Product UUID ${inv.productId} not found in product mappings. Skipping inventory row ${inv.id}.`);
                continue;
            }

            if (!mappedBranchId) {
                console.warn(`Warning: Branch UUID ${inv.branchId} not found in branch mappings. Skipping inventory row ${inv.id}.`);
                continue;
            }

            await targetClient.query(
                `INSERT INTO public.inventory (
                    id, "productId", "branchId", sku, "itemName", "availableStock", "reservedStock", 
                    "allocatedStock", "damagedStock", "reorderLevel", "warehouseZone", "updatedAt"
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 ON CONFLICT (id) DO UPDATE SET
                    "productId" = EXCLUDED."productId",
                    "branchId" = EXCLUDED."branchId",
                    "availableStock" = EXCLUDED."availableStock",
                    "reservedStock" = EXCLUDED."reservedStock",
                    "allocatedStock" = EXCLUDED."allocatedStock",
                    "damagedStock" = EXCLUDED."damagedStock",
                    "reorderLevel" = EXCLUDED."reorderLevel",
                    "warehouseZone" = EXCLUDED."warehouseZone",
                    "updatedAt" = EXCLUDED."updatedAt"`,
                [
                    inv.id, mappedProductId, mappedBranchId, inv.sku, inv.itemName, 
                    inv.availableStock, inv.reservedStock, inv.allocatedStock, inv.damagedStock, 
                    inv.reorderLevel, inv.warehouseZone, inv.updatedAt
                ]
            );
        }
        console.log('Inventory migration complete.');

        // =========================================================================
        // PHASE 6: PURCHASE ORDERS MIGRATION (MAPPING LOOKUPS & STATUS TRANSITIONS)
        // =========================================================================
        console.log('Migrating Purchase Orders...');

        const erpPORes = await erpClient.query('SELECT * FROM public."PurchaseOrder"');
        console.log(`Fetched ${erpPORes.rows.length} Purchase Orders from ERP.`);

        for (const po of erpPORes.rows) {
            // Find unified customer integer ID from the mapping
            const mappedCustomerId = erpCustomerIdToCrmCustomerId.get(po.customerId);

            if (!mappedCustomerId) {
                console.warn(`Warning: Customer UUID ${po.customerId} does not have a mapped CRM Customer ID. Skipping Purchase Order ${po.poNumber}.`);
                continue;
            }

            // Map and parse status
            const stockEnumStatus = mapStockStatus(po.stockStatus);
            const verificationEnumStatus = mapVerificationStatus(po.verificationStatus);

            // Parse itemsJson array
            let parsedItemsJson;
            try {
                parsedItemsJson = typeof po.itemsJson === 'string' ? JSON.parse(po.itemsJson) : po.itemsJson;
                if (!Array.isArray(parsedItemsJson)) {
                    parsedItemsJson = [];
                }
            } catch (err) {
                console.warn(`Could not parse itemsJson for PO ${po.poNumber}: ${err.message}. Defaulting to empty array.`);
                parsedItemsJson = [];
            }

            await targetClient.query(
                `INSERT INTO public.purchase_orders (
                    id, "poNumber", "customerId", "dateReceived", "totalItems", 
                    "stockStatus", "verificationStatus", "itemsJson"
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO UPDATE SET
                    "customerId" = EXCLUDED."customerId",
                    "dateReceived" = EXCLUDED."dateReceived",
                    "totalItems" = EXCLUDED."totalItems",
                    "stockStatus" = EXCLUDED."stockStatus",
                    "verificationStatus" = EXCLUDED."verificationStatus",
                    "itemsJson" = EXCLUDED."itemsJson"`,
                [
                    po.id, po.poNumber, mappedCustomerId, po.dateReceived, po.totalItems,
                    stockEnumStatus, verificationEnumStatus, JSON.stringify(parsedItemsJson)
                ]
            );
        }
        console.log('Purchase Orders migration complete.');

        // =========================================================================
        // PHASE 7: RESERVATIONS MIGRATION (ADDITIONAL TRANSACTION MAPPINGS)
        // =========================================================================
        // Let's migrate stock reservations if they exist in the target database.
        // Check if stock_reservations table exists in target db
        const tableCheck = await targetClient.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'stock_reservations'
            );
        `);

        if (tableCheck.rows[0].exists) {
            console.log('Migrating Stock Reservations...');
            const erpReserRes = await erpClient.query('SELECT * FROM public."StockReservation"');
            console.log(`Fetched ${erpReserRes.rows.length} Stock Reservations from ERP.`);

            for (const res of erpReserRes.rows) {
                const mappedCustomerId = erpCustomerIdToCrmCustomerId.get(res.customerId) || erpUserIdToCrmUserId.get(res.customerId);
                const mappedEmployeeId = res.employeeId ? erpUserIdToCrmUserId.get(res.employeeId) : null;
                const mappedProductId = erpProductIdToCrmProductId.get(res.productId);

                if (!mappedCustomerId) {
                    console.warn(`Warning: Customer UUID ${res.customerId} not mapped for Reservation ${res.reservationNumber}. Skipping.`);
                    continue;
                }
                if (!mappedProductId) {
                    console.warn(`Warning: Product UUID ${res.productId} not mapped for Reservation ${res.reservationNumber}. Skipping.`);
                    continue;
                }

                await targetClient.query(
                    `INSERT INTO public.stock_reservations (
                        id, "reservationNumber", "customerId", "employeeId", "productId", sku, 
                        "branchCode", quantity, status, notes, "reservedAt", "expiresAt", 
                        "acceptedAt", "rejectedAt", "createdAt", "updatedAt"
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                     ON CONFLICT (id) DO UPDATE SET
                        status = EXCLUDED.status,
                        "updatedAt" = EXCLUDED."updatedAt"`,
                    [
                        res.id, res.reservationNumber, mappedCustomerId, mappedEmployeeId, mappedProductId, res.sku,
                        res.branchCode, res.quantity, res.status, res.notes, res.reservedAt, res.expiresAt,
                        res.acceptedAt, res.rejectedAt, res.createdAt, res.updatedAt
                    ]
                );
            }
            console.log('Stock Reservations migration complete.');
        }

        // Commit transaction
        await targetClient.query('COMMIT');
        console.log('\n==================================================');
        console.log('SUCCESS: Consolidated Database Migration Completed!');
        console.log('==================================================');

    } catch (error) {
        // Rollback on any failure
        await targetClient.query('ROLLBACK');
        console.error('CRITICAL ERROR during database migration:', error);
    } finally {
        // Release database connections
        crmClient.release();
        erpClient.release();
        targetClient.release();

        crmPool.end();
        erpPool.end();
        targetPool.end();
    }
}

// Run ETL process
runMigration();

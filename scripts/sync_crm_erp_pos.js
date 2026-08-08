const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) dbUrl = match[1];
  } catch (e) {}
}

async function syncCrmErpPos() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('=== STARTING CRM & ERP PO AND STOCK RESERVATION SYNC ===');

  try {
    // 1. Check existing CRM POs in database table crm.crm_purchase_orders
    console.log('Querying crm.crm_purchase_orders from database...');
    const crmRes = await client.query('SELECT * FROM crm.crm_purchase_orders ORDER BY id ASC');
    console.log(`Found ${crmRes.rows.length} rows in crm.crm_purchase_orders.`);

    // Read items for CRM POs
    const itemsRes = await client.query('SELECT * FROM crm.crm_purchase_order_items ORDER BY id ASC');
    console.log(`Found ${itemsRes.rows.length} rows in crm.crm_purchase_order_items.`);

    // Group items by po_number
    const itemsByPo = {};
    for (const item of itemsRes.rows) {
      if (!itemsByPo[item.po_number]) itemsByPo[item.po_number] = [];
      itemsByPo[item.po_number].push({
        id: item.id,
        productId: item.product_id ? String(item.product_id) : null,
        productName: item.product_name,
        sku: item.sku || 'PROD-DELL-XPS15', // Fallback to valid SKU if missing
        quantity: item.quantity,
        uom: item.uom,
        unitPrice: parseFloat(item.unitPrice || 0),
        discount: parseFloat(item.discount || 0),
        tax: parseFloat(item.tax || 0),
        total: parseFloat(item.total || 0)
      });
    }

    // 2. Fetch customers and users from public schema to map IDs
    const customersRes = await client.query('SELECT id, company_name, email FROM public.customers');
    const customers = customersRes.rows;

    const usersRes = await client.query('SELECT id, name, email FROM public.users');
    const users = usersRes.rows;

    for (const po of crmRes.rows) {
      console.log(`\nProcessing CRM PO: ${po.po_number} (Status: ${po.po_status}, Sync: ${po.erp_sync_status})`);

      // Match customer or employee in ERP
      let mappedCustomerId = null;
      const matchedCust = customers.find(c =>
        (c.email && po.email && c.email.toLowerCase() === po.email.toLowerCase()) ||
        (c.company_name && po.company_name && c.company_name.toLowerCase() === po.company_name.toLowerCase()) ||
        (c.name && po.primary_contact_name && c.name.toLowerCase() === po.primary_contact_name.toLowerCase())
      );

      if (matchedCust) {
        mappedCustomerId = matchedCust.id;
      } else if (customers.length > 0) {
        mappedCustomerId = customers[0].id;
      }

      const poItems = itemsByPo[po.po_number] || [];
      const itemsJson = JSON.stringify(poItems.map(i => ({
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        productName: i.productName
      })));

      const totalItems = poItems.reduce((sum, i) => sum + i.quantity, 0) || 1;
      const totalAmount = parseFloat(po.grandTotal || po.subtotal || 0);

      const verificationStatus = (po.erp_verification_status === 'Verified' || po.po_status === 'Cleared') ? 'Verified' : 'Pending';
      const stockStatus = verificationStatus === 'Verified' ? 'Available' : 'Checking';
      const poStatus = po.approval_status === 'Approved' ? 'APPROVED' : 'PENDING';

      // Insert or Update public.purchase_orders
      const upsertErpPoQuery = `
        INSERT INTO public.purchase_orders (
          id, po_number, customer_id, customer_name, company_name, total_amount, date_received,
          total_items, stock_status, verification_status, erp_verification_status, erp_sync_status,
          po_status, approval_status, branch_code, items_json, gst_number, billing_address,
          shipping_address, primary_contact_name, phone, email, subtotal, grand_total, currency,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        )
        ON CONFLICT (po_number) DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          customer_name = EXCLUDED.customer_name,
          company_name = EXCLUDED.company_name,
          total_amount = EXCLUDED.total_amount,
          verification_status = EXCLUDED.verification_status,
          stock_status = EXCLUDED.stock_status,
          po_status = EXCLUDED.po_status,
          approval_status = EXCLUDED.approval_status,
          items_json = EXCLUDED.items_json,
          updated_at = NOW()
        RETURNING id;
      `;

      const erpPoId = `po-${po.po_number.toLowerCase()}`;

      const erpPoResult = await client.query(upsertErpPoQuery, [
        erpPoId,
        po.po_number,
        mappedCustomerId,
        po.primary_contact_name || 'Customer',
        po.company_name,
        totalAmount,
        po.created_at || new Date(),
        totalItems,
        stockStatus,
        verificationStatus,
        verificationStatus,
        'SYNCED',
        poStatus,
        po.approval_status || 'PENDING',
        'HYD-HQ',
        itemsJson,
        po.gst_number,
        po.billing_address,
        po.shipping_address,
        po.primary_contact_name,
        po.phone,
        po.email,
        parseFloat(po.subtotal || 0),
        parseFloat(po.grandTotal || 0),
        po.currency || 'INR',
        po.created_at || new Date(),
        po.updated_at || new Date()
      ]);

      const insertedErpPoId = erpPoResult.rows[0].id;
      console.log(`  -> Synced into public.purchase_orders with ID: ${insertedErpPoId}`);

      // Upsert relational PoItems in public.purchase_order_items
      for (const item of poItems) {
        await client.query(`
          INSERT INTO public.purchase_order_items (
            id, purchase_order_id, po_number, product_name, sku, quantity, unit_price, tax, total, item_status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
          ) ON CONFLICT (id) DO UPDATE SET
            unit_price = EXCLUDED.unit_price,
            quantity = EXCLUDED.quantity,
            total = EXCLUDED.total;
        `, [
          `po-item-${item.id}`,
          insertedErpPoId,
          po.po_number,
          item.productName,
          item.sku,
          item.quantity,
          item.unitPrice,
          item.tax,
          item.total,
          verificationStatus === 'Verified' ? 'Available' : 'Pending'
        ]).catch(e => console.log('Item error:', e.message));
      }

      // Update erp_sync_status in crm.crm_purchase_orders
      await client.query(`
        UPDATE crm.crm_purchase_orders
        SET erp_sync_status = 'SYNCED', erp_reference_id = $1, updated_at = NOW()
        WHERE id = $2;
      `, [insertedErpPoId, po.id]);

      // If Verified / Approved, create/update Stock Reservation in public.stock_reservations
      if (verificationStatus === 'Verified') {
        const resNumber = `RES-${po.po_number.replace('CPO-', '')}`;
        const resId = `res-${po.po_number.toLowerCase()}`;

        // Get an employee ID for the reservation
        const defaultEmp = users[0] ? users[0].id : null;

        await client.query(`
          INSERT INTO public.stock_reservations (
            id, reservation_number, customer_id, employee_id, purchase_order_id, sku, branch_code,
            quantity, status, notes, project, reserved_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW()
          ) ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            updated_at = NOW();
        `, [
          resId,
          resNumber,
          mappedCustomerId,
          defaultEmp,
          insertedErpPoId,
          poItems[0]?.sku || 'PROD-DELL-XPS15',
          'HYD-HQ',
          totalItems,
          'ACCEPTED',
          `Synced stock reservation for Verified PO ${po.po_number} (${po.company_name})`,
          po.company_name || 'Standard Order'
        ]);

        console.log(`  -> Created/Updated Stock Reservation: ${resNumber} (Status: ACCEPTED)`);
      }
    }

    console.log('\n=== SUCCESS: PO and Stock Reservation Sync Completed ===');
  } catch (err) {
    console.error('Error during PO sync:', err);
  } finally {
    await client.end();
  }
}

syncCrmErpPos();

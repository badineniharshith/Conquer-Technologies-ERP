const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const DATABASE_URL = dbUrlMatch ? dbUrlMatch[1] : process.env.DATABASE_URL;
const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to PostgreSQL database.');

  try {
    // 1. Create stock_reservation_counters table if not exists
    console.log('Creating public.stock_reservation_counters table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.stock_reservation_counters (
        year INT PRIMARY KEY,
        last_number INT NOT NULL DEFAULT 0
      );
    `);

    // 2. Fetch all existing reservations in public.stock_reservations
    const resList = await client.query(`
      SELECT id, reservation_number, created_at, reserved_at
      FROM public.stock_reservations
      ORDER BY created_at ASC;
    `);
    console.log(`Found ${resList.rows.length} existing reservations in public.stock_reservations.`);

    const currentYear = new Date().getFullYear();
    const usedNumbers = new Set();
    let maxNumber = 0;

    // Scan existing valid RES-YYYY-XXXX numbers
    for (const row of resList.rows) {
      if (row.reservation_number) {
        const match = row.reservation_number.match(/^RES-(\d{4})-(\d+)$/);
        if (match) {
          const y = parseInt(match[1], 10);
          const num = parseInt(match[2], 10);
          if (y === currentYear && num > maxNumber) {
            maxNumber = num;
          }
          usedNumbers.add(row.reservation_number);
        } else {
          // If it's a test or PO reservation like RES-2026-00000032
          const poMatch = row.reservation_number.match(/^RES-(\d{4})-(\d{8})$/);
          if (poMatch) {
            usedNumbers.add(row.reservation_number);
          }
        }
      }
    }

    console.log(`Current highest sequential RES number for ${currentYear}: ${maxNumber}`);

    // Update any reservations without valid numbers or with duplicates/legacy SR- numbers
    let updatedCount = 0;
    for (const row of resList.rows) {
      let num = row.reservation_number;
      const isLegacyOrNull = !num || num.startsWith('SR-') || usedNumbers.has(num);

      if (!num || num.startsWith('SR-')) {
        maxNumber++;
        const newResNumber = `RES-${currentYear}-${String(maxNumber).padStart(4, '0')}`;
        await client.query(`
          UPDATE public.stock_reservations
          SET reservation_number = $1
          WHERE id = $2;
        `, [newResNumber, row.id]);
        console.log(`Updated reservation ${row.id} from ${num || 'NULL'} -> ${newResNumber}`);
        usedNumbers.add(newResNumber);
        updatedCount++;
      } else {
        usedNumbers.add(num);
      }
    }
    console.log(`Updated ${updatedCount} reservations with standardized RES-YYYY-XXXX numbers.`);

    // 3. Initialize or update stock_reservation_counters
    await client.query(`
      INSERT INTO public.stock_reservation_counters (year, last_number)
      VALUES ($1, $2)
      ON CONFLICT (year) DO UPDATE
      SET last_number = GREATEST(stock_reservation_counters.last_number, EXCLUDED.last_number);
    `, [currentYear, Math.max(maxNumber, 100)]);
    console.log(`stock_reservation_counters updated for year ${currentYear} with last_number = ${Math.max(maxNumber, 100)}`);

    // 4. Ensure Unique Index on public.stock_reservations(reservation_number)
    console.log('Ensuring unique index on public.stock_reservations(reservation_number)...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS stock_reservations_reservation_number_key
      ON public.stock_reservations (reservation_number);
    `);
    console.log('Unique index ensured successfully.');

    // 5. Check crm.stock_reservations for any missing or non-matching records and sync
    console.log('Syncing legacy reservations to crm.stock_reservations & crm.opportunities...');
    const erpReservations = await client.query(`
      SELECT 
        sr.id, sr.reservation_number, sr.customer_id, sr.branch_code, sr.quantity,
        sr.status, sr.notes, sr.project, sr.reserved_at, sr.expires_at,
        c.crm_customer_id, c.company_name
      FROM public.stock_reservations sr
      LEFT JOIN public.customers c ON c.id = sr.customer_id
      WHERE sr.reservation_number IS NOT NULL;
    `);

    // Find a valid default createdById from crm.opportunities
    const createdByRes = await client.query(`
      SELECT "createdById", COUNT(*) 
      FROM crm.opportunities 
      WHERE "createdById" IS NOT NULL 
      GROUP BY "createdById" 
      ORDER BY count DESC 
      LIMIT 1;
    `);
    const defaultCreatedById = createdByRes.rows[0]?.createdById || 1;
    console.log(`Using defaultCreatedById: ${defaultCreatedById}`);
    let crmSyncCount = 0;
    for (const r of erpReservations.rows) {
      // Upsert into crm.stock_reservations
      const crmResResult = await client.query(`
        INSERT INTO crm.stock_reservations (
          reservation_number, branch_code, quantity, status, notes, project,
          created_at, updated_at, reserved_date, expiry_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, NOW(), NOW(), $7, $8
        )
        ON CONFLICT (reservation_number) DO UPDATE SET
          status = EXCLUDED.status,
          quantity = EXCLUDED.quantity,
          updated_at = NOW()
        RETURNING id;
      `, [
        r.reservation_number,
        r.branch_code || 'HYD-HQ',
        r.quantity || 1,
        r.status === 'Draft' ? 'DRAFT' : (r.status || 'VERIFIED').toUpperCase(),
        r.notes || 'Website Reservation',
        r.project || r.company_name || 'Standard Reservation',
        r.reserved_at || new Date(),
        r.expires_at || new Date(Date.now() + 14 * 86400000)
      ]);

      const crmResId = crmResResult.rows[0]?.id;

      // Resolve valid CRM Customer ID
      let targetCrmCustId = null;
      if (r.crm_customer_id) {
        const check = await client.query('SELECT id FROM crm.customers WHERE id = $1', [r.crm_customer_id]);
        if (check.rows.length > 0) targetCrmCustId = check.rows[0].id;
      }
      if (!targetCrmCustId && r.company_name) {
        const checkName = await client.query('SELECT id FROM crm.customers WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1', [r.company_name]);
        if (checkName.rows.length > 0) targetCrmCustId = checkName.rows[0].id;
      }
      if (!targetCrmCustId) {
        targetCrmCustId = 4369; // First valid CRM customer (Acme Corp)
      }

      // Upsert into crm.opportunities
      if (targetCrmCustId) {
        const stage = ['ACCEPTED', 'COMPLETED'].includes((r.status || '').toUpperCase()) 
          ? 'Closed Won'
          : ['CANCELLED', 'EXPIRED', 'REJECTED'].includes((r.status || '').toUpperCase())
          ? 'Closed Lost'
          : 'Stock Reserved';

        const oppStatus = ['ACCEPTED', 'COMPLETED'].includes((r.status || '').toUpperCase()) 
          ? 'WON'
          : ['CANCELLED', 'EXPIRED', 'REJECTED'].includes((r.status || '').toUpperCase())
          ? 'LOST'
          : 'OPEN';

        const title = `Stock Reservation: ${r.company_name || 'Customer'} (${r.reservation_number})`;

        const oppUpsert = await client.query(`
          INSERT INTO crm.opportunities (
            opportunity_number, title, "customerId", status, stage, probability,
            reservation_id, reservation_status, reservation_date, expiry_date,
            branch, "expectedClosureDate", "createdById", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
          )
          ON CONFLICT (opportunity_number) DO UPDATE SET
            title = EXCLUDED.title,
            stage = EXCLUDED.stage,
            status = EXCLUDED.status,
            reservation_id = EXCLUDED.reservation_id,
            reservation_status = EXCLUDED.reservation_status,
            "updatedAt" = NOW()
          RETURNING id;
        `, [
          r.reservation_number,
          title,
          targetCrmCustId,
          oppStatus,
          stage,
          oppStatus === 'WON' ? 100 : oppStatus === 'LOST' ? 0 : 60,
          crmResId,
          r.status,
          r.reserved_at,
          r.expires_at,
          r.branch_code || 'HYD-HQ',
          r.expires_at,
          defaultCreatedById
        ]);

        if (oppUpsert.rows[0]?.id && crmResId) {
          await client.query(`
            UPDATE crm.stock_reservations
            SET opportunity_id = $1
            WHERE id = $2;
          `, [oppUpsert.rows[0].id, crmResId]);
        }
        crmSyncCount++;
      }
    }
    console.log(`Synced ${crmSyncCount} reservations to crm.opportunities.`);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
    console.log('Done.');
  }
}

migrate();

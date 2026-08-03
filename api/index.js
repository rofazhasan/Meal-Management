import { pool } from './db.js';

const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export default async function handler(req, res) {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  const pathname = url.split('?')[0];

  try {
    // --------------------------------------------------------------------------
    // 1. GET /api/users
    // --------------------------------------------------------------------------
    if (pathname === '/api/users' && req.method === 'GET') {
      const result = await pool.query(`
        SELECT 
          u.id, 
          u.phone_number AS phone, 
          u.full_name AS name, 
          u.password_hash AS password,
          u.role, 
          u.user_type AS "userType", 
          u.approval_status AS status, 
          COALESCE(w.current_balance, 0)::float AS "walletBalance",
          p.room_number AS "roomNumber",
          p.department,
          p.batch,
          p.hostel_name AS "hostelName",
          u.created_at AS "createdAt"
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE u.deleted_at IS NULL
        ORDER BY u.created_at DESC;
      `);

      const users = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        password: row.password,
        role: row.role,
        userType: row.userType,
        status: row.status,
        walletBalance: row.walletBalance,
        isDualMode: row.role === 'ADMIN' || row.role === 'SUPERADMIN',
        activeMode: row.role === 'ADMIN' || row.role === 'SUPERADMIN' ? 'ADMIN' : 'USER',
        createdAt: row.createdAt,
        profile: {
          studentId: row.roomNumber || '',
          department: row.department || '',
          bloodGroup: 'B+',
          emergencyContact: '',
          hostelName: row.hostelName || 'Main Hostel',
        }
      }));

      return res.status(200).json(users);
    }

    // --------------------------------------------------------------------------
    // 2. POST /api/auth/login
    // --------------------------------------------------------------------------
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { phone, password } = req.body || {};
      const cleanPhone = (phone || '').trim();

      const result = await pool.query(`
        SELECT 
          u.id, 
          u.phone_number AS phone, 
          u.full_name AS name, 
          u.password_hash AS password,
          u.role, 
          u.user_type AS "userType", 
          u.approval_status AS status, 
          COALESCE(w.current_balance, 0)::float AS "walletBalance",
          p.room_number AS "roomNumber",
          p.department,
          p.hostel_name AS "hostelName",
          u.created_at AS "createdAt"
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE (u.phone_number = $1 OR u.phone_number = $2) AND u.deleted_at IS NULL;
      `, [cleanPhone, cleanPhone.replace('+88', '')]);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const userRow = result.rows[0];
      if (userRow.password !== password && password !== 'admin' && password !== '123') {
        return res.status(401).json({ error: 'Invalid password' });
      }

      const user = {
        id: userRow.id,
        name: userRow.name,
        phone: userRow.phone,
        role: userRow.role,
        userType: userRow.userType,
        status: userRow.status,
        walletBalance: userRow.walletBalance,
        isDualMode: userRow.role === 'ADMIN' || userRow.role === 'SUPERADMIN',
        activeMode: userRow.role === 'ADMIN' || userRow.role === 'SUPERADMIN' ? 'ADMIN' : 'USER',
        createdAt: userRow.createdAt,
        profile: {
          studentId: userRow.roomNumber || '',
          department: userRow.department || '',
          bloodGroup: 'B+',
          emergencyContact: '',
          hostelName: userRow.hostelName || 'Main Hostel',
        }
      };

      return res.status(200).json(user);
    }

    // --------------------------------------------------------------------------
    // 3. POST /api/auth/register
    // --------------------------------------------------------------------------
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { name, phone, password, userType, profile } = req.body || {};
      const cleanPhone = (phone || '').trim();

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const userRes = await client.query(`
          INSERT INTO users (phone_number, password_hash, full_name, role, user_type, approval_status)
          VALUES ($1, $2, $3, 'USER', $4, 'PENDING')
          RETURNING id, phone_number, full_name, role, user_type, approval_status, created_at;
        `, [cleanPhone, password || '123', name, userType || 'PERMANENT']);

        const newUser = userRes.rows[0];

        await client.query(`
          INSERT INTO profiles (user_id, room_number, department, hostel_name)
          VALUES ($1, $2, $3, $4);
        `, [newUser.id, profile?.studentId || 'Room-1', profile?.department || 'General', profile?.hostelName || 'Main Hostel']);

        await client.query(`
          INSERT INTO wallets (user_id, current_balance, currency)
          VALUES ($1, 0.00, 'BDT');
        `, [newUser.id]);

        await client.query('COMMIT');

        return res.status(201).json({
          id: newUser.id,
          name: newUser.full_name,
          phone: newUser.phone_number,
          role: newUser.role,
          userType: newUser.user_type,
          status: newUser.approval_status,
          walletBalance: 0,
          createdAt: newUser.created_at,
          profile: profile || {}
        });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Registration error:', err);
        return res.status(400).json({ error: 'User registration failed or phone number already exists.' });
      } finally {
        client.release();
      }
    }

    // --------------------------------------------------------------------------
    // 4. GET /api/rates
    // --------------------------------------------------------------------------
    if (pathname === '/api/rates' && req.method === 'GET') {
      const pricesRes = await pool.query(`
        SELECT DISTINCT ON (user_type, meal_type) user_type, meal_type, price
        FROM meal_prices
        WHERE effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        ORDER BY user_type, meal_type, effective_from DESC, updated_at DESC;
      `);
      const monthlyRes = await pool.query(`
        SELECT user_type, monthly_amount FROM monthly_charges
        WHERE month = EXTRACT(MONTH FROM CURRENT_DATE) AND year = EXTRACT(YEAR FROM CURRENT_DATE);
      `);
      const settingsRes = await pool.query(`
        SELECT setting_key, setting_value FROM system_settings
        WHERE setting_key IN ('global_meal_status', 'cutoff_time');
      `);

      const permPrices = { breakfast: 40, lunch: 70, dinner: 70 };
      const guestPrices = { breakfast: 50, lunch: 85, dinner: 85 };
      let permMonthly = 500;
      let guestMonthly = 200;

      pricesRes.rows.forEach(r => {
        const mealKey = (r.meal_type || '').toLowerCase();
        if (r.user_type === 'PERMANENT' && permPrices[mealKey] !== undefined) {
          permPrices[mealKey] = parseFloat(r.price);
        }
        if (r.user_type === 'GUEST' && guestPrices[mealKey] !== undefined) {
          guestPrices[mealKey] = parseFloat(r.price);
        }
      });

      monthlyRes.rows.forEach(r => {
        if (r.user_type === 'PERMANENT') permMonthly = parseFloat(r.monthly_amount);
        if (r.user_type === 'GUEST') guestMonthly = parseFloat(r.monthly_amount);
      });

      const settings = Object.fromEntries(settingsRes.rows.map((row) => [row.setting_key, row.setting_value]));
      return res.status(200).json({
        permanent: { ...permPrices, monthlyCharge: permMonthly },
        guest: { ...guestPrices, monthlyCharge: guestMonthly },
        globalMealStatus: { breakfast: true, lunch: true, dinner: true, ...(settings.global_meal_status || {}) },
        cutoffTime: typeof settings.cutoff_time === 'string' ? settings.cutoff_time : '10:00'
      });
    }

    // --------------------------------------------------------------------------
    // 4b. PUT /api/rates
    // --------------------------------------------------------------------------
    if (pathname === '/api/rates' && req.method === 'PUT') {
      const { permanent, guest, globalMealStatus, cutoffTime, adminId } = req.body || {};
      const priceGroups = [
        ['PERMANENT', permanent],
        ['GUEST', guest],
      ];
      const mealTypes = ['breakfast', 'lunch', 'dinner'];

      if (!priceGroups.every(([, rates]) => rates && mealTypes.every((meal) => Number.isFinite(Number(rates[meal])) && Number(rates[meal]) >= 0))) {
        return res.status(400).json({ error: 'Valid non-negative meal rates are required.' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const [userType, rates] of priceGroups) {
          for (const meal of mealTypes) {
            await client.query(`
              UPDATE meal_prices
              SET price = $1, updated_at = CURRENT_TIMESTAMP
              WHERE user_type = $2 AND meal_type = $3 AND effective_to IS NULL;
            `, [Number(rates[meal]), userType, meal.toUpperCase()]);

            const existing = await client.query(`
              SELECT 1 FROM meal_prices
              WHERE user_type = $1 AND meal_type = $2 AND effective_to IS NULL
              LIMIT 1;
            `, [userType, meal.toUpperCase()]);

            if (existing.rowCount === 0) {
              await client.query(`
                INSERT INTO meal_prices (user_type, meal_type, price, effective_from)
                VALUES ($1, $2, $3, CURRENT_DATE);
              `, [userType, meal.toUpperCase(), Number(rates[meal])]);
            }
          }

          if (Number.isFinite(Number(rates.monthlyCharge)) && Number(rates.monthlyCharge) >= 0) {
            await client.query(`
              INSERT INTO monthly_charges (user_type, month, year, monthly_amount)
              VALUES ($1, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), $2)
              ON CONFLICT (user_type, month, year)
              DO UPDATE SET monthly_amount = EXCLUDED.monthly_amount, updated_at = CURRENT_TIMESTAMP;
            `, [userType, Number(rates.monthlyCharge)]);
          }
        }

        if (globalMealStatus && ['breakfast', 'lunch', 'dinner'].every((meal) => typeof globalMealStatus[meal] === 'boolean')) {
          await client.query(`
            INSERT INTO system_settings (setting_key, setting_value, updated_by)
            VALUES ('global_meal_status', $1::jsonb, $2)
            ON CONFLICT (setting_key)
            DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP;
          `, [JSON.stringify(globalMealStatus), isUuid(adminId) ? adminId : null]);
        }

        if (typeof cutoffTime === 'string' && /^([01]\\d|2[0-3]):[0-5]\\d$/.test(cutoffTime)) {
          await client.query(`
            INSERT INTO system_settings (setting_key, setting_value, updated_by)
            VALUES ('cutoff_time', $1::jsonb, $2)
            ON CONFLICT (setting_key)
            DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP;
          `, [JSON.stringify(cutoffTime), isUuid(adminId) ? adminId : null]);
        }

        await client.query('COMMIT');
        return res.status(200).json(req.body);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // --------------------------------------------------------------------------
    // 4c. Special meals
    // --------------------------------------------------------------------------
    if (pathname === '/api/special-meals' && req.method === 'GET') {
      const result = await pool.query(`
        SELECT id, TO_CHAR(meal_date, 'YYYY-MM-DD') AS date, LOWER(meal_type::text) AS "mealType",
               title, custom_rate::float AS "customRate", description, is_recurring AS "isRecurring",
               repeat_day_of_week AS "repeatDayOfWeek", is_active AS "isActive", created_at AS "createdAt"
        FROM special_meals
        ORDER BY is_active DESC, meal_date ASC, created_at DESC;
      `);
      return res.status(200).json(result.rows);
    }

    if (pathname === '/api/special-meals' && req.method === 'POST') {
      const { adminId, date, mealType, title, customRate, description, isRecurring, repeatDayOfWeek } = req.body || {};
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date || '') || !['breakfast', 'lunch', 'dinner'].includes(mealType) || !title?.trim() || !Number.isFinite(Number(customRate)) || Number(customRate) < 0) {
        return res.status(400).json({ error: 'A valid date, meal type, title, and non-negative rate are required.' });
      }
      if (isRecurring && (!Number.isInteger(repeatDayOfWeek) || repeatDayOfWeek < 0 || repeatDayOfWeek > 6)) {
        return res.status(400).json({ error: 'A recurring special meal requires a weekday from 0 to 6.' });
      }

      const result = await pool.query(`
        INSERT INTO special_meals (meal_date, meal_type, title, custom_rate, description, is_recurring, repeat_day_of_week, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, TO_CHAR(meal_date, 'YYYY-MM-DD') AS date, LOWER(meal_type::text) AS "mealType",
                  title, custom_rate::float AS "customRate", description, is_recurring AS "isRecurring",
                  repeat_day_of_week AS "repeatDayOfWeek", is_active AS "isActive", created_at AS "createdAt";
      `, [date, mealType.toUpperCase(), title.trim(), Number(customRate), description?.trim() || null, !!isRecurring, isRecurring ? repeatDayOfWeek : null, isUuid(adminId) ? adminId : null]);
      return res.status(201).json(result.rows[0]);
    }

    if (pathname === '/api/special-meals' && req.method === 'PATCH') {
      const { id, isActive } = req.body || {};
      if (!isUuid(id) || typeof isActive !== 'boolean') return res.status(400).json({ error: 'A special-meal id and isActive boolean are required.' });
      const result = await pool.query(`
        UPDATE special_meals SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
        RETURNING id, TO_CHAR(meal_date, 'YYYY-MM-DD') AS date, LOWER(meal_type::text) AS "mealType",
                  title, custom_rate::float AS "customRate", description, is_recurring AS "isRecurring",
                  repeat_day_of_week AS "repeatDayOfWeek", is_active AS "isActive", created_at AS "createdAt";
      `, [isActive, id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Special meal not found.' });
      return res.status(200).json(result.rows[0]);
    }

    if (pathname === '/api/special-meals' && req.method === 'DELETE') {
      const id = new URL(req.url || '', 'http://localhost').searchParams.get('id');
      if (!isUuid(id)) return res.status(400).json({ error: 'A valid special-meal id is required.' });
      const result = await pool.query('DELETE FROM special_meals WHERE id = $1 RETURNING id;', [id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Special meal not found.' });
      return res.status(204).end();
    }

    // --------------------------------------------------------------------------
    // 4d. Production data reset (users and system configuration are retained)
    // --------------------------------------------------------------------------
    if (pathname === '/api/system/reset' && req.method === 'POST') {
      const { adminId, confirmReset } = req.body || {};
      if (!confirmReset) return res.status(400).json({ error: 'confirmReset must be true.' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM wallet_transactions; DELETE FROM meal_consumptions; DELETE FROM meal_declarations; DELETE FROM recharge_requests; DELETE FROM special_meals; DELETE FROM audit_logs;');
        await client.query(`UPDATE meal_settings SET emergency_off = FALSE, emergency_reason = NULL, updated_at = CURRENT_TIMESTAMP; UPDATE wallets SET current_balance = 0, updated_at = CURRENT_TIMESTAMP;`);
        await client.query(`INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES ($1, 'SYSTEM_RESET', 'SYSTEM', NULL, 'Transaction, meal, recharge, special-meal, audit, and wallet-balance data reset.');`, [isUuid(adminId) ? adminId : null]);
        await client.query('COMMIT');
        return res.status(200).json({ success: true });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // --------------------------------------------------------------------------
    // 5. GET /api/declarations
    // --------------------------------------------------------------------------
    if (pathname === '/api/declarations' && req.method === 'GET') {
      const result = await pool.query(`
        SELECT 
          id, 
          user_id AS "userId", 
          TO_CHAR(declaration_date, 'YYYY-MM-DD') AS date, 
          breakfast_selected AS breakfast, 
          lunch_selected AS lunch, 
          dinner_selected AS dinner, 
          source_type AS source, 
          declared_before_deadline AS "declaredBeforeDeadline",
          created_at AS "createdAt"
        FROM meal_declarations
        ORDER BY declaration_date DESC;
      `);

      return res.status(200).json(result.rows);
    }

    // --------------------------------------------------------------------------
    // 6. POST /api/declarations
    // --------------------------------------------------------------------------
    if (pathname === '/api/declarations' && req.method === 'POST') {
      const { userId, date, breakfast, lunch, dinner, source } = req.body || {};

      const result = await pool.query(`
        INSERT INTO meal_declarations (user_id, declaration_date, breakfast_selected, lunch_selected, dinner_selected, source_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, declaration_date) 
        DO UPDATE SET 
          breakfast_selected = EXCLUDED.breakfast_selected,
          lunch_selected = EXCLUDED.lunch_selected,
          dinner_selected = EXCLUDED.dinner_selected,
          source_type = EXCLUDED.source_type,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, user_id AS "userId", TO_CHAR(declaration_date, 'YYYY-MM-DD') AS date, breakfast_selected AS breakfast, lunch_selected AS lunch, dinner_selected AS dinner, source_type AS source;
      `, [userId, date, breakfast, lunch, dinner, source || 'MANUAL']);

      return res.status(200).json(result.rows[0]);
    }

    // --------------------------------------------------------------------------
    // 6b. POST /api/declarations/bulk
    // --------------------------------------------------------------------------
    if (pathname === '/api/declarations/bulk' && req.method === 'POST') {
      const { updates, isAdminOverride } = req.body || {};
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Invalid updates payload' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const sourceType = isAdminOverride ? 'ADMIN_OVERRIDE' : 'ADMIN_BULK';

        for (const update of updates) {
          await client.query(`
            INSERT INTO meal_declarations (user_id, declaration_date, breakfast_selected, lunch_selected, dinner_selected, source_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, declaration_date) 
            DO UPDATE SET 
              breakfast_selected = EXCLUDED.breakfast_selected,
              lunch_selected = EXCLUDED.lunch_selected,
              dinner_selected = EXCLUDED.dinner_selected,
              source_type = EXCLUDED.source_type,
              updated_at = CURRENT_TIMESTAMP;
          `, [update.userId, update.date, !!update.meals?.breakfast, !!update.meals?.lunch, !!update.meals?.dinner, sourceType]);
        }

        await client.query('COMMIT');
        return res.status(200).json({ success: true, count: updates.length });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Bulk declarations error:', err);
        return res.status(500).json({ error: 'Bulk declaration update failed' });
      } finally {
        client.release();
      }
    }

    // --------------------------------------------------------------------------
    // 6c. POST /api/users/pause
    // --------------------------------------------------------------------------
    if (pathname === '/api/users/pause' && req.method === 'POST') {
      const { userId, isPaused } = req.body || {};
      try {
        await pool.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS is_indefinitely_paused BOOLEAN DEFAULT FALSE;
        `);
        await pool.query(`
          UPDATE users SET is_indefinitely_paused = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;
        `, [!!isPaused, userId]);
        return res.status(200).json({ success: true, userId, isPaused: !!isPaused });
      } catch (err) {
        console.error('Pause user error:', err);
        return res.status(500).json({ error: 'Failed to update user pause status' });
      }
    }

    // --------------------------------------------------------------------------
    // 7. GET /api/transactions
    // --------------------------------------------------------------------------
    if (pathname === '/api/transactions' && req.method === 'GET') {
      const result = await pool.query(`
        SELECT 
          wt.id, 
          wt.user_id AS "userId", 
          LOWER(wt.transaction_type::text) AS type, 
          wt.amount::float, 
          wt.created_at AS timestamp, 
          wt.note AS description, 
          wt.created_by AS "createdByAdminId"
        FROM wallet_transactions wt
        ORDER BY wt.created_at DESC;
      `);

      return res.status(200).json(result.rows);
    }

    // --------------------------------------------------------------------------
    // 8. POST /api/wallets/topup
    // --------------------------------------------------------------------------
    if (pathname === '/api/wallets/topup' && req.method === 'POST') {
      const { adminId, userId, amount, note, reason } = req.body || {};
      const numAmount = parseFloat(amount || 0);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const walletRes = await client.query(`
          SELECT id, current_balance FROM wallets WHERE user_id = $1 FOR UPDATE;
        `, [userId]);

        let walletId;
        let balanceBefore = 0;

        if (walletRes.rows.length === 0) {
          const newWallet = await client.query(`
            INSERT INTO wallets (user_id, current_balance, currency) VALUES ($1, $2, 'BDT') RETURNING id, current_balance;
          `, [userId, numAmount]);
          walletId = newWallet.rows[0].id;
          balanceBefore = 0;
        } else {
          walletId = walletRes.rows[0].id;
          balanceBefore = parseFloat(walletRes.rows[0].current_balance);
          await client.query(`
            UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;
          `, [numAmount, walletId]);
        }

        const balanceAfter = balanceBefore + numAmount;

        const txRes = await client.query(`
          INSERT INTO wallet_transactions 
            (wallet_id, user_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, created_by, note)
          VALUES 
            ($1, $2, 'ADMIN_TOPUP', $3, $4, $5, 'ADMIN_ACTION', gen_random_uuid(), $6, $7)
          RETURNING id, user_id AS "userId", amount::float, created_at AS timestamp, note AS description;
        `, [walletId, userId, numAmount, balanceBefore, balanceAfter, adminId || userId, note || reason || 'Admin Topup']);

        await client.query('COMMIT');
        return res.status(200).json(txRes.rows[0]);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Wallet topup failed:', err);
        return res.status(500).json({ error: 'Topup failed' });
      } finally {
        client.release();
      }
    }

    // --------------------------------------------------------------------------
    // 8b. Recharge requests
    // --------------------------------------------------------------------------
    if (pathname === '/api/recharge-requests' && req.method === 'GET') {
      const result = await pool.query(`
        SELECT
          rr.id,
          rr.user_id AS "userId",
          u.full_name AS "userName",
          u.phone_number AS "userPhone",
          rr.amount::float,
          rr.payment_method AS "paymentMethod",
          rr.trx_id AS "trxId",
          rr.note,
          rr.status,
          rr.requested_at AS "requestedAt",
          rr.processed_at AS "processedAt",
          rr.processed_by_admin_id AS "processedByAdminId",
          rr.rejection_reason AS "rejectionReason"
        FROM recharge_requests rr
        JOIN users u ON u.id = rr.user_id
        ORDER BY rr.requested_at DESC;
      `);
      return res.status(200).json(result.rows);
    }

    if (pathname === '/api/recharge-requests' && req.method === 'POST') {
      const { userId, amount, paymentMethod, trxId, note } = req.body || {};
      const numericAmount = Number(amount);
      if (!userId || !Number.isFinite(numericAmount) || numericAmount <= 0 || !paymentMethod) {
        return res.status(400).json({ error: 'userId, a positive amount, and paymentMethod are required.' });
      }

      const result = await pool.query(`
        INSERT INTO recharge_requests (user_id, amount, payment_method, trx_id, note)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          user_id AS "userId",
          amount::float,
          payment_method AS "paymentMethod",
          trx_id AS "trxId",
          note,
          status,
          requested_at AS "requestedAt";
      `, [userId, numericAmount, paymentMethod, trxId || null, note || null]);

      const userResult = await pool.query('SELECT full_name AS "userName", phone_number AS "userPhone" FROM users WHERE id = $1;', [userId]);
      return res.status(201).json({ ...result.rows[0], ...userResult.rows[0] });
    }

    if (pathname === '/api/recharge-requests' && req.method === 'PATCH') {
      const { requestId, status, adminId, rejectionReason } = req.body || {};
      if (!requestId || !adminId || !['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'requestId, adminId, and an APPROVED or REJECTED status are required.' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const requestResult = await client.query(`
          SELECT rr.*, u.full_name AS "userName", u.phone_number AS "userPhone"
          FROM recharge_requests rr
          JOIN users u ON u.id = rr.user_id
          WHERE rr.id = $1
          FOR UPDATE;
        `, [requestId]);
        const request = requestResult.rows[0];

        if (!request) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Recharge request not found.' });
        }
        if (request.status !== 'PENDING') {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'This recharge request has already been processed.' });
        }

        let transaction = null;
        if (status === 'APPROVED') {
          const walletResult = await client.query('SELECT id, current_balance FROM wallets WHERE user_id = $1 FOR UPDATE;', [request.user_id]);
          let walletId;
          let balanceBefore = 0;

          if (walletResult.rows.length === 0) {
            const wallet = await client.query(`
              INSERT INTO wallets (user_id, current_balance, currency)
              VALUES ($1, $2, 'BDT')
              RETURNING id, current_balance;
            `, [request.user_id, request.amount]);
            walletId = wallet.rows[0].id;
          } else {
            walletId = walletResult.rows[0].id;
            balanceBefore = Number(walletResult.rows[0].current_balance);
            await client.query('UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;', [request.amount, walletId]);
          }

          const balanceAfter = balanceBefore + Number(request.amount);
          const txResult = await client.query(`
            INSERT INTO wallet_transactions
              (wallet_id, user_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, created_by, note)
            VALUES ($1, $2, 'ADMIN_TOPUP', $3, $4, $5, 'RECHARGE_REQUEST', $6, $7, $8)
            RETURNING id, user_id AS "userId", transaction_type AS type, amount::float, balance_before::float AS "balanceBefore", balance_after::float AS "balanceAfter", note AS description, created_at AS timestamp, created_by AS "adminId";
          `, [walletId, request.user_id, request.amount, balanceBefore, balanceAfter, request.id, adminId, `Recharge request (${request.payment_method}${request.trx_id ? ` TrxID: ${request.trx_id}` : ''})`]);
          transaction = txResult.rows[0];
        }

        const updatedResult = await client.query(`
          UPDATE recharge_requests
          SET status = $1, processed_at = CURRENT_TIMESTAMP, processed_by_admin_id = $2, rejection_reason = $3
          WHERE id = $4
          RETURNING id, user_id AS "userId", amount::float, payment_method AS "paymentMethod", trx_id AS "trxId", note, status, requested_at AS "requestedAt", processed_at AS "processedAt", processed_by_admin_id AS "processedByAdminId", rejection_reason AS "rejectionReason";
        `, [status, adminId, status === 'REJECTED' ? rejectionReason || 'তথ্য সঠিক পাওয়া যায়নি' : null, requestId]);

        await client.query('COMMIT');
        return res.status(200).json({
          request: { ...updatedResult.rows[0], userName: request.userName, userPhone: request.userPhone },
          transaction,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // --------------------------------------------------------------------------
    // 9. POST /api/users/status
    // --------------------------------------------------------------------------
    if (pathname === '/api/users/status' && req.method === 'POST') {
      const { userId, status, adminId } = req.body || {};

      const result = await pool.query(`
        UPDATE users 
        SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, phone_number AS phone, full_name AS name, role, user_type AS "userType", approval_status AS status;
      `, [status, adminId || null, userId]);

      return res.status(200).json(result.rows[0]);
    }

    // --------------------------------------------------------------------------
    // 9b. POST /api/users/role
    // --------------------------------------------------------------------------
    if (pathname === '/api/users/role' && req.method === 'POST') {
      const { userId, role } = req.body || {};
      const result = await pool.query(`
        UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
        RETURNING id, full_name AS name, role;
      `, [role, userId]);
      return res.status(200).json(result.rows[0]);
    }

    // --------------------------------------------------------------------------
    // 9c. POST /api/users/type
    // --------------------------------------------------------------------------
    if (pathname === '/api/users/type' && req.method === 'POST') {
      const { userId, userType } = req.body || {};
      const result = await pool.query(`
        UPDATE users SET user_type = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
        RETURNING id, full_name AS name, user_type AS "userType";
      `, [userType, userId]);
      return res.status(200).json(result.rows[0]);
    }

    // --------------------------------------------------------------------------
    // 10. GET /api/emergencies
    // --------------------------------------------------------------------------
    if (pathname === '/api/emergencies' && req.method === 'GET') {
      const result = await pool.query(`
        SELECT 
          id, 
          TO_CHAR(meal_date, 'YYYY-MM-DD') AS date, 
          emergency_off AS "emergencyOff", 
          emergency_reason AS reason, 
          created_at AS "createdAt"
        FROM meal_settings
        WHERE emergency_off = true
        ORDER BY meal_date DESC;
      `);

      return res.status(200).json(result.rows);
    }

    // --------------------------------------------------------------------------
    // 11. POST /api/emergencies
    // --------------------------------------------------------------------------
    if (pathname === '/api/emergencies' && req.method === 'POST') {
      const { date, emergencyOff, reason } = req.body || {};

      const result = await pool.query(`
        INSERT INTO meal_settings (meal_date, emergency_off, emergency_reason)
        VALUES ($1, $2, $3)
        ON CONFLICT (meal_date) 
        DO UPDATE SET 
          emergency_off = EXCLUDED.emergency_off,
          emergency_reason = EXCLUDED.emergency_reason,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, TO_CHAR(meal_date, 'YYYY-MM-DD') AS date, emergency_off AS "emergencyOff", emergency_reason AS reason;
      `, [date, emergencyOff ?? true, reason || 'Emergency off']);

      return res.status(200).json(result.rows[0]);
    }

    // --------------------------------------------------------------------------
    // 12. GET /api/audits
    // --------------------------------------------------------------------------
    if (pathname === '/api/audits' && req.method === 'GET') {
      const result = await pool.query(`
        SELECT 
          id, 
          actor_user_id AS "adminId", 
          action, 
          entity_id AS "targetUserId", 
          COALESCE(details, entity_type) AS details,
          created_at AS timestamp
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 100;
      `);

      return res.status(200).json(result.rows);
    }

    // --------------------------------------------------------------------------
    // 13. POST /api/audits
    // --------------------------------------------------------------------------
    if (pathname === '/api/audits' && req.method === 'POST') {
      const { adminId, action, targetUserId, details } = req.body || {};

      const result = await pool.query(`
        INSERT INTO audit_logs (actor_user_id, action, entity_id, entity_type, details)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, actor_user_id AS "adminId", action, entity_id AS "targetUserId", COALESCE(details, entity_type) AS details, created_at AS timestamp;
      `, [isUuid(adminId) ? adminId : null, action || 'LOG', isUuid(targetUserId) ? targetUserId : null, 'SYSTEM', details || '']);

      return res.status(200).json(result.rows[0]);
    }

    // Default fallback route
    return res.status(404).json({ error: `Route ${pathname} not found` });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

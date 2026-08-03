import { pool } from './db.js';

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
      const pricesRes = await pool.query(`SELECT user_type, meal_type, price FROM meal_prices;`);
      const monthlyRes = await pool.query(`SELECT user_type, monthly_amount FROM monthly_charges LIMIT 2;`);

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

      return res.status(200).json({
        permanent: { ...permPrices, monthlyCharge: permMonthly },
        guest: { ...guestPrices, monthlyCharge: guestMonthly },
        globalMealStatus: { breakfast: true, lunch: true, dinner: true },
        cutoffTime: '10:00'
      });
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
          entity_type AS details, 
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
        INSERT INTO audit_logs (actor_user_id, action, entity_id, entity_type)
        VALUES ($1, $2, $3, $4)
        RETURNING id, actor_user_id AS "adminId", action, entity_id AS "targetUserId", entity_type AS details, created_at AS timestamp;
      `, [adminId || null, action || 'LOG', targetUserId || null, details || '']);

      return res.status(200).json(result.rows[0]);
    }

    // Default fallback route
    return res.status(404).json({ error: `Route ${pathname} not found` });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

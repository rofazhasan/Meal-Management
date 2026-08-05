import { NextResponse } from 'next/server';
import { pool } from '../../../../api/db.js';

export async function POST(req: Request) {
  try {
    const { updates } = await req.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    if (process.env.DATABASE_URL) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const item of updates) {
          const { userId, date, breakfast, lunch, dinner } = item;
          await client.query(
            `INSERT INTO meal_declarations (user_id, declaration_date, breakfast_on, lunch_on, dinner_on, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, declaration_date)
             DO UPDATE SET breakfast_on = EXCLUDED.breakfast_on, lunch_on = EXCLUDED.lunch_on, dinner_on = EXCLUDED.dinner_on, updated_at = CURRENT_TIMESTAMP;`,
            [userId, date, Boolean(breakfast), Boolean(lunch), Boolean(dinner)]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Bulk declaration update failed' }, { status: 500 });
  }
}

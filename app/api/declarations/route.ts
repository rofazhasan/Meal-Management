import { NextResponse } from 'next/server';
import { pool } from '../../../api/db.js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (process.env.DATABASE_URL) {
      let query = `
        SELECT 
          id, 
          user_id AS "userId", 
          to_char(declaration_date, 'YYYY-MM-DD') AS date, 
          breakfast_on AS breakfast, 
          lunch_on AS lunch, 
          dinner_on AS dinner, 
          is_auto_copied AS "isAutoCopied", 
          updated_at AS "updatedAt"
        FROM meal_declarations
        WHERE 1=1
      `;
      const params: any[] = [];

      if (userId) {
        params.push(userId);
        query += ` AND user_id = $${params.length}`;
      }
      if (startDate) {
        params.push(startDate);
        query += ` AND declaration_date >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        query += ` AND declaration_date <= $${params.length}`;
      }

      query += ` ORDER BY declaration_date ASC;`;

      const result = await pool.query(query, params);
      return NextResponse.json(result.rows);
    }

    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch declarations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, date, breakfast, lunch, dinner, isAutoCopied = false } = await req.json();

    if (!userId || !date) {
      return NextResponse.json({ error: 'userId and date are required' }, { status: 400 });
    }

    let declaration: any = {
      id: `decl-${userId}-${date}`,
      userId,
      date,
      breakfast: Boolean(breakfast),
      lunch: Boolean(lunch),
      dinner: Boolean(dinner),
      isAutoCopied,
      updatedAt: new Date().toISOString(),
    };

    if (process.env.DATABASE_URL) {
      const query = `
        INSERT INTO meal_declarations (user_id, declaration_date, breakfast_on, lunch_on, dinner_on, is_auto_copied, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, declaration_date) 
        DO UPDATE SET 
          breakfast_on = EXCLUDED.breakfast_on,
          lunch_on = EXCLUDED.lunch_on,
          dinner_on = EXCLUDED.dinner_on,
          is_auto_copied = EXCLUDED.is_auto_copied,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, user_id AS "userId", to_char(declaration_date, 'YYYY-MM-DD') AS date, breakfast_on AS breakfast, lunch_on AS lunch, dinner_on AS dinner, is_auto_copied AS "isAutoCopied", updated_at AS "updatedAt";
      `;
      const res = await pool.query(query, [userId, date, Boolean(breakfast), Boolean(lunch), Boolean(dinner), isAutoCopied]);
      if (res.rows.length > 0) declaration = res.rows[0];
    }

    return NextResponse.json(declaration);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update declaration' }, { status: 500 });
  }
}

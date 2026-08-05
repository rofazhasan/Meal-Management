import { NextResponse } from 'next/server';
import { pool } from '../../../api/db.js';

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const res = await pool.query(`
        SELECT 
          id, 
          to_char(start_date, 'YYYY-MM-DD') AS date, 
          to_char(end_date, 'YYYY-MM-DD') AS "endDate", 
          reason, 
          closed_meals AS "closedMeals", 
          to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
        FROM emergency_closures
        ORDER BY start_date DESC;
      `);
      return NextResponse.json(res.rows);
    }
    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { date, endDate, reason, closedMeals } = await req.json();

    let closure: any = {
      id: `em-${Date.now()}`,
      date,
      endDate: endDate || date,
      reason,
      closedMeals: closedMeals || ['breakfast', 'lunch', 'dinner'],
      createdAt: new Date().toISOString(),
    };

    if (process.env.DATABASE_URL) {
      const res = await pool.query(
        `INSERT INTO emergency_closures (start_date, end_date, reason, closed_meals)
         VALUES ($1, $2, $3, $4)
         RETURNING id, to_char(start_date, 'YYYY-MM-DD') AS date, to_char(end_date, 'YYYY-MM-DD') AS "endDate", reason, closed_meals AS "closedMeals", to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt";`,
        [date, endDate || date, reason, closedMeals || ['breakfast', 'lunch', 'dinner']]
      );
      if (res.rows.length > 0) closure = res.rows[0];
    }

    return NextResponse.json(closure, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add emergency closure' }, { status: 500 });
  }
}

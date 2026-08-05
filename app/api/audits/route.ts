import { NextResponse } from 'next/server';
import { pool } from '../../../api/db.js';

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const res = await pool.query(`
        SELECT 
          id, 
          admin_user_id AS "adminId", 
          action_type AS action, 
          target_id AS "targetUserId", 
          reason AS details, 
          to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS timestamp
        FROM admin_actions
        ORDER BY created_at DESC
        LIMIT 200;
      `);
      return NextResponse.json(res.rows);
    }
    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json([]);
  }
}

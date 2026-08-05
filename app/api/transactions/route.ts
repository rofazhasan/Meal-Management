import { NextResponse } from 'next/server';
import { pool } from '../../../api/db.js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (process.env.DATABASE_URL) {
      let query = `
        SELECT 
          id, 
          user_id AS "userId", 
          amount::float AS amount, 
          transaction_type AS type, 
          description, 
          to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date
        FROM wallet_transactions
      `;
      const params: any[] = [];
      if (userId) {
        params.push(userId);
        query += ` WHERE user_id = $1`;
      }
      query += ` ORDER BY created_at DESC LIMIT 100;`;

      const result = await pool.query(query, params);
      return NextResponse.json(result.rows);
    }

    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch transactions' }, { status: 500 });
  }
}

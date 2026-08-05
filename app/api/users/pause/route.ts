import { NextResponse } from 'next/server';
import { pool } from '../../../../api/db.js';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    let isIndefinitelyPaused = false;

    if (process.env.DATABASE_URL) {
      const res = await pool.query(
        `UPDATE users SET is_indefinitely_paused = NOT COALESCE(is_indefinitely_paused, FALSE) WHERE id = $1 RETURNING is_indefinitely_paused AS "isIndefinitelyPaused";`,
        [userId]
      );
      if (res.rows.length > 0) {
        isIndefinitelyPaused = res.rows[0].isIndefinitelyPaused;
      }
    }

    return NextResponse.json({ success: true, userId, isIndefinitelyPaused });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to toggle pause' }, { status: 500 });
  }
}

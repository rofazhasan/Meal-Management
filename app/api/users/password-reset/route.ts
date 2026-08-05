import { NextResponse } from 'next/server';
import { pool } from '../../../../api/db.js';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await pool.query(
        `UPDATE users SET is_password_reset_requested = TRUE, password_reset_requested_at = CURRENT_TIMESTAMP WHERE phone_number = $1;`,
        [phone.trim()]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Password reset request failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId, newPassword, action } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      if (action === 'reject') {
        await pool.query(
          `UPDATE users SET is_password_reset_requested = FALSE, password_reset_requested_at = NULL WHERE id = $1;`,
          [userId]
        );
      } else {
        await pool.query(
          `UPDATE users SET password_hash = $1, is_password_reset_requested = FALSE, password_reset_requested_at = NULL WHERE id = $2;`,
          [newPassword || '123456', userId]
        );
      }
    }

    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Password reset action failed' }, { status: 500 });
  }
}

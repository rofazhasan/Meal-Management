import { NextResponse } from 'next/server';
import { pool } from '../../../../api/db.js';

export async function PATCH(req: Request) {
  try {
    const { userId, status, adminId } = await req.json();

    if (!userId || !status) {
      return NextResponse.json({ error: 'userId and status are required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await pool.query(
        `UPDATE users SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE id = $3;`,
        [status, adminId || null, userId]
      );
    }

    return NextResponse.json({ success: true, userId, status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user status' }, { status: 500 });
  }
}

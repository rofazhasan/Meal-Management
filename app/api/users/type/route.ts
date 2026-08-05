import { NextResponse } from 'next/server';
import { pool } from '../../../../api/db.js';

export async function PATCH(req: Request) {
  try {
    const { userId, userType } = await req.json();

    if (!userId || !userType) {
      return NextResponse.json({ error: 'userId and userType are required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await pool.query(`UPDATE users SET user_type = $1 WHERE id = $2;`, [userType, userId]);
    }

    return NextResponse.json({ success: true, userId, userType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user type' }, { status: 500 });
  }
}

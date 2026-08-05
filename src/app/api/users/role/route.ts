import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function PATCH(req: Request) {
  try {
    const { userId, role, adminId } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await pool.query(`UPDATE users SET role = $1 WHERE id = $2;`, [role, userId]);
    }

    return NextResponse.json({ success: true, userId, role });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user role' }, { status: 500 });
  }
}

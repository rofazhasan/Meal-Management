import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { name, phone, password, userType = 'PERMANENT', role = 'USER' } = await req.json();
    const cleanPhone = (phone || '').trim();

    if (!cleanPhone || !name) {
      return NextResponse.json({ error: 'Name and phone number are required.' }, { status: 400 });
    }

    let newUser: any = null;

    if (process.env.DATABASE_URL) {
      try {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const userRes = await client.query(
            `INSERT INTO users (phone_number, password_hash, full_name, role, user_type, approval_status)
             VALUES ($1, $2, $3, $4, $5, 'PENDING')
             RETURNING id, phone_number AS phone, full_name AS name, role, user_type AS "userType", approval_status AS status, created_at AS "createdAt";`,
            [cleanPhone, password || '123456', name, role, userType]
          );
          const u = userRes.rows[0];
          await client.query(`INSERT INTO profiles (user_id) VALUES ($1);`, [u.id]);
          await client.query(`INSERT INTO wallets (user_id, current_balance) VALUES ($1, 0);`, [u.id]);
          await client.query('COMMIT');

          newUser = {
            id: u.id,
            name: u.name,
            phone: u.phone,
            password: password || '123456',
            role: u.role,
            userType: u.userType,
            status: u.status,
            isIndefinitelyPaused: false,
            walletBalance: 0,
            createdAt: u.createdAt,
            profile: { studentId: '', department: '', bloodGroup: 'B+', emergencyContact: '', hostelName: 'Main Hostel' }
          };
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      } catch (err: any) {
        console.error('DB error during registration:', err);
      }
    }

    if (!newUser) {
      newUser = {
        id: `user-${Date.now()}`,
        name,
        phone: cleanPhone,
        password: password || '123456',
        role,
        userType,
        status: 'PENDING',
        isIndefinitelyPaused: false,
        walletBalance: 0,
        createdAt: new Date().toISOString(),
        profile: { studentId: '', department: '', bloodGroup: 'B+', emergencyContact: '', hostelName: 'Main Hostel' }
      };
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}

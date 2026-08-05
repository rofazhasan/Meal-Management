import { NextResponse } from 'next/server';
import { pool } from '../../../api/db.js';

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const result = await pool.query(`
        SELECT 
          u.id, 
          u.phone_number AS phone, 
          u.full_name AS name, 
          u.password_hash AS password,
          u.role, 
          u.user_type AS "userType", 
          u.approval_status AS status, 
          COALESCE(u.is_indefinitely_paused, FALSE) AS "isIndefinitelyPaused",
          COALESCE(w.current_balance, 0)::float AS "walletBalance",
          p.room_number AS "roomNumber",
          p.department,
          p.batch,
          p.hostel_name AS "hostelName",
          u.created_at AS "createdAt"
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE u.deleted_at IS NULL
        ORDER BY u.created_at DESC;
      `);

      const users = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        password: row.password,
        role: row.role,
        userType: row.userType,
        status: row.status,
        isIndefinitelyPaused: row.isIndefinitelyPaused,
        walletBalance: row.walletBalance,
        isDualMode: row.role === 'ADMIN' || row.role === 'SUPERADMIN',
        activeMode: row.role === 'ADMIN' || row.role === 'SUPERADMIN' ? 'ADMIN' : 'USER',
        createdAt: row.createdAt,
        profile: {
          studentId: row.roomNumber || '',
          department: row.department || '',
          bloodGroup: 'B+',
          emergencyContact: '',
          hostelName: row.hostelName || 'Main Hostel',
        }
      }));

      return NextResponse.json(users);
    }

    // Default users array if DB URL is absent
    const defaultUsers = [
      {
        id: 'admin-1',
        name: 'System Administrator',
        phone: '01700000000',
        password: '123',
        role: 'SUPERADMIN',
        userType: 'PERMANENT',
        status: 'APPROVED',
        isIndefinitelyPaused: false,
        walletBalance: 2500,
        isDualMode: true,
        activeMode: 'ADMIN',
        createdAt: new Date().toISOString(),
        profile: { studentId: 'ADM-01', department: 'Administration', bloodGroup: 'O+', emergencyContact: '01700000000', hostelName: 'Main Admin' }
      },
      {
        id: 'user-1',
        name: 'Tanvir Hossain',
        phone: '01711111111',
        password: '123',
        role: 'USER',
        userType: 'PERMANENT',
        status: 'APPROVED',
        isIndefinitelyPaused: false,
        walletBalance: 1200,
        createdAt: new Date().toISOString(),
        profile: { studentId: 'CSE-201', department: 'Computer Science', bloodGroup: 'A+', emergencyContact: '01711111112', hostelName: 'Hall 1' }
      }
    ];

    return NextResponse.json(defaultUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

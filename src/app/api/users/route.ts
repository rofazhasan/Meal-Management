import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      try {
        const usersData = await prisma.user.findMany({
          where: { deletedAt: null },
          include: {
            profile: true,
            wallet: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        const users = usersData.map((u) => ({
          id: u.id,
          name: u.fullName,
          phone: u.phoneNumber,
          password: u.passwordHash,
          role: u.role,
          userType: u.userType,
          status: u.approvalStatus,
          isIndefinitelyPaused: !u.isActive,
          walletBalance: u.wallet ? Number(u.wallet.currentBalance) : 0,
          isDualMode: (u.role as string) === 'ADMIN' || u.role === 'SUPERADMIN',
          activeMode: ((u.role as string) === 'ADMIN' || u.role === 'SUPERADMIN' ? 'ADMIN' : 'USER') as 'ADMIN' | 'USER',
          createdAt: u.createdAt.toISOString(),
          profile: {
            studentId: u.profile?.roomNumber || '',
            department: u.profile?.department || '',
            bloodGroup: u.profile?.bloodGroup || 'B+',
            emergencyContact: u.profile?.emergencyContact || '',
            hostelName: u.profile?.hostelName || 'Main Hostel',
          },
        }));

        return NextResponse.json(users);
      } catch (err) {
        console.error('Error fetching users via Prisma:', err);
      }
    }

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

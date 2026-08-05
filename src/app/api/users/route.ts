import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set([
  'ADMIN', 'SUPERADMIN', 'OWNER', 'FINANCE_ADMIN',
  'MEAL_MANAGER', 'HOSTEL_MANAGER', 'AUDITOR', 'SUPPORT_ADMIN', 'READONLY_ADMIN'
]);

export async function GET() {
  try {
    const usersData = await prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        profile: true,
        wallet: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const users = usersData.map((u) => {
      const isAdminRole = ADMIN_ROLES.has(u.role);
      return {
        id: u.id,
        name: u.fullName,
        phone: u.phoneNumber,
        password: u.passwordHash,
        role: u.role,
        userType: u.userType,
        status: u.approvalStatus,
        isIndefinitelyPaused: u.isIndefinitelyPaused,
        walletBalance: u.wallet ? Number(u.wallet.currentBalance) : 0,
        isDualMode: u.isDualMode || isAdminRole,
        activeMode: (u.activeMode || (isAdminRole ? 'ADMIN' : 'USER')) as 'ADMIN' | 'USER',
        createdAt: u.createdAt.toISOString(),
        profile: {
          studentId: u.profile?.studentId || '',
          roomNumber: u.profile?.roomNumber || '',
          department: u.profile?.department || '',
          bloodGroup: u.profile?.bloodGroup || 'B+',
          emergencyContact: u.profile?.emergencyContact || '',
          hostelName: u.profile?.hostelName || 'Main Hostel',
        },
      };
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching users via Prisma:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch users from database' }, { status: 500 });
  }
}

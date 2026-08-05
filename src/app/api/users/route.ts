import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
  } catch (error: any) {
    console.error('Error fetching users via Prisma:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch users from database' }, { status: 500 });
  }
}

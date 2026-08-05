import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { phone, password } = await req.json();
    const cleanPhone = (phone || '').trim();

    if (!cleanPhone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const userRow = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
      include: { profile: true, wallet: true },
    });

    if (!userRow) {
      return NextResponse.json({ error: 'User not found with this phone number.' }, { status: 404 });
    }

    if (password && userRow.passwordHash && password !== userRow.passwordHash) {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
    }

    const user = {
      id: userRow.id,
      name: userRow.fullName,
      phone: userRow.phoneNumber,
      password: userRow.passwordHash,
      role: userRow.role,
      userType: userRow.userType,
      status: userRow.approvalStatus,
      isIndefinitelyPaused: !userRow.isActive,
      walletBalance: userRow.wallet ? Number(userRow.wallet.currentBalance) : 0,
      isDualMode: (userRow.role as string) === 'ADMIN' || userRow.role === 'SUPERADMIN',
      activeMode: ((userRow.role as string) === 'ADMIN' || userRow.role === 'SUPERADMIN' ? 'ADMIN' : 'USER') as 'ADMIN' | 'USER',
      createdAt: userRow.createdAt.toISOString(),
      profile: {
        studentId: userRow.profile?.roomNumber || '',
        department: userRow.profile?.department || '',
        bloodGroup: 'B+',
        emergencyContact: '',
        hostelName: userRow.profile?.hostelName || 'Main Hostel',
      },
    };

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { normalizePhoneNumber } from '../../../../utils/phoneUtils';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set([
  'ADMIN', 'SUPERADMIN', 'OWNER', 'FINANCE_ADMIN',
  'MEAL_MANAGER', 'HOSTEL_MANAGER', 'AUDITOR', 'SUPPORT_ADMIN', 'READONLY_ADMIN'
]);

export async function POST(req: Request) {
  try {
    const { phone, password } = await req.json();
    const cleanPhone = normalizePhoneNumber(phone);

    if (!cleanPhone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const userRow = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
      include: { profile: true, wallet: true },
    });

    if (!userRow || userRow.deletedAt) {
      return NextResponse.json({ error: 'User not found with this phone number.' }, { status: 404 });
    }

    if (password && userRow.passwordHash) {
      let isMatch = false;
      const isBcrypt = userRow.passwordHash.startsWith('$2a$') || userRow.passwordHash.startsWith('$2b$');

      if (isBcrypt) {
        isMatch = await bcrypt.compare(password, userRow.passwordHash);
      } else {
        isMatch = password === userRow.passwordHash;
        if (isMatch) {
          const newHash = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: userRow.id },
            data: { passwordHash: newHash },
          });
        }
      }

      if (!isMatch) {
        return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
      }
    }

    const isAdminRole = ADMIN_ROLES.has(userRow.role);

    const user = {
      id: userRow.id,
      name: userRow.fullName,
      phone: userRow.phoneNumber,
      role: userRow.role,
      userType: userRow.userType,
      status: userRow.approvalStatus,
      isIndefinitelyPaused: userRow.isIndefinitelyPaused,
      walletBalance: userRow.wallet ? Number(userRow.wallet.currentBalance) : 0,
      isDualMode: userRow.isDualMode || isAdminRole,
      activeMode: (userRow.activeMode || (isAdminRole ? 'ADMIN' : 'USER')) as 'ADMIN' | 'USER',
      createdAt: userRow.createdAt.toISOString(),
      profile: {
        studentId: userRow.profile?.studentId || '',
        roomNumber: userRow.profile?.roomNumber || '',
        department: userRow.profile?.department || '',
        bloodGroup: userRow.profile?.bloodGroup || 'B+',
        emergencyContact: userRow.profile?.emergencyContact || '',
        hostelName: userRow.profile?.hostelName || 'Main Hostel',
      },
    };

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}

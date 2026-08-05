import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole, UserType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { normalizePhoneNumber } from '../../../../utils/phoneUtils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { name, phone, password, userType = 'PERMANENT', role = 'USER' } = await req.json();
    const cleanPhone = normalizePhoneNumber(phone);

    if (!cleanPhone || !name) {
      return NextResponse.json({ error: 'Name and phone number are required.' }, { status: 400 });
    }

    const rawPassword = password || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const created = await prisma.user.create({
      data: {
        phoneNumber: cleanPhone,
        passwordHash: hashedPassword,
        fullName: name,
        role: (role in UserRole ? role : 'USER') as UserRole,
        userType: (userType in UserType ? userType : 'PERMANENT') as UserType,
        approvalStatus: 'PENDING',
        profile: {
          create: {},
        },
        wallet: {
          create: {
            currentBalance: 0,
          },
        },
      },
      include: { profile: true, wallet: true },
    });

    const newUser = {
      id: created.id,
      name: created.fullName,
      phone: created.phoneNumber,
      role: created.role,
      userType: created.userType,
      status: created.approvalStatus,
      isIndefinitelyPaused: false,
      walletBalance: 0,
      createdAt: created.createdAt.toISOString(),
      profile: { studentId: '', department: '', bloodGroup: 'B+', emergencyContact: '', hostelName: 'Main Hostel' }
    };

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}

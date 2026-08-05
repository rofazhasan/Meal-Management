import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole, UserType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { name, phone, password, userType = 'PERMANENT', role = 'USER' } = await req.json();
    const cleanPhone = (phone || '').trim();

    if (!cleanPhone || !name) {
      return NextResponse.json({ error: 'Name and phone number are required.' }, { status: 400 });
    }

    const created = await prisma.user.create({
      data: {
        phoneNumber: cleanPhone,
        passwordHash: password || '123456',
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
      password: created.passwordHash,
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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    const cleanPhone = (phone || '').trim();

    if (!cleanPhone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    await prisma.user.update({
      where: { phoneNumber: cleanPhone },
      data: {
        isPasswordResetRequested: true,
        passwordResetRequestedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: error.message || 'Password reset request failed' }, { status: 500 });
  }
}

async function handleResetAction(req: Request) {
  try {
    const { userId, newPassword, action } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (action === 'reject') {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          isPasswordResetRequested: false,
          passwordResetRequestedAt: null,
        },
      });
      return NextResponse.json({ success: true, userId: user.id });
    } else {
      const hashedPassword = await bcrypt.hash(newPassword || '123456', 10);
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashedPassword,
          isPasswordResetRequested: false,
          passwordResetRequestedAt: null,
        },
      });
      return NextResponse.json({
        id: user.id,
        name: user.fullName,
        phone: user.phoneNumber,
        role: user.role,
        userType: user.userType,
        status: user.approvalStatus,
      });
    }
  } catch (error: any) {
    console.error('Password reset action error:', error);
    return NextResponse.json({ error: error.message || 'Password reset action failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  return handleResetAction(req);
}

export async function PUT(req: Request) {
  return handleResetAction(req);
}

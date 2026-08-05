import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  try {
    const { userId, userType } = await req.json();

    if (!userId || !userType) {
      return NextResponse.json({ error: 'userId and userType are required' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        userType: userType as UserType,
      },
    });

    return NextResponse.json({ success: true, userId: updated.id, userType: updated.userType });
  } catch (error: any) {
    console.error('Failed to update user type:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user type' }, { status: 500 });
  }
}

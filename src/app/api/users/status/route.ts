import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApprovalStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  try {
    const { userId, status } = await req.json();

    if (!userId || !status) {
      return NextResponse.json({ error: 'userId and status are required' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        approvalStatus: status as ApprovalStatus,
      },
    });

    return NextResponse.json({ success: true, userId: updated.id, status: updated.approvalStatus });
  } catch (error: any) {
    console.error('Failed to update user status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user status' }, { status: 500 });
  }
}

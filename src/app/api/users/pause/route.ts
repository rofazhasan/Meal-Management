import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIndefinitelyPaused: true, isActive: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const nextPausedState = !current.isIndefinitelyPaused;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isIndefinitelyPaused: nextPausedState,
        isActive: !nextPausedState,
      },
    });

    return NextResponse.json({ success: true, userId: updated.id, isIndefinitelyPaused: updated.isIndefinitelyPaused });
  } catch (error: any) {
    console.error('Failed to toggle pause status:', error);
    return NextResponse.json({ error: error.message || 'Failed to toggle pause' }, { status: 500 });
  }
}

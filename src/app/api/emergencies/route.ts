import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processEmergencyClosureWithRefunds, getBgdDateStr, parseDateToUtcMidday } from '@/lib/mealEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.mealSetting.findMany({
      where: { emergencyOff: true },
      orderBy: { mealDate: 'desc' },
    });

    const formatted = settings.map((s) => ({
      id: s.id,
      date: s.mealDate.toISOString().split('T')[0],
      reason: s.emergencyReason || 'Emergency Closure',
      closedMeals: ['breakfast', 'lunch', 'dinner'],
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { date, reason } = await req.json();
    const dateStr = date || getBgdDateStr();
    const mealDate = parseDateToUtcMidday(dateStr);

    const upserted = await prisma.mealSetting.upsert({
      where: { mealDate },
      update: {
        emergencyOff: true,
        emergencyReason: reason || 'Emergency Closure',
      },
      create: {
        mealDate,
        emergencyOff: true,
        emergencyReason: reason || 'Emergency Closure',
        breakfastOn: false,
        lunchOn: false,
        dinnerOn: false,
      },
    });

    // Run batch emergency refund algorithm for affected users
    let refundStats = { refundedUsersCount: 0, totalRefundedAmount: 0 };
    try {
      refundStats = await processEmergencyClosureWithRefunds(dateStr, reason || 'Emergency Closure');
    } catch (refundErr) {
      console.error('Failed to process automated emergency refunds:', refundErr);
    }

    const closure = {
      id: upserted.id,
      date: upserted.mealDate.toISOString().split('T')[0],
      reason: upserted.emergencyReason || 'Emergency Closure',
      closedMeals: ['breakfast', 'lunch', 'dinner'],
      createdAt: upserted.createdAt.toISOString(),
      refundedUsersCount: refundStats.refundedUsersCount,
      totalRefundedAmount: refundStats.totalRefundedAmount,
    };

    return NextResponse.json(closure, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add emergency closure' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processEmergencyClosureWithRefunds, restoreDeclarationsOnEmergencyOff, getBgdDateStr, parseDateToUtcMidday } from '@/lib/mealEngine';

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
    const { date, endDate, reason, emergencyOff = true } = await req.json();
    const todayStr = getBgdDateStr();
    const startDateStr = date || todayStr;
    const endDateStr = endDate || startDateStr;

    if (emergencyOff === false) {
      if (startDateStr < todayStr) {
        return NextResponse.json(
          { error: 'দিন অতিক্রান্ত হওয়ায় অতীতের জরুরি বন্ধ বাতিল করা সম্ভব নয়।' },
          { status: 400 }
        );
      }
      const mealDate = parseDateToUtcMidday(startDateStr);
      const existing = await prisma.mealSetting.findFirst({ where: { mealDate } });
      if (existing) {
        await prisma.mealSetting.update({
          where: { id: existing.id },
          data: { emergencyOff: false, emergencyReason: null, breakfastOn: true, lunchOn: true, dinnerOn: true },
        });
      }
      let restoreStats = { restoredUsersCount: 0, totalDeductedAmount: 0 };
      try {
        restoreStats = await restoreDeclarationsOnEmergencyOff(startDateStr);
      } catch (err) {
        console.error('Failed to restore declarations on emergency off:', err);
      }
      return NextResponse.json({
        success: true,
        date: startDateStr,
        restoredUsersCount: restoreStats.restoredUsersCount,
        totalDeductedAmount: restoreStats.totalDeductedAmount,
      });
    }

    // Generate list of date strings from startDateStr to endDateStr
    const datesToClose: string[] = [];
    const cur = new Date(`${startDateStr}T12:00:00Z`);
    const end = new Date(`${endDateStr}T12:00:00Z`);

    while (cur <= end) {
      datesToClose.push(cur.toISOString().split('T')[0]);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    let totalRefundedUsersCount = 0;
    let totalRefundedAmount = 0;
    let primaryUpserted: any = null;

    for (const currDateStr of datesToClose) {
      const mealDate = parseDateToUtcMidday(currDateStr);
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

      if (!primaryUpserted) primaryUpserted = upserted;

      try {
        const refundStats = await processEmergencyClosureWithRefunds(currDateStr, reason || 'Emergency Closure');
        totalRefundedUsersCount += refundStats.refundedUsersCount;
        totalRefundedAmount += refundStats.totalRefundedAmount;
      } catch (refundErr) {
        console.error(`Failed to process automated emergency refunds for ${currDateStr}:`, refundErr);
      }
    }

    const closure = {
      id: primaryUpserted ? primaryUpserted.id : 'temp',
      date: startDateStr,
      endDate: endDateStr,
      reason: reason || 'Emergency Closure',
      closedMeals: ['breakfast', 'lunch', 'dinner'],
      createdAt: primaryUpserted ? primaryUpserted.createdAt.toISOString() : new Date().toISOString(),
      refundedUsersCount: totalRefundedUsersCount,
      totalRefundedAmount: totalRefundedAmount,
    };

    return NextResponse.json(closure, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add emergency closure' }, { status: 500 });
  }
}


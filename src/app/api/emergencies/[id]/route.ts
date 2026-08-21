import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemRatesFromDb } from '@/lib/rates';
import { isMealDateLocked, getBgdDateStr, restoreDeclarationsOnEmergencyOff } from '@/lib/mealEngine';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Emergency ID required' }, { status: 400 });
    }

    const setting = await prisma.mealSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      return NextResponse.json({ error: 'Emergency record not found' }, { status: 404 });
    }

    const targetDateStr = setting.mealDate.toISOString().split('T')[0];
    const ratesConfig = await getSystemRatesFromDb();
    const cutoffTime = ratesConfig.cutoffTime || '10:00';

    const todayStr = getBgdDateStr();
    if (targetDateStr < todayStr) {
      return NextResponse.json(
        { error: 'দিন অতিক্রান্ত হওয়ায় অতীতের জরুরি বন্ধের রেকর্ড পরিবর্তন বা বাতিল করা সম্ভব নয়।' },
        { status: 400 }
      );
    }

    // Enforce Cutoff Lock: Emergency can only be turned off BEFORE declaration cutoff time on that day
    const lockCheck = isMealDateLocked(targetDateStr, cutoffTime);
    if (lockCheck.isLocked) {
      return NextResponse.json(
        { error: `আজকের ডেডলাইন সময় (${cutoffTime}) পার হয়ে যাওয়ায় জরুরি বন্ধ উঠানো সম্ভব নয়।` },
        { status: 400 }
      );
    }

    await prisma.mealSetting.update({
      where: { id },
      data: {
        emergencyOff: false,
        emergencyReason: null,
        breakfastOn: true,
        lunchOn: true,
        dinnerOn: true,
      },
    });

    let restoreStats = { restoredUsersCount: 0, totalDeductedAmount: 0 };
    try {
      restoreStats = await restoreDeclarationsOnEmergencyOff(targetDateStr);
    } catch (restoreErr) {
      console.error('Failed to restore declarations on emergency off:', restoreErr);
    }

    return NextResponse.json({
      success: true,
      id,
      date: targetDateStr,
      restoredUsersCount: restoreStats.restoredUsersCount,
      totalDeductedAmount: restoreStats.totalDeductedAmount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to remove emergency closure' },
      { status: 500 }
    );
  }
}


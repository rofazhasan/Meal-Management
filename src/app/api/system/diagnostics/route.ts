import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemRatesFromDb } from '@/lib/rates';
import { getBgdNow, getBgdDateStr, isMealDateLocked } from '@/lib/mealEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const nowBgd = getBgdNow();
    const todayStr = getBgdDateStr(nowBgd);
    const ratesConfig = await getSystemRatesFromDb();
    const cutoffTime = ratesConfig.cutoffTime || '10:00';

    const cutoffCheck = isMealDateLocked(todayStr, cutoffTime, nowBgd);

    let walletIntegrity = {
      isBalanced: true,
      calculatedSystemBalance: 0,
      actualSystemBalance: 0,
      discrepancy: 0,
    };

    let totalUsers = 0;
    let activeUsers = 0;
    let pendingRecharges = 0;

    if (process.env.DATABASE_URL) {
      totalUsers = await prisma.user.count({ where: { deletedAt: null } });
      activeUsers = await prisma.user.count({ where: { deletedAt: null, isActive: true, approvalStatus: 'APPROVED' } });
      pendingRecharges = await prisma.approvalRequest.count({ where: { status: 'PENDING' } });

      const totalWalletsAgg = await prisma.wallet.aggregate({
        _sum: { currentBalance: true },
      });
      const totalActualBalance = Number(totalWalletsAgg._sum.currentBalance || 0);

      const creditsAgg = await prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { transactionType: { in: ['ADMIN_TOPUP', 'RECHARGE', 'CREDIT', 'REFUND'] } },
      });

      const debitsAgg = await prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { transactionType: { in: ['MEAL_DEDUCTION', 'DEBIT', 'MONTHLY_CHARGE', 'PENALTY'] } },
      });

      const totalCredits = Number(creditsAgg._sum.amount || 0);
      const totalDebits = Number(debitsAgg._sum.amount || 0);
      const expectedBalance = totalCredits - totalDebits;

      const discrepancy = Math.abs(totalActualBalance - expectedBalance);

      walletIntegrity = {
        isBalanced: discrepancy < 1.0, // allow rounding tolerance < 1 BDT
        calculatedSystemBalance: Math.round(expectedBalance * 100) / 100,
        actualSystemBalance: Math.round(totalActualBalance * 100) / 100,
        discrepancy: Math.round(discrepancy * 100) / 100,
      };
    }

    const diagnosticReport = {
      timestamp: nowBgd.toISOString(),
      todayStr,
      cutoffTime,
      isTodayLocked: cutoffCheck.isLocked,
      lockReason: cutoffCheck.reason || null,
      systemMetrics: {
        totalUsers,
        activeUsers,
        pendingRecharges,
      },
      walletIntegrity,
      status: walletIntegrity.isBalanced ? 'HEALTHY' : 'ANOMALY_DETECTED',
    };

    return NextResponse.json(diagnosticReport);
  } catch (error: any) {
    console.error('System diagnostics check error:', error);
    return NextResponse.json(
      { status: 'ERROR', message: error.message || 'Diagnostics failed' },
      { status: 500 }
    );
  }
}

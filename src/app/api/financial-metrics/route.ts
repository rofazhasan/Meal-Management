import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let metrics = {
      todayCollection: 0,
      monthlyCollection: 0,
      yearlyCollection: 0,
      todayExpenses: 0,
      netProfit: 0,
      outstandingBalance: 0,
      totalWalletBalance: 0,
      totalRefunds: 0,
      permanentRevenue: 0,
      guestRevenue: 0,
      totalCollected: 0,
      totalSpent: 0,
      netReserve: 0,
      pendingRechargesCount: 0,
      pendingRechargesSum: 0,
      monthlyEstRevenue: 0,
      monthlyEstCost: 0,
      activeUsersCount: 0,
      pausedUsersCount: 0,
      topSpenders: [] as { name: string; phone: string; amount: number }[],
      lowBalanceUsersCount: 0,
    };

    if (process.env.DATABASE_URL) {
      try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const totalRechargesAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: { transactionType: { in: ['ADMIN_TOPUP', 'RECHARGE', 'CREDIT', 'CASH_PAID'] } },
        });

        const todayRechargesAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: { in: ['ADMIN_TOPUP', 'RECHARGE', 'CREDIT', 'CASH_PAID'] },
            createdAt: { gte: startOfToday },
          },
        });

        const monthRechargesAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: { in: ['ADMIN_TOPUP', 'RECHARGE', 'CREDIT', 'CASH_PAID'] },
            createdAt: { gte: startOfMonth },
          },
        });

        const yearRechargesAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: { in: ['ADMIN_TOPUP', 'RECHARGE', 'CREDIT', 'CASH_PAID'] },
            createdAt: { gte: startOfYear },
          },
        });

        const totalDeductionsAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: { transactionType: { in: ['MEAL_DEDUCTION', 'DEBIT', 'MONTHLY_CHARGE'] } },
        });

        const totalRefundsAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: { transactionType: 'REFUND' },
        });

        const totalWalletBalAgg = await prisma.wallet.aggregate({
          _sum: { currentBalance: true },
        });

        const activeUsersCount = await prisma.user.count({
          where: { deletedAt: null, isActive: true, isIndefinitelyPaused: false },
        });

        const pausedUsersCount = await prisma.user.count({
          where: { deletedAt: null, OR: [{ isActive: false }, { isIndefinitelyPaused: true }] },
        });

        const lowBalCount = await prisma.wallet.count({
          where: { currentBalance: { lt: 50 } },
        });

        const pendingReqAgg = await prisma.approvalRequest.aggregate({
          _count: true,
          where: { status: 'PENDING' },
        });

        const permRevenueAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: { in: ['MEAL_DEDUCTION', 'DEBIT'] },
            user: { userType: 'PERMANENT' },
          },
        });

        const guestRevenueAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: { in: ['MEAL_DEDUCTION', 'DEBIT'] },
            user: { userType: 'GUEST' },
          },
        });

        const totalColl = Number(totalRechargesAgg._sum.amount || 0);
        const totalDeduct = Number(totalDeductionsAgg._sum.amount || 0);
        const totalRef = Number(totalRefundsAgg._sum.amount || 0);
        const netDeduct = totalDeduct - totalRef;
        const walletBal = Number(totalWalletBalAgg._sum.currentBalance || 0);

        metrics = {
          todayCollection: Number(todayRechargesAgg._sum.amount || 0),
          monthlyCollection: Number(monthRechargesAgg._sum.amount || 0),
          yearlyCollection: Number(yearRechargesAgg._sum.amount || 0),
          todayExpenses: 0,
          netProfit: netDeduct,
          outstandingBalance: 0,
          totalWalletBalance: walletBal,
          totalRefunds: totalRef,
          permanentRevenue: Number(permRevenueAgg._sum.amount || 0),
          guestRevenue: Number(guestRevenueAgg._sum.amount || 0),
          totalCollected: totalColl,
          totalSpent: netDeduct,
          netReserve: walletBal,
          pendingRechargesCount: pendingReqAgg._count || 0,
          pendingRechargesSum: 0,
          monthlyEstRevenue: netDeduct,
          monthlyEstCost: 0,
          activeUsersCount,
          pausedUsersCount,
          topSpenders: [],
          lowBalanceUsersCount: lowBalCount,
        };
      } catch (e) {
        console.error('Error calculating database financial metrics:', e);
      }
    }

    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch financial metrics' }, { status: 500 });
  }
}

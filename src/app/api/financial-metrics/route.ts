import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
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
    grossDeductions: 0,
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
    isBalanced: true,
    accountingVariance: 0,
  };

  try {
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

        // Permanent Users Net Deductions (Deductions - Refunds)
        const permDeductionAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: { in: ['MEAL_DEDUCTION', 'DEBIT'] },
            wallet: { user: { userType: 'PERMANENT' } },
          },
        });
        const permRefundAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: 'REFUND',
            wallet: { user: { userType: 'PERMANENT' } },
          },
        });

        // Guest Users Net Deductions (Deductions - Refunds)
        const guestDeductionAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: { in: ['MEAL_DEDUCTION', 'DEBIT'] },
            wallet: { user: { userType: 'GUEST' } },
          },
        });
        const guestRefundAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: 'REFUND',
            wallet: { user: { userType: 'GUEST' } },
          },
        });

        // Today's Net Expenses (Today Deductions - Today Refunds)
        const todayDeductionAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: { in: ['MEAL_DEDUCTION', 'DEBIT', 'MONTHLY_CHARGE'] },
            createdAt: { gte: startOfToday },
          },
        });
        const todayRefundAgg = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            transactionType: 'REFUND',
            createdAt: { gte: startOfToday },
          },
        });

        // Calculate Net Top Spenders for current month (Net Spending = Deductions - Refunds)
        const monthTx = await prisma.walletTransaction.findMany({
          where: {
            transactionType: { in: ['MEAL_DEDUCTION', 'DEBIT', 'MONTHLY_CHARGE', 'REFUND'] },
            createdAt: { gte: startOfMonth },
          },
          select: {
            walletId: true,
            transactionType: true,
            amount: true,
          },
        });

        const walletSpendingMap = new Map<string, number>();
        monthTx.forEach((tx) => {
          if (!tx.walletId) return;
          const current = walletSpendingMap.get(tx.walletId) || 0;
          const amt = Number(tx.amount || 0);
          if (tx.transactionType === 'REFUND') {
            walletSpendingMap.set(tx.walletId, current - amt);
          } else {
            walletSpendingMap.set(tx.walletId, current + amt);
          }
        });

        const sortedWallets = Array.from(walletSpendingMap.entries())
          .map(([walletId, amount]) => ({ walletId, amount: Math.max(0, amount) }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        const topSpenderWalletIds = sortedWallets.map((w) => w.walletId);
        const topSpenderWallets = await prisma.wallet.findMany({
          where: { id: { in: topSpenderWalletIds } },
          include: { user: { select: { id: true, fullName: true, phoneNumber: true } } },
        });
        const walletMap = new Map(topSpenderWallets.map((w) => [w.id, w.user]));

        const topSpenders = sortedWallets.map((w) => {
          const u = walletMap.get(w.walletId);
          return {
            name: u?.fullName || 'অজানা মেম্বার',
            phone: u?.phoneNumber || 'N/A',
            amount: w.amount,
          };
        });

        const totalColl = Number(totalRechargesAgg._sum.amount || 0);
        const totalDeduct = Number(totalDeductionsAgg._sum.amount || 0);
        const totalRef = Number(totalRefundsAgg._sum.amount || 0);
        const netDeduct = Math.max(0, totalDeduct - totalRef);
        const walletBal = Number(totalWalletBalAgg._sum.currentBalance || 0);

        const permanentRevenue = Math.max(0, Number(permDeductionAgg._sum.amount || 0) - Number(permRefundAgg._sum.amount || 0));
        const guestRevenue = Math.max(0, Number(guestDeductionAgg._sum.amount || 0) - Number(guestRefundAgg._sum.amount || 0));
        const todayExpenses = Math.max(0, Number(todayDeductionAgg._sum.amount || 0) - Number(todayRefundAgg._sum.amount || 0));

        const accountingVariance = Math.abs(totalColl - netDeduct - walletBal);
        const isBalanced = accountingVariance < 1;

        metrics = {
          todayCollection: Number(todayRechargesAgg._sum.amount || 0),
          monthlyCollection: Number(monthRechargesAgg._sum.amount || 0),
          yearlyCollection: Number(yearRechargesAgg._sum.amount || 0),
          todayExpenses,
          netProfit: netDeduct,
          outstandingBalance: 0,
          totalWalletBalance: walletBal,
          totalRefunds: totalRef,
          grossDeductions: totalDeduct,
          permanentRevenue,
          guestRevenue,
          totalCollected: totalColl,
          totalSpent: netDeduct,
          netReserve: walletBal,
          pendingRechargesCount: pendingReqAgg._count || 0,
          pendingRechargesSum: 0,
          monthlyEstRevenue: netDeduct,
          monthlyEstCost: 0,
          activeUsersCount,
          pausedUsersCount,
          topSpenders,
          lowBalanceUsersCount: lowBalCount,
          isBalanced,
          accountingVariance: Math.round(accountingVariance * 100) / 100,
        };
      } catch (e) {
        console.error('Error calculating database financial metrics:', e);
      }
    }

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Error in financial-metrics route:', error);
    return NextResponse.json(metrics);
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = {
      totalCollected: 125000,
      totalSpent: 84000,
      netReserve: 41000,
      pendingRechargesCount: 3,
      pendingRechargesSum: 4500,
      monthlyEstRevenue: 150000,
      monthlyEstCost: 110000,
      activeUsersCount: 45,
      pausedUsersCount: 2,
    };

    if (process.env.DATABASE_URL) {
      try {
        const collected = await prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: { amount: { gt: 0 } },
        });

        const activeCount = await prisma.user.count({
          where: { deletedAt: null, isActive: true },
        });

        const pausedCount = await prisma.user.count({
          where: { deletedAt: null, isActive: false },
        });

        const pendingRecharges = await prisma.approvalRequest.aggregate({
          _count: true,
          where: { status: 'PENDING' },
        });

        metrics.totalCollected = Number(collected._sum.amount || 0);
        metrics.activeUsersCount = activeCount;
        metrics.pausedUsersCount = pausedCount;
        metrics.pendingRechargesCount = pendingRecharges._count || 0;
      } catch (e) {
        console.error('Error fetching financial metrics via Prisma:', e);
      }
    }

    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch financial metrics' }, { status: 500 });
  }
}

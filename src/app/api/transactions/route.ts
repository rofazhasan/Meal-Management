import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (process.env.DATABASE_URL) {
      const whereClause: any = {};
      if (userId) whereClause.wallet = { userId };

      const txs = await prisma.walletTransaction.findMany({
        where: whereClause,
        include: { wallet: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      const formatted = txs.map((t) => ({
        id: t.id,
        userId: t.wallet.userId,
        adminId: t.createdBy || null,
        amount: Number(t.amount),
        type: (t.transactionType as string) === 'ADMIN_TOPUP' ? 'RECHARGE' : t.transactionType,
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
        description: t.note || t.referenceType || 'অর্থ সংক্রান্ত লেনদেন',
        date: t.createdAt.toISOString(),
      }));

      return NextResponse.json(formatted);
    }

    return NextResponse.json([]);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json([]);
  }
}

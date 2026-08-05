import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (process.env.DATABASE_URL) {
      const whereClause: any = {};
      if (userId) whereClause.userId = userId;

      const txs = await prisma.walletTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const formatted = txs.map((t) => ({
        id: t.id,
        userId: t.userId,
        amount: Number(t.amount),
        type: t.transactionType,
        description: t.note || t.referenceType,
        date: t.createdAt.toISOString(),
      }));

      return NextResponse.json(formatted);
    }

    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch transactions' }, { status: 500 });
  }
}

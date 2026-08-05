import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId, amount, adminId, note } = await req.json();

    if (!userId || amount === undefined) {
      return NextResponse.json({ error: 'userId and amount are required' }, { status: 400 });
    }

    const numAmount = Number(amount);
    let txResult: any = {
      id: `tx-${Date.now()}`,
      userId,
      amount: numAmount,
      type: numAmount >= 0 ? 'RECHARGE' : 'DEBIT',
      balanceBefore: 0,
      balanceAfter: numAmount,
      description: note || 'অ্যাডমিন পার্স রিচার্জ',
      date: new Date().toISOString(),
    };

    if (process.env.DATABASE_URL) {
      const result = await prisma.$transaction(async (tx) => {
        let wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
          wallet = await tx.wallet.create({ data: { userId, currentBalance: 0 } });
        }

        const prevBal = Number(wallet.currentBalance);
        const newBal = prevBal + numAmount;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { currentBalance: newBal },
        });

        const createdTx = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            transactionType: numAmount >= 0 ? 'RECHARGE' : 'DEBIT',
            amount: Math.abs(numAmount),
            balanceBefore: prevBal,
            balanceAfter: newBal,
            referenceType: 'ADMIN_ACTION',
            referenceId: wallet.id,
            createdBy: adminId || null,
            note: note || 'অ্যাডমিন পার্স রিচার্জ',
          },
        });

        return {
          id: createdTx.id,
          userId: createdTx.userId,
          amount: Math.abs(numAmount),
          type: createdTx.transactionType,
          balanceBefore: prevBal,
          balanceAfter: newBal,
          description: createdTx.note || 'অ্যাডমিন পার্স রিচার্জ',
          date: createdTx.createdAt.toISOString(),
        };
      });

      txResult = result;
    }

    return NextResponse.json(txResult);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Topup failed' }, { status: 500 });
  }
}

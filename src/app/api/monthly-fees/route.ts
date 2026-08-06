import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { adminId, targetUserId, method, amount, monthYear } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const numAmount = Number(amount);

    if (process.env.DATABASE_URL) {
      const usersToCharge = await prisma.user.findMany({
        where: {
          deletedAt: null,
          approvalStatus: 'APPROVED',
          ...(targetUserId !== 'ALL' ? { id: targetUserId } : {}),
        },
        include: { wallet: true },
      });

      let count = 0;

      await prisma.$transaction(async (tx) => {
        for (const user of usersToCharge) {
          let wallet = user.wallet;
          if (!wallet) {
            wallet = await tx.wallet.create({
              data: { userId: user.id, currentBalance: 0 },
            });
          }

          const currentBal = Number(wallet.currentBalance);

          if (method === 'WALLET_DEDUCTION') {
            const newBal = currentBal - numAmount;
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { currentBalance: newBal },
            });

            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                transactionType: 'MONTHLY_CHARGE',
                amount: numAmount,
                balanceBefore: currentBal,
                balanceAfter: newBal,
                referenceType: 'MONTHLY_FEE',
                referenceId: wallet.id,
                createdBy: adminId || null,
                note: `মাসিক ফি কর্তন (${monthYear})`,
              },
            });
          } else {
            // Cash hand to hand: Record transaction without mutating balance
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                transactionType: 'CASH_PAID',
                amount: numAmount,
                balanceBefore: currentBal,
                balanceAfter: currentBal,
                referenceType: 'MONTHLY_FEE_CASH',
                referenceId: wallet.id,
                createdBy: adminId || null,
                note: `মাসিক ফি ক্যাশ গ্রহণ (${monthYear})`,
              },
            });
          }

          count++;
        }
      });

      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ success: true, count: 1 });
  } catch (error: any) {
    console.error('Failed to collect monthly fee:', error);
    return NextResponse.json({ error: error.message || 'Failed to collect monthly fee' }, { status: 500 });
  }
}

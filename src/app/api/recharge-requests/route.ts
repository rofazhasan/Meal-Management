import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApprovalStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const whereClause: any = {};
    if (userId) whereClause.userId = userId;

    const requests = await prisma.approvalRequest.findMany({
      where: whereClause,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.fullName,
      userPhone: r.user.phoneNumber,
      amount: 500,
      paymentMethod: 'BKASH',
      status: r.status,
      requestedAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch recharge requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, note } = body;

    const created = await prisma.approvalRequest.create({
      data: {
        userId,
        status: 'PENDING',
        remark: note || 'Recharge request',
      },
      include: { user: true },
    });

    const reqObj = {
      id: created.id,
      userId: created.userId,
      userName: created.user.fullName,
      userPhone: created.user.phoneNumber,
      amount: 500,
      paymentMethod: 'BKASH',
      status: created.status,
      requestedAt: created.createdAt.toISOString(),
    };

    return NextResponse.json(reqObj, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit recharge request' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { requestId, status, amount = 500 } = await req.json();

    if (!requestId || !status) {
      return NextResponse.json({ error: 'requestId and status are required' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const appReq = await tx.approvalRequest.update({
        where: { id: requestId },
        data: { status: status as ApprovalStatus },
      });

      if (status === 'APPROVED') {
        let wallet = await tx.wallet.findUnique({ where: { userId: appReq.userId } });
        if (!wallet) {
          wallet = await tx.wallet.create({ data: { userId: appReq.userId, currentBalance: 0 } });
        }

        const prevBal = Number(wallet.currentBalance);
        const newBal = prevBal + Number(amount);

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { currentBalance: newBal },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: appReq.userId,
            transactionType: 'CREDIT',
            amount: Number(amount),
            balanceBefore: prevBal,
            balanceAfter: newBal,
            referenceType: 'RECHARGE_APPROVAL',
            referenceId: appReq.id,
            note: 'Recharge Request Approved',
          },
        });
      }

      return appReq;
    });

    return NextResponse.json({ success: true, requestId: updated.id, status: updated.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process recharge request' }, { status: 500 });
  }
}

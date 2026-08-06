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

    const formatted = requests.map((r) => {
      let meta: any = {};
      try {
        if (r.remark && r.remark.startsWith('{')) {
          meta = JSON.parse(r.remark);
        }
      } catch (e) {}

      return {
        id: r.id,
        userId: r.userId,
        userName: r.user.fullName,
        userPhone: r.user.phoneNumber,
        amount: Number(meta.amount || 500),
        paymentMethod: meta.paymentMethod || 'BKASH',
        trxId: meta.trxId || '',
        note: meta.note || r.remark || '',
        status: r.status,
        requestedAt: r.createdAt.toISOString(),
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch recharge requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, amount = 500, paymentMethod = 'BKASH', trxId = '', note = '' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const remarkJson = JSON.stringify({
      amount: Number(amount),
      paymentMethod,
      trxId,
      note,
    });

    const created = await prisma.approvalRequest.create({
      data: {
        userId,
        status: 'PENDING',
        remark: remarkJson,
      },
      include: { user: true },
    });

    const reqObj = {
      id: created.id,
      userId: created.userId,
      userName: created.user.fullName,
      userPhone: created.user.phoneNumber,
      amount: Number(amount),
      paymentMethod,
      trxId,
      note,
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
    const { requestId, status, amount: passedAmount, adminId } = await req.json();

    if (!requestId || !status) {
      return NextResponse.json({ error: 'requestId and status are required' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const appReq = await tx.approvalRequest.findUnique({
        where: { id: requestId },
      });

      if (!appReq) {
        throw new Error('Recharge request not found');
      }

      if (appReq.status !== 'PENDING') {
        throw new Error(`এই রিকোয়েস্টটি ইতোমধ্যে '${appReq.status}' অবস্থায় রয়েছে।`);
      }

      let reqAmount = 500;
      try {
        if (appReq.remark && appReq.remark.startsWith('{')) {
          const parsed = JSON.parse(appReq.remark);
          reqAmount = Number(parsed.amount || 500);
        }
      } catch (e) {}

      const finalAmount = passedAmount ? Number(passedAmount) : reqAmount;

      const updatedReq = await tx.approvalRequest.update({
        where: { id: requestId },
        data: { status: status as ApprovalStatus },
      });

      if (status === 'APPROVED') {
        let wallet = await tx.wallet.findUnique({ where: { userId: appReq.userId } });
        if (!wallet) {
          wallet = await tx.wallet.create({ data: { userId: appReq.userId, currentBalance: 0 } });
        }

        const prevBal = Number(wallet.currentBalance);
        const newBal = prevBal + finalAmount;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { currentBalance: newBal },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: appReq.userId,
            transactionType: 'RECHARGE',
            amount: finalAmount,
            balanceBefore: prevBal,
            balanceAfter: newBal,
            referenceType: 'RECHARGE_APPROVAL',
            referenceId: appReq.id,
            createdBy: adminId || null,
            note: `রিচার্জ রিকোয়েস্ট অনুমোদন (৳${finalAmount})`,
          },
        });
      }

      return updatedReq;
    });

    return NextResponse.json({ success: true, requestId: updated.id, status: updated.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process recharge request' }, { status: 500 });
  }
}

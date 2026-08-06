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

    const numAmount = Number(amount);
    if (!userId || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid userId and positive amount are required' }, { status: 400 });
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

    const resultData = await prisma.$transaction(async (tx) => {
      const appReq = await tx.approvalRequest.findUnique({
        where: { id: requestId },
        include: { user: true },
      });

      if (!appReq) {
        throw new Error('Recharge request not found');
      }

      if (appReq.status !== 'PENDING') {
        throw new Error(`এই রিকোয়েস্টটি ইতোমধ্যে '${appReq.status}' অবস্থায় রয়েছে।`);
      }

      let reqAmount = 500;
      let paymentMethod = 'BKASH';
      let trxId = '';
      let note = '';
      try {
        if (appReq.remark && appReq.remark.startsWith('{')) {
          const parsed = JSON.parse(appReq.remark);
          reqAmount = Number(parsed.amount || 500);
          paymentMethod = parsed.paymentMethod || 'BKASH';
          trxId = parsed.trxId || '';
          note = parsed.note || '';
        }
      } catch (e) {}

      const finalAmount = passedAmount ? Number(passedAmount) : reqAmount;

      const updatedReq = await tx.approvalRequest.update({
        where: { id: requestId },
        data: { status: status as ApprovalStatus },
      });

      let createdTxObj: any = null;

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

        const dbTx = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            transactionType: 'RECHARGE',
            amount: finalAmount,
            balanceBefore: prevBal,
            balanceAfter: newBal,
            referenceType: 'RECHARGE_APPROVAL',
            referenceId: appReq.id,
            createdBy: adminId || null,
            note: note ? `রিচার্জ অনুমোদন (৳${finalAmount}): ${note}` : `রিচার্জ রিকোয়েস্ট অনুমোদন (৳${finalAmount})`,
          },
        });

        createdTxObj = {
          id: dbTx.id,
          userId: appReq.userId,
          amount: Number(dbTx.amount),
          type: 'RECHARGE',
          balanceBefore: Number(dbTx.balanceBefore),
          balanceAfter: Number(dbTx.balanceAfter),
          description: dbTx.note || `রিচার্জ অনুমোদন (৳${finalAmount})`,
          date: dbTx.createdAt.toISOString(),
          adminId: dbTx.createdBy || adminId || null,
        };
      }

      // Create notification record in central DB
      await tx.notification.create({
        data: {
          userId: appReq.userId,
          title: status === 'APPROVED' ? 'রিচার্জ রিকোয়েস্ট অনুমোদিত' : 'রিচার্জ রিকোয়েস্ট প্রত্যাখ্যাত',
          message: status === 'APPROVED'
            ? `আপনার ৳${finalAmount} রিচার্জের আবেদন অনুমোদিত হয়েছে।`
            : `আপনার ৳${finalAmount} রিচার্জের আবেদন প্রত্যাখ্যাত হয়েছে।`,
        },
      });

      const formattedReq = {
        id: updatedReq.id,
        userId: updatedReq.userId,
        userName: appReq.user?.fullName || '',
        userPhone: appReq.user?.phoneNumber || '',
        amount: finalAmount,
        paymentMethod: paymentMethod as any,
        trxId,
        note,
        status: updatedReq.status,
        requestedAt: updatedReq.createdAt.toISOString(),
      };

      return {
        request: formattedReq,
        transaction: createdTxObj,
      };
    });

    return NextResponse.json(resultData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process recharge request' }, { status: 500 });
  }
}

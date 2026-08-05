import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { confirmReset } = await req.json();

    if (!confirmReset) {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await prisma.$transaction([
        prisma.walletTransaction.deleteMany(),
        prisma.mealDeclaration.deleteMany(),
        prisma.mealConsumption.deleteMany(),
        prisma.approvalRequest.deleteMany(),
        prisma.notification.deleteMany(),
        prisma.auditLog.deleteMany(),
        prisma.wallet.updateMany({ data: { currentBalance: 0 } }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('System reset error:', error);
    return NextResponse.json({ error: error.message || 'System reset failed' }, { status: 500 });
  }
}

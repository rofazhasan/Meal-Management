import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { adminId, confirmReset } = await req.json();

    if (!confirmReset) {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
    }

    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID is required for system reset authorization' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'অ্যাক্সেস অস্বীকৃত: শুধুমাত্র SUPERADMIN এই ডাটা রিসেট করার ক্ষমতা রাখেন।' },
        { status: 403 }
      );
    }

    await prisma.$transaction([
      prisma.walletTransaction.deleteMany(),
      prisma.mealDeclaration.deleteMany(),
      prisma.mealConsumption.deleteMany(),
      prisma.approvalRequest.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.specialMeal.deleteMany(),
      prisma.mealSetting.deleteMany(),
      prisma.wallet.updateMany({ data: { currentBalance: 0 } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('System reset error:', error);
    return NextResponse.json({ error: error.message || 'System reset failed' }, { status: 500 });
  }
}

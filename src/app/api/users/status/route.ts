import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApprovalStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function handleStatusUpdate(req: Request) {
  try {
    const { userId, status } = await req.json();

    if (!userId || !status) {
      return NextResponse.json({ error: 'userId and status are required' }, { status: 400 });
    }

    if (status === 'REJECTED') {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      await prisma.$transaction([
        prisma.walletTransaction.deleteMany({ where: { userId } }),
        prisma.mealDeclaration.deleteMany({ where: { userId } }),
        prisma.mealConsumption.deleteMany({ where: { userId } }),
        prisma.guestMeal.deleteMany({ where: { userId } }),
        prisma.notification.deleteMany({ where: { userId } }),
        prisma.approvalRequest.deleteMany({ where: { userId } }),
        prisma.profile.deleteMany({ where: { userId } }),
        prisma.wallet.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } }),
      ]);

      return NextResponse.json({
        id: userId,
        name: existingUser.fullName,
        phone: existingUser.phoneNumber,
        status: 'REJECTED',
        deleted: true,
        message: 'ইউজারের আবেদন প্রত্যাখ্যান করা হয়েছে এবং ডাটাবেজ থেকে সকল তথ্য স্থায়ীভাবে মুছে ফেলা হয়েছে।',
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        approvalStatus: status as ApprovalStatus,
        isActive: status === 'APPROVED' ? true : false,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.fullName,
      phone: updated.phoneNumber,
      role: updated.role,
      userType: updated.userType,
      status: updated.approvalStatus,
      isIndefinitelyPaused: updated.isIndefinitelyPaused,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to update user status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user status' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handleStatusUpdate(req);
}

export async function PATCH(req: Request) {
  return handleStatusUpdate(req);
}

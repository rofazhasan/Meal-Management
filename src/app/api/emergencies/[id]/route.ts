import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Emergency ID required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await prisma.mealSetting.update({
        where: { id },
        data: {
          emergencyOff: false,
          emergencyReason: null,
          breakfastOn: true,
          lunchOn: true,
          dinnerOn: true,
        },
      });
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to remove emergency closure' },
      { status: 500 }
    );
  }
}

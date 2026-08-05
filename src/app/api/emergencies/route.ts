import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.mealSetting.findMany({
      where: { emergencyOff: true },
      orderBy: { mealDate: 'desc' },
    });

    const formatted = settings.map((s) => ({
      id: s.id,
      date: s.mealDate.toISOString().split('T')[0],
      reason: s.emergencyReason || 'Emergency Closure',
      closedMeals: ['breakfast', 'lunch', 'dinner'],
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { date, reason } = await req.json();
    const mealDate = new Date(date || new Date());

    const upserted = await prisma.mealSetting.upsert({
      where: { mealDate },
      update: {
        emergencyOff: true,
        emergencyReason: reason || 'Emergency Closure',
      },
      create: {
        mealDate,
        emergencyOff: true,
        emergencyReason: reason || 'Emergency Closure',
        breakfastOn: false,
        lunchOn: false,
        dinnerOn: false,
      },
    });

    const closure = {
      id: upserted.id,
      date: upserted.mealDate.toISOString().split('T')[0],
      reason: upserted.emergencyReason || 'Emergency Closure',
      closedMeals: ['breakfast', 'lunch', 'dinner'],
      createdAt: upserted.createdAt.toISOString(),
    };

    return NextResponse.json(closure, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add emergency closure' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MealType } from '@prisma/client';
import { parseDateToUtcMidday, processSpecialMealCreationWithRefunds } from '@/lib/mealEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const meals = await prisma.specialMeal.findMany({
      orderBy: { mealDate: 'asc' },
    });

    const formatted = meals.map((m) => ({
      id: m.id,
      date: m.mealDate.toISOString().split('T')[0],
      mealType: m.mealType.toLowerCase(),
      title: m.title,
      customRate: Number(m.customRate),
      description: m.description || '',
      isRecurring: m.isRecurring,
      repeatDayOfWeek: m.repeatDayOfWeek,
      isActive: m.isActive,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching special meals:', error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { date, mealType, title, customRate, description, isRecurring, repeatDayOfWeek } = await req.json();

    if (!date || !mealType || !title || customRate === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const numRate = Number(customRate);
    if (isNaN(numRate) || numRate < 0) {
      return NextResponse.json({ error: 'Invalid custom rate amount. Must be a non-negative number.' }, { status: 400 });
    }

    const upperMealType = String(mealType).toUpperCase();
    if (!['BREAKFAST', 'LUNCH', 'DINNER'].includes(upperMealType)) {
      return NextResponse.json({ error: 'Invalid meal type. Must be BREAKFAST, LUNCH, or DINNER.' }, { status: 400 });
    }

    const mealDate = parseDateToUtcMidday(date);
    const dbMealType = upperMealType as MealType;
    const dateStr = date;

    const formatted = await prisma.$transaction(async (tx) => {
      // 1. Reset user declarations for the targeted meal slot on dateStr & refund previously deducted fees
      await processSpecialMealCreationWithRefunds(dateStr, dbMealType as 'BREAKFAST' | 'LUNCH' | 'DINNER', tx);

      // 2. Create the SpecialMeal record
      const created = await tx.specialMeal.create({
        data: {
          mealDate,
          mealType: dbMealType,
          title,
          customRate: numRate,
          description: description || null,
          isRecurring: Boolean(isRecurring),
          repeatDayOfWeek: repeatDayOfWeek !== undefined ? Number(repeatDayOfWeek) : null,
          isActive: true,
        },
      });

      return {
        id: created.id,
        date: created.mealDate.toISOString().split('T')[0],
        mealType: created.mealType.toLowerCase(),
        title: created.title,
        customRate: Number(created.customRate),
        description: created.description || '',
        isRecurring: created.isRecurring,
        repeatDayOfWeek: created.repeatDayOfWeek,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
      };
    });

    return NextResponse.json(formatted, { status: 201 });
  } catch (error: any) {
    console.error('Error adding special meal:', error);
    return NextResponse.json({ error: error.message || 'Failed to add special meal' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, isActive } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Special meal ID required' }, { status: 400 });
    }

    const formatted = await prisma.$transaction(async (tx) => {
      const existing = await tx.specialMeal.findUnique({ where: { id } });
      if (existing) {
        const dateStr = existing.mealDate.toISOString().split('T')[0];
        const slotType = existing.mealType as 'BREAKFAST' | 'LUNCH' | 'DINNER';
        await processSpecialMealCreationWithRefunds(dateStr, slotType, tx);
      }

      const updated = await tx.specialMeal.update({
        where: { id },
        data: { isActive: Boolean(isActive) },
      });

      return {
        id: updated.id,
        date: updated.mealDate.toISOString().split('T')[0],
        mealType: updated.mealType.toLowerCase(),
        title: updated.title,
        customRate: Number(updated.customRate),
        description: updated.description || '',
        isRecurring: updated.isRecurring,
        repeatDayOfWeek: updated.repeatDayOfWeek,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error updating special meal:', error);
    return NextResponse.json({ error: error.message || 'Failed to update special meal' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Special meal ID required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.specialMeal.findUnique({ where: { id } });
      if (existing) {
        const dateStr = existing.mealDate.toISOString().split('T')[0];
        const slotType = existing.mealType as 'BREAKFAST' | 'LUNCH' | 'DINNER';
        await processSpecialMealCreationWithRefunds(dateStr, slotType, tx);
      }

      await tx.specialMeal.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error deleting special meal:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete special meal' }, { status: 500 });
  }
}


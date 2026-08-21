import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MealType } from '@prisma/client';
import { parseDateToUtcMidday, processSpecialMealCreationWithRefunds, getBgdDateStr } from '@/lib/mealEngine';

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

    const todayStr = getBgdDateStr();
    if (!isRecurring && date < todayStr) {
      return NextResponse.json(
        { error: 'অতীতের তারিখের জন্য নতুন স্পেশাল মিল যোগ করা সম্ভব নয়।' },
        { status: 400 }
      );
    }

    const mealDate = parseDateToUtcMidday(date);
    const dbMealType = upperMealType as MealType;
    const dateStr = date;

    const formatted = await prisma.$transaction(async (tx) => {
      // 1. Reset user declarations for the targeted meal slot on dateStr & refund previously deducted fees
      if (dateStr >= todayStr) {
        await processSpecialMealCreationWithRefunds(dateStr, dbMealType as 'BREAKFAST' | 'LUNCH' | 'DINNER', tx);
      }

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

    const existing = await prisma.specialMeal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Special meal not found' }, { status: 404 });
    }

    const todayStr = getBgdDateStr();
    const dateStr = existing.mealDate.toISOString().split('T')[0];

    // Block modifying past date non-recurring special meals
    if (!existing.isRecurring && dateStr < todayStr) {
      return NextResponse.json(
        { error: 'দিন অতিক্রান্ত হওয়ায় অতীতের স্পেশাল মিল পরিবর্তন করা সম্ভব নয়।' },
        { status: 400 }
      );
    }

    const formatted = await prisma.$transaction(async (tx) => {
      if (dateStr >= todayStr) {
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

    const existing = await prisma.specialMeal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Special meal not found' }, { status: 404 });
    }

    const todayStr = getBgdDateStr();
    const dateStr = existing.mealDate.toISOString().split('T')[0];

    // Block deleting past date non-recurring special meals
    if (!existing.isRecurring && dateStr < todayStr) {
      return NextResponse.json(
        { error: 'দিন অতিক্রান্ত হওয়ায় অতীতের স্পেশাল মিল মুছে ফেলা সম্ভব নয়, কারণ এতে ডেটা ও পূর্ববর্তী রিফান্ড হিসেব বিনষ্ট হবে।' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (dateStr >= todayStr) {
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


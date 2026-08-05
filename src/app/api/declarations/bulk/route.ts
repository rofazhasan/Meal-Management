import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { updates } = await req.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    if (process.env.DATABASE_URL) {
      await prisma.$transaction(
        updates.map((item: any) => {
          const { userId, date, breakfast, lunch, dinner } = item;
          const declDate = new Date(date);
          return prisma.mealDeclaration.upsert({
            where: {
              uq_user_declaration_date: {
                userId,
                declarationDate: declDate,
              },
            },
            update: {
              breakfastSelected: Boolean(breakfast),
              lunchSelected: Boolean(lunch),
              dinnerSelected: Boolean(dinner),
              sourceType: 'ADMIN_OVERRIDE',
            },
            create: {
              userId,
              declarationDate: declDate,
              breakfastSelected: Boolean(breakfast),
              lunchSelected: Boolean(lunch),
              dinnerSelected: Boolean(dinner),
              sourceType: 'ADMIN_OVERRIDE',
            },
          });
        })
      );
    }

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Bulk declaration update failed' }, { status: 500 });
  }
}

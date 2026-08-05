import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (process.env.DATABASE_URL) {
      const whereClause: any = {};
      if (userId) whereClause.userId = userId;
      if (startDate || endDate) {
        whereClause.declarationDate = {};
        if (startDate) whereClause.declarationDate.gte = new Date(startDate);
        if (endDate) whereClause.declarationDate.lte = new Date(endDate);
      }

      const decls = await prisma.mealDeclaration.findMany({
        where: whereClause,
        orderBy: { declarationDate: 'asc' },
      });

      const formatted = decls.map((d) => ({
        id: d.id,
        userId: d.userId,
        date: d.declarationDate.toISOString().split('T')[0],
        breakfast: d.breakfastSelected,
        lunch: d.lunchSelected,
        dinner: d.dinnerSelected,
        isAutoCopied: d.sourceType === 'COPIED',
        updatedAt: d.updatedAt.toISOString(),
      }));

      return NextResponse.json(formatted);
    }

    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch declarations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, date, breakfast, lunch, dinner, isAutoCopied = false } = await req.json();

    if (!userId || !date) {
      return NextResponse.json({ error: 'userId and date are required' }, { status: 400 });
    }

    const declDate = new Date(date);
    let declaration: any = {
      id: `decl-${userId}-${date}`,
      userId,
      date,
      breakfast: Boolean(breakfast),
      lunch: Boolean(lunch),
      dinner: Boolean(dinner),
      isAutoCopied,
      updatedAt: new Date().toISOString(),
    };

    if (process.env.DATABASE_URL) {
      const upserted = await prisma.mealDeclaration.upsert({
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
          sourceType: isAutoCopied ? 'COPIED' : 'MANUAL',
        },
        create: {
          userId,
          declarationDate: declDate,
          breakfastSelected: Boolean(breakfast),
          lunchSelected: Boolean(lunch),
          dinnerSelected: Boolean(dinner),
          sourceType: isAutoCopied ? 'COPIED' : 'MANUAL',
        },
      });

      declaration = {
        id: upserted.id,
        userId: upserted.userId,
        date: upserted.declarationDate.toISOString().split('T')[0],
        breakfast: upserted.breakfastSelected,
        lunch: upserted.lunchSelected,
        dinner: upserted.dinnerSelected,
        isAutoCopied: upserted.sourceType === 'COPIED',
        updatedAt: upserted.updatedAt.toISOString(),
      };
    }

    return NextResponse.json(declaration);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update declaration' }, { status: 500 });
  }
}

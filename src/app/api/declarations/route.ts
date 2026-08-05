import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getRatesFromDb() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'rates' },
  });
  if (config && config.valueJson) {
    const json = config.valueJson as any;
    return {
      permanent: json.permanent || { breakfast: 25, lunch: 50, dinner: 50, monthlyCharge: 300 },
      guest: json.guest || { breakfast: 35, lunch: 70, dinner: 70, monthlyCharge: 0 },
      cutoffTime: json.cutoffTime || '10:00',
    };
  }
  return {
    permanent: { breakfast: 25, lunch: 50, dinner: 50, monthlyCharge: 300 },
    guest: { breakfast: 35, lunch: 70, dinner: 70, monthlyCharge: 0 },
    cutoffTime: '10:00',
  };
}

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
    const { userId, date, breakfast, lunch, dinner, isAutoCopied = false, isAdminOverride = false } = await req.json();

    if (!userId || !date) {
      return NextResponse.json({ error: 'userId and date are required' }, { status: 400 });
    }

    const declDate = new Date(date);
    const dateStr = declDate.toISOString().split('T')[0];

    if (process.env.DATABASE_URL) {
      // 1. Check emergency closures
      const emSetting = await prisma.mealSetting.findUnique({
        where: { mealDate: declDate },
      });

      if (emSetting && emSetting.emergencyOff) {
        if (breakfast || lunch || dinner) {
          return NextResponse.json(
            { error: 'জরুরি মিল বন্ধ থাকার কারণে কোনো মিল চালুকরণ গ্রহণযোগ্য নয়।' },
            { status: 400 }
          );
        }
      }

      // 2. Fetch User and Rates
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'ব্যবহারকারী পাওয়া যায়নি' }, { status: 404 });
      }

      const ratesConfig = await getRatesFromDb();
      const userRates = user.userType === 'GUEST' ? ratesConfig.guest : ratesConfig.permanent;

      // 3. Find previous declaration for this date
      const prevDecl = await prisma.mealDeclaration.findUnique({
        where: {
          uq_user_declaration_date: {
            userId,
            declarationDate: declDate,
          },
        },
      });

      const oldB = prevDecl ? prevDecl.breakfastSelected : false;
      const oldL = prevDecl ? prevDecl.lunchSelected : false;
      const oldD = prevDecl ? prevDecl.dinnerSelected : false;

      const newB = Boolean(breakfast);
      const newL = Boolean(lunch);
      const newD = Boolean(dinner);

      const oldCost = (oldB ? userRates.breakfast : 0) + (oldL ? userRates.lunch : 0) + (oldD ? userRates.dinner : 0);
      const newCost = (newB ? userRates.breakfast : 0) + (newL ? userRates.lunch : 0) + (newD ? userRates.dinner : 0);
      const costDiff = newCost - oldCost;

      // 4. Wallet handling inside transaction
      const result = await prisma.$transaction(async (tx) => {
        let wallet = user.wallet;
        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId, currentBalance: 0 },
          });
        }

        const currentBal = Number(wallet.currentBalance);

        if (costDiff > 0 && currentBal < costDiff && !isAdminOverride) {
          throw new Error(`পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই। প্রয়োজনীয় ৳${costDiff}, বর্তমান ব্যালেন্স ৳${currentBal}`);
        }

        const newBal = currentBal - costDiff;

        if (costDiff !== 0) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { currentBalance: newBal },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId,
              transactionType: costDiff > 0 ? 'MEAL_DEDUCTION' : 'REFUND',
              amount: Math.abs(costDiff),
              balanceBefore: currentBal,
              balanceAfter: newBal,
              referenceType: 'MEAL_DECLARATION',
              referenceId: wallet.id,
              note: costDiff > 0 ? `মিল ফি কর্তন (${dateStr})` : `মিল বাতিল রিফান্ড (${dateStr})`,
            },
          });
        }

        const sourceType = isAutoCopied ? 'COPIED' : (isAdminOverride ? 'ADMIN_OVERRIDE' : 'MANUAL');

        const upserted = await tx.mealDeclaration.upsert({
          where: {
            uq_user_declaration_date: {
              userId,
              declarationDate: declDate,
            },
          },
          update: {
            breakfastSelected: newB,
            lunchSelected: newL,
            dinnerSelected: newD,
            sourceType,
          },
          create: {
            userId,
            declarationDate: declDate,
            breakfastSelected: newB,
            lunchSelected: newL,
            dinnerSelected: newD,
            sourceType,
          },
        });

        return {
          id: upserted.id,
          userId: upserted.userId,
          date: upserted.declarationDate.toISOString().split('T')[0],
          breakfast: upserted.breakfastSelected,
          lunch: upserted.lunchSelected,
          dinner: upserted.dinnerSelected,
          isAutoCopied: upserted.sourceType === 'COPIED',
          updatedAt: upserted.updatedAt.toISOString(),
          walletBalance: newBal,
        };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({
      id: `decl-${userId}-${date}`,
      userId,
      date,
      breakfast: Boolean(breakfast),
      lunch: Boolean(lunch),
      dinner: Boolean(dinner),
      isAutoCopied,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update declaration' }, { status: 400 });
  }
}

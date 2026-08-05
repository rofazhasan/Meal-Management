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

export async function POST(req: Request) {
  try {
    const { updates } = await req.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    if (process.env.DATABASE_URL) {
      const ratesConfig = await getRatesFromDb();

      await prisma.$transaction(async (tx) => {
        for (const item of updates) {
          const { userId, date, breakfast, lunch, dinner } = item;
          const declDate = new Date(date);
          const dateStr = declDate.toISOString().split('T')[0];

          const user = await tx.user.findUnique({
            where: { id: userId },
            include: { wallet: true },
          });

          if (!user) continue;

          const userRates = user.userType === 'GUEST' ? ratesConfig.guest : ratesConfig.permanent;

          const prevDecl = await tx.mealDeclaration.findUnique({
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

          let wallet = user.wallet;
          if (!wallet) {
            wallet = await tx.wallet.create({
              data: { userId, currentBalance: 0 },
            });
          }

          const currentBal = Number(wallet.currentBalance);
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
                referenceType: 'BULK_OVERRIDE',
                referenceId: wallet.id,
                note: costDiff > 0 ? `বাল্ক মিল ফি কর্তন (${dateStr})` : `বাল্ক মিল বাতিল রিফান্ড (${dateStr})`,
              },
            });
          }

          await tx.mealDeclaration.upsert({
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
              sourceType: 'ADMIN_OVERRIDE',
            },
            create: {
              userId,
              declarationDate: declDate,
              breakfastSelected: newB,
              lunchSelected: newL,
              dinnerSelected: newD,
              sourceType: 'ADMIN_OVERRIDE',
            },
          });
        }
      });
    }

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Bulk declaration update failed' }, { status: 500 });
  }
}

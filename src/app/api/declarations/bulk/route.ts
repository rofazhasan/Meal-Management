import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemRatesFromDb } from '@/lib/rates';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { updates, isAdminOverride = true } = await req.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    if (process.env.DATABASE_URL) {
      const ratesConfig = await getSystemRatesFromDb();

      await prisma.$transaction(async (tx) => {
        for (const item of updates) {
          const { userId, date, breakfast, lunch, dinner } = item;
          const [year, month, day] = date.split('-').map(Number);
          const declDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
          const dateStr = date;

          const user = await tx.user.findUnique({
            where: { id: userId },
            include: { wallet: true },
          });

          if (!user) continue;

          // Check Emergency Closure
          const emSetting = await tx.mealSetting.findFirst({
            where: { mealDate: declDate, emergencyOff: true },
          });

          let newB = Boolean(breakfast);
          let newL = Boolean(lunch);
          let newD = Boolean(dinner);

          // Force off if emergency
          if (emSetting && emSetting.emergencyOff) {
            newB = false;
            newL = false;
            newD = false;
          }

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
          let newBal = currentBal;

          if (costDiff > 0) {
            newBal = currentBal - costDiff;
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { currentBalance: newBal },
            });

            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                userId,
                transactionType: 'MEAL_DEDUCTION',
                amount: costDiff,
                balanceBefore: currentBal,
                balanceAfter: newBal,
                referenceType: 'BULK_OVERRIDE',
                referenceId: wallet.id,
                note: `বাল্ক মিল ফি কর্তন (${dateStr})`,
              },
            });
          } else if (costDiff < 0 && isAdminOverride) {
            const refundAmt = Math.abs(costDiff);
            newBal = currentBal + refundAmt;
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { currentBalance: newBal },
            });

            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                userId,
                transactionType: 'REFUND',
                amount: refundAmt,
                balanceBefore: currentBal,
                balanceAfter: newBal,
                referenceType: 'BULK_OVERRIDE_REFUND',
                referenceId: wallet.id,
                note: `বাল্ক মিল রিফান্ড (${dateStr})`,
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

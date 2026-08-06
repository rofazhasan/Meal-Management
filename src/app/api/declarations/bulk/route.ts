import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemRatesFromDb } from '@/lib/rates';
import { resolveMealPricing, parseDateToUtcMidday } from '@/lib/mealEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { updates, isAdminOverride = true } = await req.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    if (process.env.DATABASE_URL) {
      const ratesConfig = await getSystemRatesFromDb();
      const globalStatus = ratesConfig.globalMealStatus || { breakfast: true, lunch: true, dinner: true };

      let emergencyApplied = false;
      let emergencyReasonStr: string | null = null;
      let totalDeductions = 0;
      let totalRefunds = 0;

      await prisma.$transaction(async (tx) => {
        for (const item of updates) {
          const { userId, date, breakfast, lunch, dinner } = item;
          const dateStr = date;
          const declDate = parseDateToUtcMidday(dateStr);

          const user = await tx.user.findUnique({
            where: { id: userId },
            include: { wallet: true },
          });

          if (!user) continue;

          // Check Emergency Closure
          const emSetting = await tx.mealSetting.findFirst({
            where: { mealDate: declDate, emergencyOff: true },
          });

          let newB = item.meals ? Boolean(item.meals.breakfast) : Boolean(item.breakfast);
          let newL = item.meals ? Boolean(item.meals.lunch) : Boolean(item.lunch);
          let newD = item.meals ? Boolean(item.meals.dinner) : Boolean(item.dinner);

          // Force off if globally off
          if (globalStatus.breakfast === false) newB = false;
          if (globalStatus.lunch === false) newL = false;
          if (globalStatus.dinner === false) newD = false;

          // Force off if emergency
          if (emSetting && emSetting.emergencyOff) {
            newB = false;
            newL = false;
            newD = false;
            emergencyApplied = true;
            emergencyReasonStr = emSetting.emergencyReason || 'Emergency Closure';
          }

          // Fetch rates dynamically using central meal pricing resolver (includes special meal custom rates)
          const effectiveRates = await resolveMealPricing(dateStr, user.userType, tx, true);
          const bPrice = effectiveRates.breakfast;
          const lPrice = effectiveRates.lunch;
          const dPrice = effectiveRates.dinner;

          const effectiveBRate = (globalStatus.breakfast === false || (emSetting && emSetting.emergencyOff)) ? 0 : bPrice;
          const effectiveLRate = (globalStatus.lunch === false || (emSetting && emSetting.emergencyOff)) ? 0 : lPrice;
          const effectiveDRate = (globalStatus.dinner === false || (emSetting && emSetting.emergencyOff)) ? 0 : dPrice;

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

          const oldCost = (oldB ? effectiveBRate : 0) + (oldL ? effectiveLRate : 0) + (oldD ? effectiveDRate : 0);
          const newCost = (newB ? effectiveBRate : 0) + (newL ? effectiveLRate : 0) + (newD ? effectiveDRate : 0);
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
                transactionType: 'MEAL_DEDUCTION',
                amount: costDiff,
                balanceBefore: currentBal,
                balanceAfter: newBal,
                referenceType: 'BULK_OVERRIDE',
                referenceId: wallet.id,
                note: `বাল্ক মিল ফি কর্তন (${dateStr})`,
              },
            });
            totalDeductions += costDiff;
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
                transactionType: 'REFUND',
                amount: refundAmt,
                balanceBefore: currentBal,
                balanceAfter: newBal,
                referenceType: 'BULK_OVERRIDE_REFUND',
                referenceId: wallet.id,
                note: `বাল্ক মিল রিফান্ড (${dateStr})`,
              },
            });
            totalRefunds += refundAmt;
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

      return NextResponse.json({
        success: true,
        count: updates.length,
        emergencyApplied,
        emergencyReason: emergencyReasonStr,
        totalDeductions,
        totalRefunds,
      });
    }

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error: any) {
    console.error('Bulk update declarations error:', error);
    return NextResponse.json({ error: error.message || 'Failed to perform bulk update' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pool } from '@/lib/db';
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

          let newB = item.meals ? Boolean(item.meals.breakfast) : Boolean(item.breakfast);
          let newL = item.meals ? Boolean(item.meals.lunch) : Boolean(item.lunch);
          let newD = item.meals ? Boolean(item.meals.dinner) : Boolean(item.dinner);

          // Force off if emergency
          if (emSetting && emSetting.emergencyOff) {
            newB = false;
            newL = false;
            newD = false;
          }

          const userRates = user.userType === 'GUEST' ? ratesConfig.guest : ratesConfig.permanent;

          // Check Special Meals for this date via SQL pool
          let specB: any = null;
          let specL: any = null;
          let specD: any = null;

          try {
            const specRes = await pool.query(
              `SELECT LOWER(meal_type::text) AS "mealType", custom_rate::float AS "customRate"
               FROM special_meals
               WHERE meal_date = $1 AND is_active = TRUE;`,
              [dateStr]
            );
            specB = specRes.rows.find((s: any) => s.mealType === 'breakfast');
            specL = specRes.rows.find((s: any) => s.mealType === 'lunch');
            specD = specRes.rows.find((s: any) => s.mealType === 'dinner');
          } catch (e) {
            // Fallback to normal rates if special_meals table is not populated
          }

          const effectiveBRate = specB ? Number(specB.customRate) : userRates.breakfast;
          const effectiveLRate = specL ? Number(specL.customRate) : userRates.lunch;
          const effectiveDRate = specD ? Number(specD.customRate) : userRates.dinner;

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

      return NextResponse.json({ success: true, count: updates.length });
    }

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error: any) {
    console.error('Bulk update declarations error:', error);
    return NextResponse.json({ error: error.message || 'Failed to perform bulk update' }, { status: 500 });
  }
}

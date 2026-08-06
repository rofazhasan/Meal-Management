import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pool } from '@/lib/db';
import { getSystemRatesFromDb } from '@/lib/rates';

export const dynamic = 'force-dynamic';

function getBgdDateStr(d = new Date()) {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const bgdDate = new Date(utc + 3600000 * 6);
  return bgdDate.toISOString().split('T')[0];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (process.env.DATABASE_URL) {
      // Auto-process daily meal declarations and deductions for today if missing
      try {
        const todayStr = getBgdDateStr();
        const [y, m, dayNum] = todayStr.split('-').map(Number);
        const todayDt = new Date(Date.UTC(y, m - 1, dayNum, 12, 0, 0));
        const yesterdayDt = new Date(Date.UTC(y, m - 1, dayNum - 1, 12, 0, 0));

        const ratesConfig = await getSystemRatesFromDb();
        const activeUsers = await prisma.user.findMany({
          where: { deletedAt: null, isActive: true, isIndefinitelyPaused: false, approvalStatus: 'APPROVED' },
          include: { wallet: true },
        });

        for (const u of activeUsers) {
          const existingToday = await prisma.mealDeclaration.findUnique({
            where: {
              uq_user_declaration_date: {
                userId: u.id,
                declarationDate: todayDt,
              },
            },
          });

          if (!existingToday) {
            const yesterdayDecl = await prisma.mealDeclaration.findUnique({
              where: {
                uq_user_declaration_date: {
                  userId: u.id,
                  declarationDate: yesterdayDt,
                },
              },
            });

            const userRates = u.userType === 'GUEST' ? ratesConfig.guest : ratesConfig.permanent;
            const minMealCost = Math.min(userRates.breakfast, userRates.lunch, userRates.dinner);
            const currentBal = u.wallet ? Number(u.wallet.currentBalance) : 0;
            const canAfford = currentBal >= minMealCost;

            const isBOff = ratesConfig.globalMealStatus?.breakfast === false;
            const isLOff = ratesConfig.globalMealStatus?.lunch === false;
            const isDOff = ratesConfig.globalMealStatus?.dinner === false;

            const rawB = yesterdayDecl ? yesterdayDecl.breakfastSelected : canAfford;
            const rawL = yesterdayDecl ? yesterdayDecl.lunchSelected : canAfford;
            const rawD = yesterdayDecl ? yesterdayDecl.dinnerSelected : canAfford;

            const finalB = isBOff ? false : rawB;
            const finalL = isLOff ? false : rawL;
            const finalD = isDOff ? false : rawD;

            const mealCost = (finalB ? userRates.breakfast : 0) + (finalL ? userRates.lunch : 0) + (finalD ? userRates.dinner : 0);

            await prisma.$transaction(async (tx) => {
              let wallet = u.wallet;
              if (!wallet) {
                wallet = await tx.wallet.create({ data: { userId: u.id, currentBalance: 0 } });
              }

              let newBal = Number(wallet.currentBalance);
              if (mealCost > 0 && newBal >= mealCost) {
                newBal = newBal - mealCost;
                await tx.wallet.update({
                  where: { id: wallet.id },
                  data: { currentBalance: newBal },
                });

                await tx.walletTransaction.create({
                  data: {
                    walletId: wallet.id,
                    userId: u.id,
                    transactionType: 'MEAL_DEDUCTION',
                    amount: mealCost,
                    balanceBefore: Number(wallet.currentBalance),
                    balanceAfter: newBal,
                    referenceType: 'DAILY_AUTO_DEDUCTION',
                    referenceId: wallet.id,
                    note: `দৈনিক মিল ফি কর্তন (${todayStr})`,
                  },
                });
              }

              await tx.mealDeclaration.create({
                data: {
                  userId: u.id,
                  declarationDate: todayDt,
                  breakfastSelected: finalB,
                  lunchSelected: finalL,
                  dinnerSelected: finalD,
                  sourceType: 'COPIED',
                },
              });
            }).catch(() => {
              // Ignore single user conflict if race condition occurs
            });
          }
        }
      } catch (autoErr) {
        console.error('Error auto-processing daily meal declarations:', autoErr);
      }

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
    console.error('Error fetching declarations:', error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { userId, date, breakfast, lunch, dinner, isAutoCopied = false, isAdminOverride = false } = await req.json();

    if (!userId || !date) {
      return NextResponse.json({ error: 'userId and date are required' }, { status: 400 });
    }

    // Standardize date to YYYY-MM-DD at 12:00 UTC to prevent timezone shifts
    const [year, month, day] = date.split('-').map(Number);
    const declDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dateStr = date;

    if (process.env.DATABASE_URL) {
      // 1. Check emergency closures
      const emSetting = await prisma.mealSetting.findFirst({
        where: { mealDate: declDate, emergencyOff: true },
      });

      const newB = Boolean(breakfast);
      const newL = Boolean(lunch);
      const newD = Boolean(dinner);

      if (emSetting && emSetting.emergencyOff) {
        if (newB || newL || newD) {
          return NextResponse.json(
            { error: 'জরুরি মিল বন্ধ থাকার কারণে এই দিনে মিল চালু করা সম্ভব নয়।' },
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

      const ratesConfig = await getSystemRatesFromDb();
      const userRates = user.userType === 'GUEST' ? ratesConfig.guest : ratesConfig.permanent;

      // Fetch Special Meals for this date via SQL pool
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
        // Fallback to normal rates if special_meals is unavailable
      }

      const effectiveBRate = specB ? Number(specB.customRate) : userRates.breakfast;
      const effectiveLRate = specL ? Number(specL.customRate) : userRates.lunch;
      const effectiveDRate = specD ? Number(specD.customRate) : userRates.dinner;

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

      const oldCost = (oldB ? effectiveBRate : 0) + (oldL ? effectiveLRate : 0) + (oldD ? effectiveDRate : 0);
      const newCost = (newB ? effectiveBRate : 0) + (newL ? effectiveLRate : 0) + (newD ? effectiveDRate : 0);
      const costDiff = newCost - oldCost;

      // 4. Wallet handling inside transaction
      const result = await prisma.$transaction(async (tx) => {
        let wallet = user.wallet;
        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId, currentBalance: 0 },
          });
        }

        let currentBal = Number(wallet.currentBalance);
        let newBal = currentBal;

        // If user or admin turns ON a meal (costDiff > 0): deduct balance
        if (costDiff > 0) {
          if (currentBal < costDiff && !isAdminOverride) {
            throw new Error(`পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই। প্রয়োজনীয় ৳${costDiff}, বর্তমান ব্যালেন্স ৳${currentBal}`);
          }
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
              referenceType: 'MEAL_DECLARATION',
              referenceId: wallet.id,
              note: `মিল ফি কর্তন (${dateStr})`,
            },
          });
        }
        // If turning OFF a meal (costDiff < 0): Refund money to wallet immediately
        else if (costDiff < 0) {
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
              referenceType: isAdminOverride ? 'ADMIN_OVERRIDE_REFUND' : 'MEAL_DECLARATION_REFUND',
              referenceId: wallet.id,
              note: isAdminOverride ? `এডমিন ওভাররাইড রিফান্ড (${dateStr})` : `মিল বন্ধের টাকা রিফান্ড (${dateStr})`,
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
          date: dateStr,
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

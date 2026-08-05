import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemRatesFromDb } from '@/lib/rates';

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
        // If turning OFF a meal (costDiff < 0):
        // Only REFUND if done by ADMIN in override section; if done by USER, no refund (policy)
        else if (costDiff < 0) {
          if (isAdminOverride) {
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
                referenceType: 'ADMIN_OVERRIDE_REFUND',
                referenceId: wallet.id,
                note: `এডমিন ওভাররাইড রিফান্ড (${dateStr})`,
              },
            });
          }
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

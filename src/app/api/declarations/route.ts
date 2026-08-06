import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemRatesFromDb } from '@/lib/rates';
import { isMealDateLocked, resolveMealPricing, parseDateToUtcMidday, autoCopyPreviousDayDeclarations } from '@/lib/mealEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const dateParam = searchParams.get('date');
    const startDate = searchParams.get('startDate') || dateParam;
    const endDate = searchParams.get('endDate') || dateParam;

    if (process.env.DATABASE_URL) {
      try {
        await autoCopyPreviousDayDeclarations(dateParam || undefined);
      } catch (autoErr) {
        console.error('Failed to run auto-copy algorithm:', autoErr);
      }
    }

    const whereClause: any = {};
    if (userId) whereClause.userId = userId;
    if (startDate || endDate) {
      whereClause.declarationDate = {};
      if (startDate) whereClause.declarationDate.gte = parseDateToUtcMidday(startDate);
      if (endDate) whereClause.declarationDate.lte = parseDateToUtcMidday(endDate);
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

    const ratesConfig = await getSystemRatesFromDb();
    const cutoffTime = ratesConfig.cutoffTime || '10:00';

    // 0. Enforce Cutoff Lock Algorithm for non-admin requests
    if (!isAdminOverride) {
      const lockCheck = isMealDateLocked(date, cutoffTime);
      if (lockCheck.isLocked) {
        return NextResponse.json(
          { error: lockCheck.reason || 'এই তারিখের মিল পরিবর্তন বন্ধ হয়ে গেছে।' },
          { status: 400 }
        );
      }
    }

    const declDate = parseDateToUtcMidday(date);
    const dateStr = date;

    const globalStatus = ratesConfig.globalMealStatus || { breakfast: true, lunch: true, dinner: true };

    // 1. Check emergency closures
    const emSetting = await prisma.mealSetting.findFirst({
      where: { mealDate: declDate, emergencyOff: true },
    });

    if (emSetting && emSetting.emergencyOff && !isAdminOverride) {
      if (breakfast || lunch || dinner) {
        return NextResponse.json(
          { error: `🚨 ${dateStr} তারিখে জরুরি বন্ধ ঘোষিত রয়েছে (${emSetting.emergencyReason || 'Emergency Closure'})। জরুরি অবস্থায় মিল চালু করা সম্ভব নয়।` },
          { status: 400 }
        );
      }
    }

    let newB = Boolean(breakfast);
    let newL = Boolean(lunch);
    let newD = Boolean(dinner);

    // Force off meals that are globally turned off by admin
    if (globalStatus.breakfast === false) newB = false;
    if (globalStatus.lunch === false) newL = false;
    if (globalStatus.dinner === false) newD = false;

    if (emSetting && emSetting.emergencyOff) {
      newB = false;
      newL = false;
      newD = false;
    }

    // 2. Execute entire state read + wallet update + upsert inside a single atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user) {
        throw new Error('ব্যবহারকারী পাওয়া যায়নি');
      }

      const effectiveRates = await resolveMealPricing(dateStr, user.userType, tx);
      const effectiveBRate = effectiveRates.breakfast;
      const effectiveLRate = effectiveRates.lunch;
      const effectiveDRate = effectiveRates.dinner;

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

      // Sync granular MealConsumption central database tracking
      const mealTypes = [
        { type: 'BREAKFAST' as const, selected: newB, rate: effectiveBRate },
        { type: 'LUNCH' as const, selected: newL, rate: effectiveLRate },
        { type: 'DINNER' as const, selected: newD, rate: effectiveDRate },
      ];

      for (const m of mealTypes) {
        await tx.mealConsumption.upsert({
          where: {
            uq_user_meal_date_type: {
              userId,
              mealDate: declDate,
              mealType: m.type,
            },
          },
          update: {
            status: m.selected ? 'ON' : 'OFF',
            chargeAmount: m.selected ? m.rate : 0,
            deductedFromWallet: m.selected,
          },
          create: {
            userId,
            mealDate: declDate,
            mealType: m.type,
            status: m.selected ? 'ON' : 'OFF',
            chargeAmount: m.selected ? m.rate : 0,
            deductedFromWallet: m.selected,
          },
        });
      }

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update declaration' }, { status: 400 });
  }
}

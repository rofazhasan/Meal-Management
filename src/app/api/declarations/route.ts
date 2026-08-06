import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemRatesFromDb } from '@/lib/rates';
import { isMealDateLocked, resolveMealPricing, parseDateToUtcMidday } from '@/lib/mealEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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

    // 2. Fetch User and Pricing via engine
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'ব্যবহারকারী পাওয়া যায়নি' }, { status: 404 });
    }

    const effectiveRates = await resolveMealPricing(dateStr, user.userType);

    const effectiveBRate = effectiveRates.breakfast;
    const effectiveLRate = effectiveRates.lunch;
    const effectiveDRate = effectiveRates.dinner;

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update declaration' }, { status: 400 });
  }
}

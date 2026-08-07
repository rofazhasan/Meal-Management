import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveMealPricing, parseDateToUtcMidday } from '@/lib/mealEngine';
import { getSystemRatesFromDb } from '@/lib/rates';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const dateParam = searchParams.get('date');
    const startDate = searchParams.get('startDate') || dateParam;
    const endDate = searchParams.get('endDate') || dateParam;

    const whereClause: any = {};
    if (userId) whereClause.userId = userId;
    if (startDate || endDate) {
      whereClause.mealDate = {};
      if (startDate) whereClause.mealDate.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) whereClause.mealDate.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const records = await prisma.guestMeal.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, fullName: true, phoneNumber: true, userType: true },
        },
      },
      orderBy: { mealDate: 'asc' },
    });

    const formatted = records.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.fullName,
      userPhone: r.user.phoneNumber,
      userType: r.user.userType,
      date: r.mealDate.toISOString().split('T')[0],
      breakfastCount: r.breakfastCount,
      lunchCount: r.lunchCount,
      dinnerCount: r.dinnerCount,
      rateTier: r.rateTier as 'GUEST' | 'PERMANENT',
      paymentMethod: r.paymentMethod as 'WALLET' | 'CASH',
      chargedAmount: Number(r.chargedAmount),
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching guest meals:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      date,
      breakfastCount = 0,
      lunchCount = 0,
      dinnerCount = 0,
      rateTier = 'GUEST',
      paymentMethod = 'WALLET',
      createdBy,
      isAdminOverride = true,
    } = body;

    if (!userId || !date) {
      return NextResponse.json({ error: 'userId and date are required' }, { status: 400 });
    }

    const numB = Math.max(0, parseInt(breakfastCount, 10) || 0);
    const numL = Math.max(0, parseInt(lunchCount, 10) || 0);
    const numD = Math.max(0, parseInt(dinnerCount, 10) || 0);
    const validRateTier = rateTier === 'PERMANENT' ? 'PERMANENT' : 'GUEST';
    const validPayMethod = paymentMethod === 'CASH' ? 'CASH' : 'WALLET';

    const mealDate = parseDateToUtcMidday(date);

    // 1. Check system global meal status
    const ratesConfig = await getSystemRatesFromDb(prisma);
    const globalStatus = ratesConfig?.globalMealStatus || { breakfast: true, lunch: true, dinner: true };

    // 2. Check emergency closure for target date
    const emSetting = await prisma.mealSetting.findFirst({
      where: { mealDate, emergencyOff: true },
    });

    if (emSetting && emSetting.emergencyOff && !isAdminOverride) {
      if (numB > 0 || numL > 0 || numD > 0) {
        return NextResponse.json(
          { error: `🚨 ${date} তারিখে জরুরি বন্ধ ঘোষিত রয়েছে (${emSetting.emergencyReason || 'Emergency Closure'})। জরুরি অবস্থায় গেস্ট মিল চালুকরণ সম্ভব নয়।` },
          { status: 400 }
        );
      }
    }

    let finalB = numB;
    let finalL = numL;
    let finalD = numD;

    // Suppress counts if meal slot is globally OFF or emergency OFF
    if (globalStatus.breakfast === false) finalB = 0;
    if (globalStatus.lunch === false) finalL = 0;
    if (globalStatus.dinner === false) finalD = 0;

    if (emSetting && emSetting.emergencyOff) {
      finalB = 0;
      finalL = 0;
      finalD = 0;
    }

    // Resolve rates incorporating special meal rates if active for date/slot
    const pricing = await resolveMealPricing(date, validRateTier as any, prisma, true);
    const totalCost =
      finalB * pricing.breakfast +
      finalL * pricing.lunch +
      finalD * pricing.dinner;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user) {
        throw new Error('ব্যবহারকারী পাওয়া যায়নি');
      }

      let wallet = user.wallet;
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId, currentBalance: 0 },
        });
      }

      // Find existing guest meal for this user on target date (00:00:00 to 23:59:59)
      const dStart = new Date(`${date}T00:00:00.000Z`);
      const dEnd = new Date(`${date}T23:59:59.999Z`);

      const existing = await tx.guestMeal.findFirst({
        where: {
          userId,
          mealDate: {
            gte: dStart,
            lte: dEnd,
          },
        },
      });

      const oldCharged = existing ? Number(existing.chargedAmount) : 0;
      const oldPayMethod = existing ? existing.paymentMethod : 'WALLET';

      let currentBal = Number(wallet.currentBalance);
      let newBal = currentBal;

      if (validPayMethod === 'WALLET') {
        let netDiff = 0;
        if (oldPayMethod === 'WALLET') {
          netDiff = totalCost - oldCharged;
        } else {
          // Changed from CASH to WALLET
          netDiff = totalCost;
        }

        if (netDiff > 0) {
          if (currentBal < netDiff && !isAdminOverride) {
            throw new Error(`পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই। প্রয়োজনীয় ৳${netDiff}, বর্তমান ব্যালেন্স ৳${currentBal}`);
          }
          newBal = currentBal - netDiff;
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { currentBalance: newBal },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId: wallet.userId,
              transactionType: 'MEAL_DEDUCTION',
              amount: netDiff,
              balanceBefore: currentBal,
              balanceAfter: newBal,
              referenceType: 'GUEST_MEAL_DEDUCTION',
              referenceId: wallet.id,
              note: `গেস্ট মিল ফি কর্তন (${date}: ${finalB} ব্রেকফাস্ট, ${finalL} লাঞ্চ, ${finalD} ডিনার)`,
            },
          });
        } else if (netDiff < 0) {
          const refundAmt = Math.abs(netDiff);
          newBal = currentBal + refundAmt;
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { currentBalance: newBal },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId: wallet.userId,
              transactionType: 'REFUND',
              amount: refundAmt,
              balanceBefore: currentBal,
              balanceAfter: newBal,
              referenceType: 'GUEST_MEAL_REFUND',
              referenceId: wallet.id,
              note: `গেস্ট মিল বাতিল/হ্রাস রিফান্ড (${date})`,
            },
          });
        }
      } else {
        // Payment Method: CASH
        if (oldPayMethod === 'WALLET' && oldCharged > 0) {
          // Refund previous wallet deduction because payment method changed to CASH
          newBal = currentBal + oldCharged;
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { currentBalance: newBal },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId: wallet.userId,
              transactionType: 'REFUND',
              amount: oldCharged,
              balanceBefore: currentBal,
              balanceAfter: newBal,
              referenceType: 'GUEST_MEAL_CASH_SWITCH_REFUND',
              referenceId: wallet.id,
              note: `গেস্ট মিল ক্যাশে পরিবর্তন করার রিফান্ড (${date})`,
            },
          });
        }

        if (totalCost > 0) {
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId: wallet.userId,
              transactionType: 'CASH_PAID',
              amount: totalCost,
              balanceBefore: newBal,
              balanceAfter: newBal,
              referenceType: 'GUEST_MEAL_CASH',
              referenceId: wallet.id,
              note: `গেস্ট মিল নগদ/ক্যাশ পরিশোধ (${date}: ৳${totalCost})`,
            },
          });
        }
      }

      let recordResult: any = null;

      if (finalB === 0 && finalL === 0 && finalD === 0) {
        if (existing) {
          await tx.guestMeal.delete({
            where: { id: existing.id },
          });
        }
        recordResult = {
          id: existing ? existing.id : 'deleted',
          userId,
          userName: user.fullName,
          date,
          breakfastCount: 0,
          lunchCount: 0,
          dinnerCount: 0,
          rateTier: validRateTier,
          paymentMethod: validPayMethod,
          chargedAmount: 0,
        };
      } else if (existing) {
        const updated = await tx.guestMeal.update({
          where: { id: existing.id },
          data: {
            breakfastCount: finalB,
            lunchCount: finalL,
            dinnerCount: finalD,
            rateTier: validRateTier,
            paymentMethod: validPayMethod,
            chargedAmount: totalCost,
            createdBy: createdBy || null,
          },
        });
        recordResult = {
          id: updated.id,
          userId: updated.userId,
          userName: user.fullName,
          date,
          breakfastCount: updated.breakfastCount,
          lunchCount: updated.lunchCount,
          dinnerCount: updated.dinnerCount,
          rateTier: updated.rateTier,
          paymentMethod: updated.paymentMethod,
          chargedAmount: Number(updated.chargedAmount),
        };
      } else {
        const created = await tx.guestMeal.create({
          data: {
            userId,
            mealDate: parseDateToUtcMidday(date),
            breakfastCount: finalB,
            lunchCount: finalL,
            dinnerCount: finalD,
            rateTier: validRateTier,
            paymentMethod: validPayMethod,
            chargedAmount: totalCost,
            createdBy: createdBy || null,
          },
        });
        recordResult = {
          id: created.id,
          userId: created.userId,
          userName: user.fullName,
          date,
          breakfastCount: created.breakfastCount,
          lunchCount: created.lunchCount,
          dinnerCount: created.dinnerCount,
          rateTier: created.rateTier,
          paymentMethod: created.paymentMethod,
          chargedAmount: Number(created.chargedAmount),
        };
      }

      return {
        ...recordResult,
        walletBalance: newBal,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error saving guest meal:', error);
    return NextResponse.json({ error: error.message || 'Failed to update guest meal' }, { status: 400 });
  }
}

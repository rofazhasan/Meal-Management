import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set([
  'SUPERADMIN',
  'ADMIN',
  'OWNER',
  'FINANCE_ADMIN',
  'MEAL_MANAGER',
  'HOSTEL_MANAGER',
  'AUDITOR',
  'SUPPORT_ADMIN',
  'READONLY_ADMIN',
]);

const BGL_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

function getPeriodBounds(month?: string | null, startDateParam?: string | null, endDateParam?: string | null) {
  let startStr = startDateParam;
  let endStr = endDateParam;

  if (month && (!startStr || !endStr)) {
    const [yearStr, mStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(mStr, 10);
    const firstDay = new Date(Date.UTC(year, m - 1, 1));
    const lastDay = new Date(Date.UTC(year, m, 0));
    startStr = firstDay.toISOString().split('T')[0];
    endStr = lastDay.toISOString().split('T')[0];
  }

  if (!startStr || !endStr) {
    throw new Error('মাস (YYYY-MM) অথবা শুরুর তারিখ ও শেষ তারিখ প্রদান করুন');
  }

  const startDate = new Date(`${startStr}T00:00:00.000Z`);
  const endDate = new Date(`${endStr}T23:59:59.999Z`);
  const periodLabel = startStr === endStr ? startStr : `${startStr} থেকে ${endStr}`;

  return { startStr, endStr, startDate, endDate, periodLabel };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const { startDate, endDate, periodLabel } = getPeriodBounds(month, startDateParam, endDateParam);

    const [declarationsCount, consumptionsCount, guestMealsCount, transactionsCount, mealSettingsCount, specialMealsCount] =
      await Promise.all([
        prisma.mealDeclaration.count({
          where: { declarationDate: { gte: startDate, lte: endDate } },
        }),
        prisma.mealConsumption.count({
          where: { mealDate: { gte: startDate, lte: endDate } },
        }),
        prisma.guestMeal.count({
          where: { mealDate: { gte: startDate, lte: endDate } },
        }),
        prisma.walletTransaction.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.mealSetting.count({
          where: { mealDate: { gte: startDate, lte: endDate } },
        }),
        prisma.specialMeal.count({
          where: { mealDate: { gte: startDate, lte: endDate } },
        }),
      ]);

    return NextResponse.json({
      periodLabel,
      counts: {
        declarationsCount,
        consumptionsCount,
        guestMealsCount,
        transactionsCount,
        mealSettingsCount,
        specialMealsCount,
        totalOperationalRecords: declarationsCount + consumptionsCount + guestMealsCount + transactionsCount + mealSettingsCount,
      },
    });
  } catch (error: any) {
    console.error('Error previewing archive data:', error);
    return NextResponse.json({ error: error.message || 'Failed to preview archive data' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { adminId, month, startDate: startDateParam, endDate: endDateParam } = body;

    if (!adminId) {
      return NextResponse.json({ error: 'অ্যাডমিন আইডি প্রয়োজন' }, { status: 400 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || !ADMIN_ROLES.has(admin.role)) {
      return NextResponse.json({ error: 'অনুমতি নেই: শুধুমাত্র অ্যাডমিন ডাটা আর্কাইভ করতে পারবেন' }, { status: 403 });
    }

    const { startStr, endStr, startDate, endDate, periodLabel } = getPeriodBounds(month, startDateParam, endDateParam);

    // 1. Query all users and operational data for the date range
    const [users, declarations, consumptions, guestMeals, transactions, mealSettings, specialMeals] = await Promise.all([
      prisma.user.findMany({
        include: { profile: true, wallet: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.mealDeclaration.findMany({
        where: { declarationDate: { gte: startDate, lte: endDate } },
        include: { user: { select: { fullName: true, phoneNumber: true } } },
        orderBy: { declarationDate: 'asc' },
      }),
      prisma.mealConsumption.findMany({
        where: { mealDate: { gte: startDate, lte: endDate } },
        include: { user: { select: { fullName: true, phoneNumber: true } } },
        orderBy: { mealDate: 'asc' },
      }),
      prisma.guestMeal.findMany({
        where: { mealDate: { gte: startDate, lte: endDate } },
        include: { user: { select: { fullName: true, phoneNumber: true } } },
        orderBy: { mealDate: 'asc' },
      }),
      prisma.walletTransaction.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: { user: { select: { fullName: true, phoneNumber: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.mealSetting.findMany({
        where: { mealDate: { gte: startDate, lte: endDate } },
      }),
      prisma.specialMeal.findMany({
        where: { mealDate: { gte: startDate, lte: endDate } },
      }),
    ]);

    // Build map of users for fast aggregate lookups
    const userStatsMap = new Map<string, any>();
    users.forEach((u) => {
      userStatsMap.set(u.id, {
        userId: u.id,
        fullName: u.fullName,
        phoneNumber: u.phoneNumber,
        role: u.role,
        userType: u.userType,
        department: u.profile?.department,
        studentId: u.profile?.studentId,
        roomNumber: u.profile?.roomNumber,
        hostelName: u.profile?.hostelName,
        breakfastCount: 0,
        lunchCount: 0,
        dinnerCount: 0,
        totalRegularMeals: 0,
        regularMealCharges: 0,
        guestBreakfastCount: 0,
        guestLunchCount: 0,
        guestDinnerCount: 0,
        totalGuestMeals: 0,
        guestMealCharges: 0,
        monthlyFee: 0,
        totalRechargesReceived: 0,
        totalDeductions: 0,
        currentWalletBalance: u.wallet ? Number(u.wallet.currentBalance) : 0,
      });
    });

    let totalRegularChargesSum = 0;
    let totalGuestChargesSum = 0;
    let totalMonthlyFeesSum = 0;
    let totalWalletDeductionsSum = 0;
    let totalRechargesReceivedSum = 0;
    let totalCashPaidGuestMealsSum = 0;

    // Process Consumptions
    consumptions.forEach((c) => {
      const stats = userStatsMap.get(c.userId);
      const amt = Number(c.chargeAmount);
      if (stats) {
        if (c.mealType === 'BREAKFAST') stats.breakfastCount += 1;
        if (c.mealType === 'LUNCH') stats.lunchCount += 1;
        if (c.mealType === 'DINNER') stats.dinnerCount += 1;
        stats.totalRegularMeals += 1;
        stats.regularMealCharges += amt;
      }
      totalRegularChargesSum += amt;
    });

    // Process Guest Meals
    guestMeals.forEach((g) => {
      const stats = userStatsMap.get(g.userId);
      const amt = Number(g.chargedAmount);
      if (stats) {
        stats.guestBreakfastCount += g.breakfastCount;
        stats.guestLunchCount += g.lunchCount;
        stats.guestDinnerCount += g.dinnerCount;
        stats.totalGuestMeals += g.breakfastCount + g.lunchCount + g.dinnerCount;
        stats.guestMealCharges += amt;
      }
      totalGuestChargesSum += amt;
      if (g.paymentMethod === 'CASH') {
        totalCashPaidGuestMealsSum += amt;
      }
    });

    // Process Transactions
    transactions.forEach((t) => {
      const stats = t.userId ? userStatsMap.get(t.userId) : null;
      const amt = Number(t.amount);
      if (t.transactionType === 'CREDIT' || t.transactionType === 'RECHARGE' || t.transactionType === 'ADMIN_TOPUP') {
        if (stats) stats.totalRechargesReceived += amt;
        totalRechargesReceivedSum += amt;
      } else if (t.transactionType === 'MONTHLY_CHARGE') {
        if (stats) stats.monthlyFee += amt;
        totalMonthlyFeesSum += amt;
        totalWalletDeductionsSum += amt;
      } else if (t.transactionType === 'MEAL_DEDUCTION' || t.transactionType === 'DEBIT') {
        if (stats) stats.totalDeductions += amt;
        totalWalletDeductionsSum += amt;
      }
    });

    // Daily Kitchen Summary Map (by YYYY-MM-DD string)
    const dailyMap = new Map<string, any>();

    // Generate date sequence from startStr to endStr
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dateStr = curr.toISOString().split('T')[0];
      const dayOfWeek = BGL_DAYS[curr.getUTCDay()];
      dailyMap.set(dateStr, {
        date: dateStr,
        dayOfWeek,
        regularBreakfast: 0,
        regularLunch: 0,
        regularDinner: 0,
        guestBreakfast: 0,
        guestLunch: 0,
        guestDinner: 0,
        totalBreakfast: 0,
        totalLunch: 0,
        totalDinner: 0,
        grandTotalMeals: 0,
        isEmergencyOff: false,
        emergencyReason: undefined,
        specialMealTitle: undefined,
      });
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    consumptions.forEach((c) => {
      const dateStr = c.mealDate.toISOString().split('T')[0];
      const day = dailyMap.get(dateStr);
      if (day && (c.status === 'ON' || c.status === 'PAID' || c.status === 'COPIED')) {
        if (c.mealType === 'BREAKFAST') day.regularBreakfast += 1;
        if (c.mealType === 'LUNCH') day.regularLunch += 1;
        if (c.mealType === 'DINNER') day.regularDinner += 1;
      }
    });

    guestMeals.forEach((g) => {
      const dateStr = g.mealDate.toISOString().split('T')[0];
      const day = dailyMap.get(dateStr);
      if (day) {
        day.guestBreakfast += g.breakfastCount;
        day.guestLunch += g.lunchCount;
        day.guestDinner += g.dinnerCount;
      }
    });

    mealSettings.forEach((ms) => {
      const dateStr = ms.mealDate.toISOString().split('T')[0];
      const day = dailyMap.get(dateStr);
      if (day && ms.emergencyOff) {
        day.isEmergencyOff = true;
        day.emergencyReason = ms.emergencyReason || 'Emergency Off';
      }
    });

    specialMeals.forEach((sm) => {
      const dateStr = sm.mealDate.toISOString().split('T')[0];
      const day = dailyMap.get(dateStr);
      if (day) {
        day.specialMealTitle = sm.title;
      }
    });

    // Compute totals for daily kitchen summary
    const dailyKitchenSummary = Array.from(dailyMap.values()).map((d) => {
      const totalBreakfast = d.regularBreakfast + d.guestBreakfast;
      const totalLunch = d.regularLunch + d.guestLunch;
      const totalDinner = d.regularDinner + d.guestDinner;
      return {
        ...d,
        totalBreakfast,
        totalLunch,
        totalDinner,
        grandTotalMeals: totalBreakfast + totalLunch + totalDinner,
      };
    });

    const membersSummaryList = Array.from(userStatsMap.values());
    const totalRegularMealsCount = consumptions.length;
    const totalGuestMealsCount = guestMeals.reduce(
      (sum, g) => sum + g.breakfastCount + g.lunchCount + g.dinnerCount,
      0
    );

    const archivePayload = {
      period: {
        startDate: startStr,
        endDate: endStr,
        periodLabel,
      },
      archivedAt: new Date().toISOString(),
      archivedByAdminName: admin.fullName,
      summary: {
        totalUsers: users.length,
        totalPermanentUsers: users.filter((u) => u.userType === 'PERMANENT').length,
        totalGuestUsers: users.filter((u) => u.userType === 'GUEST').length,
        totalRegularMeals: totalRegularMealsCount,
        totalGuestMeals: totalGuestMealsCount,
        totalSpecialMealsCount: specialMeals.length,
        totalRegularCharges: totalRegularChargesSum,
        totalGuestCharges: totalGuestChargesSum,
        totalMonthlyFees: totalMonthlyFeesSum,
        totalWalletDeductions: totalWalletDeductionsSum,
        totalRechargesReceived: totalRechargesReceivedSum,
        totalCashPaidGuestMeals: totalCashPaidGuestMealsSum,
      },
      membersSummary: membersSummaryList,
      dailyKitchenSummary,
      declarations: declarations.map((d) => ({
        userId: d.userId,
        userName: d.user.fullName,
        userPhone: d.user.phoneNumber,
        date: d.declarationDate.toISOString().split('T')[0],
        dayOfWeek: BGL_DAYS[d.declarationDate.getUTCDay()],
        breakfast: d.breakfastSelected,
        lunch: d.lunchSelected,
        dinner: d.dinnerSelected,
        sourceType: d.sourceType,
      })),
      consumptions: consumptions.map((c) => ({
        userId: c.userId,
        userName: c.user.fullName,
        userPhone: c.user.phoneNumber,
        date: c.mealDate.toISOString().split('T')[0],
        dayOfWeek: BGL_DAYS[c.mealDate.getUTCDay()],
        mealType: c.mealType,
        status: c.status,
        chargeAmount: Number(c.chargeAmount),
        deductedFromWallet: c.deductedFromWallet,
      })),
      guestMeals: guestMeals.map((g) => ({
        id: g.id,
        userId: g.userId,
        userName: g.user.fullName,
        userPhone: g.user.phoneNumber,
        date: g.mealDate.toISOString().split('T')[0],
        dayOfWeek: BGL_DAYS[g.mealDate.getUTCDay()],
        breakfastCount: g.breakfastCount,
        lunchCount: g.lunchCount,
        dinnerCount: g.dinnerCount,
        rateTier: g.rateTier,
        paymentMethod: g.paymentMethod,
        chargedAmount: Number(g.chargedAmount),
        createdBy: g.createdBy || undefined,
      })),
      transactions: transactions.map((t) => ({
        id: t.id,
        userName: t.user ? t.user.fullName : 'System',
        userPhone: t.user ? t.user.phoneNumber : '-',
        transactionType: t.transactionType,
        amount: Number(t.amount),
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
        referenceType: t.referenceType || undefined,
        note: t.note || undefined,
        createdAt: t.createdAt.toISOString(),
      })),
      specialMeals: specialMeals.map((s) => ({
        title: s.title,
        date: s.mealDate.toISOString().split('T')[0],
        mealType: s.mealType,
        customRate: Number(s.customRate),
        description: s.description || undefined,
        isRecurring: s.isRecurring,
      })),
    };

    // 2. Perform Atomic Purge of operational records for the target period
    const deletedCounts = await prisma.$transaction(async (tx) => {
      const delDeclarations = await tx.mealDeclaration.deleteMany({
        where: { declarationDate: { gte: startDate, lte: endDate } },
      });
      const delConsumptions = await tx.mealConsumption.deleteMany({
        where: { mealDate: { gte: startDate, lte: endDate } },
      });
      const delGuestMeals = await tx.guestMeal.deleteMany({
        where: { mealDate: { gte: startDate, lte: endDate } },
      });
      const delSettings = await tx.mealSetting.deleteMany({
        where: { mealDate: { gte: startDate, lte: endDate } },
      });
      const delSpecialMeals = await tx.specialMeal.deleteMany({
        where: { mealDate: { gte: startDate, lte: endDate }, isRecurring: false },
      });
      const delTransactions = await tx.walletTransaction.deleteMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorUserId: adminId,
          action: 'MONTHLY_DATA_ARCHIVED',
          details: `Archived & exported data for period (${periodLabel}) to Excel. Purged: ${delDeclarations.count} declarations, ${delConsumptions.count} consumptions, ${delGuestMeals.count} guest meals, ${delTransactions.count} transactions. Users & balances preserved.`,
        },
      });

      return {
        declarations: delDeclarations.count,
        consumptions: delConsumptions.count,
        guestMeals: delGuestMeals.count,
        mealSettings: delSettings.count,
        specialMeals: delSpecialMeals.count,
        transactions: delTransactions.count,
      };
    });

    return NextResponse.json({
      success: true,
      periodLabel,
      deletedCounts,
      payload: archivePayload,
    });
  } catch (error: any) {
    console.error('Error executing monthly archive:', error);
    return NextResponse.json({ error: error.message || 'Failed to archive data' }, { status: 400 });
  }
}

import { prisma as defaultPrisma } from './prisma';
import { pool } from './db';
import { getSystemRatesFromDb, SystemRates } from './rates';
import { UserRole } from '@prisma/client';

/**
 * Returns current Bangladesh Standard Time (BST, UTC+6) Date object.
 */
export function getBgdNow(): Date {
  const now = new Date();
  const bdTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
  return new Date(bdTimeString);
}

/**
 * Converts a Date or ISO string to standard BST 'YYYY-MM-DD' date string.
 */
export function getBgdDateStr(d: Date | string = getBgdNow()): string {
  if (typeof d === 'string') {
    return d.split('T')[0];
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates a UTC Date normalized at 12:00:00 UTC for a given 'YYYY-MM-DD' string
 * to prevent date shift bugs across different timezone environments.
 */
export function parseDateToUtcMidday(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/**
 * Strict Cutoff Lock Algorithm:
 * Checks if a meal date is locked for regular non-admin users.
 * 
 * Rules:
 * 1. Any date strictly before today (BST) is LOCKED.
 * 2. Today (BST) is LOCKED if current BST time >= cutoffTime (e.g. "10:00").
 * 3. Future dates are UNLOCKED unless globally disabled or emergency locked.
 */
export function isMealDateLocked(
  dateStr: string,
  cutoffTimeStr: string = '10:00',
  nowBgd: Date = getBgdNow()
): { isLocked: boolean; reason?: string } {
  const cleanDateStr = getBgdDateStr(dateStr);
  const todayStr = getBgdDateStr(nowBgd);

  if (cleanDateStr < todayStr) {
    return { isLocked: true, reason: 'Past dates cannot be modified.' };
  }

  if (cleanDateStr === todayStr) {
    const [cutoffHour, cutoffMinute] = cutoffTimeStr.split(':').map(Number);
    const currentHour = nowBgd.getHours();
    const currentMinute = nowBgd.getMinutes();

    const isAfterCutoff =
      currentHour > cutoffHour ||
      (currentHour === cutoffHour && currentMinute >= cutoffMinute);

    if (isAfterCutoff) {
      return {
        isLocked: true,
        reason: `Today's meal cutoff time (${cutoffTimeStr}) has passed.`,
      };
    }
  }

  return { isLocked: false };
}

/**
 * Hierarchical Pricing Resolver Algorithm:
 * Resolves effective meal prices for a date considering:
 * Level 1: Special Meal custom rate (if configured and active)
 * Level 2: User Type specific rates (PERMANENT vs GUEST)
 * Level 3: System defaults
 */
export async function resolveMealPricing(
  dateStr: string,
  userType: 'PERMANENT' | 'GUEST' = 'PERMANENT',
  tx?: any,
  ignoreGlobalOff: boolean = false
): Promise<{ breakfast: number; lunch: number; dinner: number }> {
  const ratesConfig: SystemRates = await getSystemRatesFromDb(tx);
  const baseRates = userType === 'GUEST' ? ratesConfig.guest : ratesConfig.permanent;
  const globalStatus = ratesConfig.globalMealStatus || { breakfast: true, lunch: true, dinner: true };

  let specB: number | null = null;
  let specL: number | null = null;
  let specD: number | null = null;

  try {
    const db = tx || defaultPrisma;
    const mealDate = parseDateToUtcMidday(dateStr);
    const dayOfWeek = mealDate.getUTCDay();
    const specMeals = await db.specialMeal.findMany({
      where: {
        isActive: true,
        OR: [
          { mealDate },
          { isRecurring: true, repeatDayOfWeek: dayOfWeek },
        ],
      },
    });

    // Sort so recurring special meals are evaluated first, allowing date-specific special meals to overwrite them
    specMeals.sort((a: any, b: any) => (a.isRecurring ? 0 : 1) - (b.isRecurring ? 0 : 1));

    for (const sm of specMeals) {
      if (sm.isActive === false) continue;
      if (sm.mealType === 'BREAKFAST') specB = Number(sm.customRate);
      if (sm.mealType === 'LUNCH') specL = Number(sm.customRate);
      if (sm.mealType === 'DINNER') specD = Number(sm.customRate);
    }
  } catch (err) {
    // Fall back to base rates if special_meals table is missing or errors
  }

  const bPrice = specB !== null ? specB : baseRates.breakfast;
  const lPrice = specL !== null ? specL : baseRates.lunch;
  const dPrice = specD !== null ? specD : baseRates.dinner;

  if (ignoreGlobalOff) {
    return { breakfast: bPrice, lunch: lPrice, dinner: dPrice };
  }

  return {
    breakfast: globalStatus.breakfast === false ? 0 : bPrice,
    lunch: globalStatus.lunch === false ? 0 : lPrice,
    dinner: globalStatus.dinner === false ? 0 : dPrice,
  };
}

/**
 * Emergency Closure Batch Refund Algorithm:
 * When emergency closure is activated for a target date, this algorithm:
 * 1. Locates all existing meal declarations for that date with active meals (B, L, or D).
 * 2. Calculates exact deducted cost for each user.
 * 3. Turns off declarations for that date.
 * 4. Refunds users' wallets atomically with structured REFUND transactions.
 */
export async function processEmergencyClosureWithRefunds(
  dateStr: string,
  reason: string,
  txPrisma?: any
): Promise<{ refundedUsersCount: number; totalRefundedAmount: number }> {
  const db = txPrisma || defaultPrisma;
  const declDate = parseDateToUtcMidday(dateStr);

  const declarations = await db.mealDeclaration.findMany({
    where: { declarationDate: declDate },
    include: { user: { include: { wallet: true } } },
  });

  let refundedUsersCount = 0;
  let totalRefundedAmount = 0;

  for (const decl of declarations) {
    const hasAnyMeal = decl.breakfastSelected || decl.lunchSelected || decl.dinnerSelected;
    if (!hasAnyMeal) continue;

    const userType = decl.user.userType;
    const rates = await resolveMealPricing(dateStr, userType, db, true);

    const costToRefund =
      (decl.breakfastSelected ? rates.breakfast : 0) +
      (decl.lunchSelected ? rates.lunch : 0) +
      (decl.dinnerSelected ? rates.dinner : 0);

    if (costToRefund > 0 && decl.user.wallet) {
      const wallet = decl.user.wallet;
      const currentBal = Number(wallet.currentBalance);
      const newBal = currentBal + costToRefund;

      await db.wallet.update({
        where: { id: wallet.id },
        data: { currentBalance: newBal },
      });

      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: wallet.userId,
          transactionType: 'REFUND',
          amount: costToRefund,
          balanceBefore: currentBal,
          balanceAfter: newBal,
          referenceType: 'EMERGENCY_CLOSURE_REFUND',
          referenceId: wallet.id,
          note: `জরুরি মিল বন্ধের রিফান্ড (${dateStr}): ${reason}`,
        },
      });

      totalRefundedAmount += costToRefund;
      refundedUsersCount++;
    }

    await db.mealDeclaration.update({
      where: { id: decl.id },
      data: {
        breakfastSelected: false,
        lunchSelected: false,
        dinnerSelected: false,
        sourceType: 'ADMIN_OVERRIDE',
      },
    });
  }

  return { refundedUsersCount, totalRefundedAmount };
}

/**
 * Special Meal Creation Batch Refund & Reset Algorithm:
 * When a special meal is added, updated, or deleted by admin for a target date:
 * 1. Finds all existing meal declarations for that date with active meals in the target slot(s).
 * 2. Calculates exact deducted cost for each user for the target slot(s) before applying special meal change.
 * 3. Turns off only the target meal slot declaration(s) for that date.
 * 4. Refunds users' wallets atomically with structured REFUND transactions.
 * 5. Syncs central DB MealConsumption status for target slot(s) to OFF.
 */
export async function processSpecialMealCreationWithRefunds(
  dateStr: string,
  targetMealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'ALL' = 'ALL',
  txPrisma?: any
): Promise<{ refundedUsersCount: number; totalRefundedAmount: number }> {
  const db = txPrisma || defaultPrisma;
  const declDate = parseDateToUtcMidday(dateStr);

  const declarations = await db.mealDeclaration.findMany({
    where: { declarationDate: declDate },
    include: { user: { include: { wallet: true } } },
  });

  let refundedUsersCount = 0;
  let totalRefundedAmount = 0;

  const upperType = targetMealType.toUpperCase();

  for (const decl of declarations) {
    const checkB = (upperType === 'BREAKFAST' || upperType === 'ALL') && decl.breakfastSelected;
    const checkL = (upperType === 'LUNCH' || upperType === 'ALL') && decl.lunchSelected;
    const checkD = (upperType === 'DINNER' || upperType === 'ALL') && decl.dinnerSelected;

    if (!checkB && !checkL && !checkD) continue;

    const userType = decl.user.userType;
    const rates = await resolveMealPricing(dateStr, userType, db, true);

    const costToRefund =
      (checkB ? rates.breakfast : 0) +
      (checkL ? rates.lunch : 0) +
      (checkD ? rates.dinner : 0);

    if (costToRefund > 0 && decl.user.wallet) {
      const wallet = decl.user.wallet;
      const currentBal = Number(wallet.currentBalance);
      const newBal = currentBal + costToRefund;

      await db.wallet.update({
        where: { id: wallet.id },
        data: { currentBalance: newBal },
      });

      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: wallet.userId,
          transactionType: 'REFUND',
          amount: costToRefund,
          balanceBefore: currentBal,
          balanceAfter: newBal,
          referenceType: 'SPECIAL_MEAL_RESET_REFUND',
          referenceId: wallet.id,
          note: `বিশেষ মিল ঘোষণার পূর্বে মিল রিফান্ড (${dateStr})`,
        },
      });

      totalRefundedAmount += costToRefund;
      refundedUsersCount++;
    }

    const updateData: any = {
      sourceType: 'ADMIN_OVERRIDE',
    };
    if (checkB) updateData.breakfastSelected = false;
    if (checkL) updateData.lunchSelected = false;
    if (checkD) updateData.dinnerSelected = false;

    await db.mealDeclaration.update({
      where: { id: decl.id },
      data: updateData,
    });

    const slotsToUpdate: ('BREAKFAST' | 'LUNCH' | 'DINNER')[] = [];
    if (checkB) slotsToUpdate.push('BREAKFAST');
    if (checkL) slotsToUpdate.push('LUNCH');
    if (checkD) slotsToUpdate.push('DINNER');

    for (const slot of slotsToUpdate) {
      await db.mealConsumption.upsert({
        where: {
          uq_user_meal_date_type: {
            userId: decl.userId,
            mealDate: declDate,
            mealType: slot,
          },
        },
        update: {
          status: 'OFF',
          chargeAmount: 0,
          deductedFromWallet: false,
        },
        create: {
          userId: decl.userId,
          mealDate: declDate,
          mealType: slot,
          status: 'OFF',
          chargeAmount: 0,
          deductedFromWallet: false,
        },
      });
    }
  }

  return { refundedUsersCount, totalRefundedAmount };
}


/**
 * Role-Based Access Control (RBAC) Matrix Algorithm:
 * Evaluates whether a given UserRole has permission to execute a target administrative action.
 */
export type AdminAction =
  | 'SYSTEM_SETTINGS_WRITE'
  | 'EMERGENCY_TOGGLE'
  | 'RECHARGE_APPROVE'
  | 'RATES_UPDATE'
  | 'MEAL_ADMIN_OVERRIDE'
  | 'AUDIT_LOG_VIEW'
  | 'USER_ROLE_MODIFY';

export function checkUserPermission(role: UserRole | string, action: AdminAction): boolean {
  const superRoles = ['SUPERADMIN', 'ADMIN', 'OWNER'];
  if (superRoles.includes(role)) return true;

  if (role === 'READONLY_ADMIN') {
    return action === 'AUDIT_LOG_VIEW';
  }

  switch (action) {
    case 'RECHARGE_APPROVE':
      return ['FINANCE_ADMIN', 'SUPPORT_ADMIN'].includes(role);
    case 'EMERGENCY_TOGGLE':
      return ['MEAL_MANAGER', 'HOSTEL_MANAGER'].includes(role);
    case 'RATES_UPDATE':
      return ['FINANCE_ADMIN', 'MEAL_MANAGER'].includes(role);
    case 'MEAL_ADMIN_OVERRIDE':
      return ['MEAL_MANAGER', 'HOSTEL_MANAGER'].includes(role);
    case 'AUDIT_LOG_VIEW':
      return ['AUDITOR', 'FINANCE_ADMIN'].includes(role);
    case 'USER_ROLE_MODIFY':
      return false; // Only SUPERADMIN/ADMIN/OWNER
    default:
      return false;
  }
}

/**
 * Kitchen Demand Forecasting Algorithm:
 * Aggregates exact meal count requirements for a date and computes food prep quantities with buffer.
 */
export async function forecastKitchenDemand(
  dateStr: string,
  safetyBufferPercent: number = 5,
  txPrisma?: any
) {
  const db = txPrisma || defaultPrisma;
  const declDate = parseDateToUtcMidday(dateStr);

  const declarations = await db.mealDeclaration.findMany({
    where: { declarationDate: declDate },
    include: { user: true },
  });

  let permanentB = 0, permanentL = 0, permanentD = 0;
  let guestB = 0, guestL = 0, guestD = 0;

  for (const d of declarations) {
    const isGuest = d.user.userType === 'GUEST';
    if (d.breakfastSelected) isGuest ? guestB++ : permanentB++;
    if (d.lunchSelected) isGuest ? guestL++ : permanentL++;
    if (d.dinnerSelected) isGuest ? guestD++ : permanentD++;
  }

  const totalB = permanentB + guestB;
  const totalL = permanentL + guestL;
  const totalD = permanentD + guestD;

  const multiplier = 1 + safetyBufferPercent / 100;
  const bufferedB = Math.ceil(totalB * multiplier);
  const bufferedL = Math.ceil(totalL * multiplier);
  const bufferedD = Math.ceil(totalD * multiplier);

  return {
    date: dateStr,
    safetyBufferPercent,
    actualDemand: {
      breakfast: totalB,
      lunch: totalL,
      dinner: totalD,
      breakdown: {
        permanent: { breakfast: permanentB, lunch: permanentL, dinner: permanentD },
        guest: { breakfast: guestB, lunch: guestL, dinner: guestD },
      },
    },
    recommendedKitchenPrep: {
      breakfast: bufferedB,
      lunch: bufferedL,
      dinner: bufferedD,
    },
  };
}

/**
 * Wallet Anti-Fraud Audit & Reconciliation Algorithm:
 * Audits every active user wallet against ledger history.
 * Detects negative balance anomalies, transaction mismatches, and tampered records.
 */
export async function reconcileUserWalletsAndDetectAnomalies(txPrisma?: any) {
  const db = txPrisma || defaultPrisma;

  const usersWithWallets = await db.user.findMany({
    where: { deletedAt: null },
    include: {
      wallet: {
        include: {
          transactions: true,
        },
      },
    },
  });

  const anomalies: Array<{
    userId: string;
    userName: string;
    phone: string;
    storedBalance: number;
    reconstructedBalance: number;
    discrepancy: number;
    isNegative: boolean;
    issueType: 'DISCREPANCY' | 'NEGATIVE_BALANCE' | 'BOTH';
  }> = [];

  let totalAudited = 0;

  for (const u of usersWithWallets) {
    if (!u.wallet) continue;
    totalAudited++;

    const storedBal = Number(u.wallet.currentBalance);
    let reconstructedBal = 0;

    for (const trx of u.wallet.transactions) {
      const amt = Number(trx.amount);
      if (['ADMIN_TOPUP', 'RECHARGE', 'CREDIT', 'REFUND'].includes(trx.transactionType)) {
        reconstructedBal += amt;
      } else if (['MEAL_DEDUCTION', 'DEBIT', 'MONTHLY_CHARGE', 'PENALTY'].includes(trx.transactionType)) {
        reconstructedBal -= amt;
      }
    }

    const discrepancy = Math.abs(storedBal - reconstructedBal);
    const isNegative = storedBal < 0;
    const isDiscrepant = discrepancy >= 0.01;

    if (isNegative || isDiscrepant) {
      let issueType: 'DISCREPANCY' | 'NEGATIVE_BALANCE' | 'BOTH' = 'DISCREPANCY';
      if (isNegative && isDiscrepant) issueType = 'BOTH';
      else if (isNegative) issueType = 'NEGATIVE_BALANCE';

      anomalies.push({
        userId: u.id,
        userName: u.fullName,
        phone: u.phoneNumber,
        storedBalance: storedBal,
        reconstructedBalance: reconstructedBal,
        discrepancy: Math.round(discrepancy * 100) / 100,
        isNegative,
        issueType,
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalAuditedWallets: totalAudited,
    anomaliesCount: anomalies.length,
    isSystemClean: anomalies.length === 0,
    anomalies,
  };
}

/**
 * Auto-Copy Previous Day Declarations Algorithm:
 * For a given target date (defaults to current Bangladesh date), if cutoff time has passed (or if date < today):
 * 1. Checks all active, approved, non-paused users.
 * 2. If a user does NOT have a declaration record for target date:
 *    - Looks up their declaration for targetDate - 1 day (or latest prior declaration date).
 *    - If found, copies their breakfast, lunch, dinner selections (respecting global meal off settings).
 *    - Resolves target date pricing for user.
 *    - If total cost > 0:
 *      - Deducts cost from user's wallet.
 *      - Records 'MEAL_DEDUCTION' transaction: `স্বয়ংক্রিয় কপি করা মিল ফি কর্তন (${targetDate})`.
 *    - Saves meal declaration with sourceType: 'COPIED'.
 */
export async function autoCopyPreviousDayDeclarations(
  targetDateStr: string = getBgdDateStr(),
  txPrisma?: any
): Promise<{ copiedCount: number; totalDeductedAmount: number }> {
  const db = txPrisma || defaultPrisma;
  const ratesConfig: SystemRates = await getSystemRatesFromDb(db);
  const declDate = parseDateToUtcMidday(targetDateStr);

  // Check if targetDateStr is under emergency closure
  const emSetting = await db.mealSetting.findFirst({
    where: { mealDate: declDate, emergencyOff: true },
  });

  // Calculate previous date string
  const targetDt = new Date(`${targetDateStr}T12:00:00Z`);
  targetDt.setUTCDate(targetDt.getUTCDate() - 1);
  const prevDateStr = targetDt.toISOString().split('T')[0];
  const prevDeclDate = parseDateToUtcMidday(prevDateStr);

  // Fetch all active approved users who are not indefinitely paused
  const activeUsers = await db.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      isIndefinitelyPaused: false,
      approvalStatus: 'APPROVED',
    },
    include: { wallet: true },
  });

  const globalStatus = ratesConfig.globalMealStatus || { breakfast: true, lunch: true, dinner: true };

  let copiedCount = 0;
  let totalDeductedAmount = 0;

  for (const user of activeUsers) {
    // Check if user already has declaration for targetDate
    const existing = await db.mealDeclaration.findUnique({
      where: {
        uq_user_declaration_date: {
          userId: user.id,
          declarationDate: declDate,
        },
      },
    });

    if (existing) continue; // Already declared by user or admin

    if (emSetting && emSetting.emergencyOff) {
      await db.mealDeclaration.create({
        data: {
          userId: user.id,
          declarationDate: declDate,
          breakfastSelected: false,
          lunchSelected: false,
          dinnerSelected: false,
          sourceType: 'COPIED',
        },
      });
      copiedCount++;
      continue;
    }

    // Find previous day declaration (or latest prior declaration)
    let prevDecl = await db.mealDeclaration.findUnique({
      where: {
        uq_user_declaration_date: {
          userId: user.id,
          declarationDate: prevDeclDate,
        },
      },
    });

    if (!prevDecl || (prevDecl.sourceType === 'COPIED' && !prevDecl.breakfastSelected && !prevDecl.lunchSelected && !prevDecl.dinnerSelected)) {
      // Find latest prior declaration with active choices or manual selection
      const priorActive = await db.mealDeclaration.findFirst({
        where: {
          userId: user.id,
          declarationDate: { lt: declDate },
          OR: [
            { breakfastSelected: true },
            { lunchSelected: true },
            { dinnerSelected: true },
            { sourceType: 'MANUAL' },
            { sourceType: 'ADMIN_OVERRIDE' },
          ],
        },
        orderBy: { declarationDate: 'desc' },
      });
      if (priorActive) {
        prevDecl = priorActive;
      }
    }

    let targetB = prevDecl ? prevDecl.breakfastSelected : true;
    let targetL = prevDecl ? prevDecl.lunchSelected : true;
    let targetD = prevDecl ? prevDecl.dinnerSelected : true;

    // Force off if globally off
    if (globalStatus.breakfast === false) targetB = false;
    if (globalStatus.lunch === false) targetL = false;
    if (globalStatus.dinner === false) targetD = false;

    // Calculate cost and wallet constraint
    const effectiveRates = await resolveMealPricing(targetDateStr, user.userType, db);
    const bCost = targetB ? effectiveRates.breakfast : 0;
    const lCost = targetL ? effectiveRates.lunch : 0;
    const dCost = targetD ? effectiveRates.dinner : 0;

    let wallet = user.wallet;
    if (!wallet) {
      wallet = await db.wallet.create({
        data: { userId: user.id, currentBalance: 0 },
      });
    }

    const currentBal = Number(wallet.currentBalance);

    // Wallet balance guard: if money is running out (currentBal < total mealCost), auto turn OFF all meals today
    let finalB = targetB;
    let finalL = targetL;
    let finalD = targetD;
    let mealCost = bCost + lCost + dCost;

    if (mealCost > currentBal) {
      finalB = false;
      finalL = false;
      finalD = false;
      mealCost = 0;
    }

    let newBal = currentBal;

    if (mealCost > 0) {
      newBal = currentBal - mealCost;
      await db.wallet.update({
        where: { id: wallet.id },
        data: { currentBalance: newBal },
      });

      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: user.id,
          transactionType: 'MEAL_DEDUCTION',
          amount: mealCost,
          balanceBefore: currentBal,
          balanceAfter: newBal,
          referenceType: 'AUTO_COPY_DECLARATION',
          referenceId: wallet.id,
          note: `স্বয়ংক্রিয় কপি করা মিল ফি কর্তন (${targetDateStr})`,
        },
      });

      totalDeductedAmount += mealCost;
    }

    await db.mealDeclaration.create({
      data: {
        userId: user.id,
        declarationDate: declDate,
        breakfastSelected: finalB,
        lunchSelected: finalL,
        dinnerSelected: finalD,
        sourceType: 'COPIED',
      },
    });

    copiedCount++;
  }

  return { copiedCount, totalDeductedAmount };
}

/**
 * Restore Declarations On Emergency Off Algorithm:
 * When an emergency closure for dateStr is turned off by admin:
 * 1. Finds all active, approved, non-paused users.
 * 2. Finds their previous active declaration (before emergency stopped it).
 * 3. Restores their meal choices for dateStr with sourceType = 'COPIED'.
 * 4. Deducts meal cost from their wallet balance and logs MEAL_DEDUCTION transaction with note:
 *    `জরুরি অবস্থা প্রত্যাহার পরবর্তী মিল কর্তন (${dateStr})`.
 */
export async function restoreDeclarationsOnEmergencyOff(
  dateStr: string,
  txPrisma?: any
): Promise<{ restoredUsersCount: number; totalDeductedAmount: number }> {
  const db = txPrisma || defaultPrisma;
  const ratesConfig: SystemRates = await getSystemRatesFromDb(db);
  const declDate = parseDateToUtcMidday(dateStr);

  const activeUsers = await db.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      isIndefinitelyPaused: false,
      approvalStatus: 'APPROVED',
    },
    include: { wallet: true },
  });

  const globalStatus = ratesConfig.globalMealStatus || { breakfast: true, lunch: true, dinner: true };

  let restoredUsersCount = 0;
  let totalDeductedAmount = 0;

  for (const user of activeUsers) {
    // Find latest prior declaration before emergency date
    const prevDecl = await db.mealDeclaration.findFirst({
      where: {
        userId: user.id,
        declarationDate: { lt: declDate },
      },
      orderBy: { declarationDate: 'desc' },
    });

    let targetB = prevDecl ? prevDecl.breakfastSelected : true;
    let targetL = prevDecl ? prevDecl.lunchSelected : true;
    let targetD = prevDecl ? prevDecl.dinnerSelected : true;

    // Respect global off
    if (globalStatus.breakfast === false) targetB = false;
    if (globalStatus.lunch === false) targetL = false;
    if (globalStatus.dinner === false) targetD = false;

    const effectiveRates = await resolveMealPricing(dateStr, user.userType, db);
    const mealCost =
      (targetB ? effectiveRates.breakfast : 0) +
      (targetL ? effectiveRates.lunch : 0) +
      (targetD ? effectiveRates.dinner : 0);

    let wallet = user.wallet;
    if (!wallet) {
      wallet = await db.wallet.create({
        data: { userId: user.id, currentBalance: 0 },
      });
    }

    const currentBal = Number(wallet.currentBalance);
    let newBal = currentBal;

    if (mealCost > 0) {
      newBal = currentBal - mealCost;
      await db.wallet.update({
        where: { id: wallet.id },
        data: { currentBalance: newBal },
      });

      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: user.id,
          transactionType: 'MEAL_DEDUCTION',
          amount: mealCost,
          balanceBefore: currentBal,
          balanceAfter: newBal,
          referenceType: 'EMERGENCY_RESTORE_DEDUCTION',
          referenceId: wallet.id,
          note: `জরুরি অবস্থা প্রত্যাহার পরবর্তী মিল কর্তন (${dateStr})`,
        },
      });

      totalDeductedAmount += mealCost;
    }

    await db.mealDeclaration.upsert({
      where: {
        uq_user_declaration_date: {
          userId: user.id,
          declarationDate: declDate,
        },
      },
      update: {
        breakfastSelected: targetB,
        lunchSelected: targetL,
        dinnerSelected: targetD,
        sourceType: 'COPIED',
      },
      create: {
        userId: user.id,
        declarationDate: declDate,
        breakfastSelected: targetB,
        lunchSelected: targetL,
        dinnerSelected: targetD,
        sourceType: 'COPIED',
      },
    });

    restoredUsersCount++;
  }

  return { restoredUsersCount, totalDeductedAmount };
}


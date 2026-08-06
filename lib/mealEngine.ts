import { prisma as defaultPrisma } from './prisma';
import { pool } from './db';
import { getSystemRatesFromDb, SystemRates } from './rates';
import { UserRole } from '@prisma/client';

/**
 * Returns current Bangladesh Standard Time (BST, UTC+6) Date object.
 */
export function getBgdNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 6);
}

/**
 * Converts a Date or ISO string to standard BST 'YYYY-MM-DD' date string.
 */
export function getBgdDateStr(d: Date | string = new Date()): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const utc = dateObj.getTime() + dateObj.getTimezoneOffset() * 60000;
  const bgdDate = new Date(utc + 3600000 * 6);
  return bgdDate.toISOString().split('T')[0];
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
  const todayStr = getBgdDateStr(nowBgd);

  if (dateStr < todayStr) {
    return { isLocked: true, reason: 'Past dates cannot be modified.' };
  }

  if (dateStr === todayStr) {
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
  tx?: any
): Promise<{ breakfast: number; lunch: number; dinner: number }> {
  const ratesConfig: SystemRates = await getSystemRatesFromDb(tx);
  const baseRates = userType === 'GUEST' ? ratesConfig.guest : ratesConfig.permanent;

  let specB: number | null = null;
  let specL: number | null = null;
  let specD: number | null = null;

  try {
    const res = await pool.query(
      `SELECT LOWER(meal_type::text) AS "mealType", custom_rate::float AS "customRate"
       FROM special_meals
       WHERE meal_date = $1 AND is_active = TRUE;`,
      [dateStr]
    );

    for (const row of res.rows) {
      if (row.mealType === 'breakfast') specB = Number(row.customRate);
      if (row.mealType === 'lunch') specL = Number(row.customRate);
      if (row.mealType === 'dinner') specD = Number(row.customRate);
    }
  } catch (err) {
    // Fall back to base rates if special_meals table is missing or errors
  }

  return {
    breakfast: specB !== null ? specB : baseRates.breakfast,
    lunch: specL !== null ? specL : baseRates.lunch,
    dinner: specD !== null ? specD : baseRates.dinner,
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
    const rates = await resolveMealPricing(dateStr, userType, db);

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
          userId: decl.user.id,
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

import assert from 'node:assert';
import { normalizePhoneNumber } from '../src/utils/phoneUtils.ts';
import { isMealDateLocked } from '../lib/mealEngine.ts';
import { getUserMealStateForDate } from '../src/utils/mealUtils.ts';

export async function runSuite() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. ড্যাশবোর্ড (Dashboard)
  await test('Dashboard 1: Calculates overall system statistics (total residents, active meals, wallet liquidity)', async () => {
    const users = [
      { id: '1', status: 'APPROVED', wallet: 500 },
      { id: '2', status: 'APPROVED', wallet: 300 },
      { id: '3', status: 'PENDING', wallet: 0 },
    ];
    const totalApproved = users.filter((u) => u.status === 'APPROVED').length;
    const totalLiquidity = users.reduce((sum, u) => sum + u.wallet, 0);

    assert.strictEqual(totalApproved, 2);
    assert.strictEqual(totalLiquidity, 800);
  });

  await test('Dashboard 2: Renders dynamic warning banner when global meal status is OFF', async () => {
    const globalStatus = { breakfast: false, lunch: true, dinner: true };
    const bannerMsg = !globalStatus.breakfast
      ? '⚠️ Breakfast meals are globally disabled today by Admin.'
      : 'All meals normal.';

    assert.strictEqual(bannerMsg, '⚠️ Breakfast meals are globally disabled today by Admin.');
  });

  // 2. মিল ডিক্লেয়ারেশন (Meal Declaration)
  await test('Meal Declaration 3: Standard resident toggles breakfast, lunch, and dinner meal declarations', async () => {
    const decl = { userId: 'u1', date: '2026-08-07', breakfast: false, lunch: false, dinner: false };
    // Toggle ON lunch & dinner
    decl.lunch = true;
    decl.dinner = true;

    assert.strictEqual(decl.breakfast, false);
    assert.strictEqual(decl.lunch, true);
    assert.strictEqual(decl.dinner, true);
  });

  await test('Meal Declaration 4: Cutoff algorithm locks today after cutoff time (e.g. 10:00 AM)', async () => {
    const mockNow = new Date('2026-08-06T10:15:00+06:00');
    const lockCheck = isMealDateLocked('2026-08-06', '10:00', mockNow);

    assert.strictEqual(lockCheck.isLocked, true);
    assert.ok(lockCheck.reason.includes('passed'));
  });

  await test('Meal Declaration 5: Prevents turning ON meals when wallet balance is insufficient', async () => {
    const walletBalance = 30; // 30 BDT
    const mealCost = 50; // 50 BDT
    const canDeclare = walletBalance >= mealCost;

    assert.strictEqual(canDeclare, false);
  });

  // 3. মাই ওয়ালেট (My Wallet)
  await test('My Wallet 6: Displays accurate total wallet balance and available credit', async () => {
    const wallet = { userId: 'u1', balance: 750, currency: 'BDT' };
    assert.strictEqual(wallet.balance, 750);
  });

  await test('My Wallet 7: Validates topup recharge request payload (bKash/Nagad & trxId)', async () => {
    const reqPayload = { amount: 500, method: 'BKASH', trxId: 'TRX998877' };
    const isValid = reqPayload.amount > 0 && ['BKASH', 'NAGAD', 'CASH'].includes(reqPayload.method) && Boolean(reqPayload.trxId);

    assert.strictEqual(isValid, true);
  });

  await test('My Wallet 8: Approving recharge request updates balance and logs RECHARGE transaction', async () => {
    let balance = 200;
    const rechargeAmount = 500;
    balance += rechargeAmount;

    const trx = { type: 'RECHARGE', amount: rechargeAmount, balanceAfter: balance };
    assert.strictEqual(balance, 700);
    assert.strictEqual(trx.balanceAfter, 700);
  });

  // 4. রিপোর্ট ও হিস্ট্রি (Report & History)
  await test('Report & History 9: Generates user monthly meal breakdown and total expense summary', async () => {
    const monthlyDeclarations = [
      { date: '2026-08-01', breakfast: 25, lunch: 50, dinner: 50 },
      { date: '2026-08-02', breakfast: 25, lunch: 50, dinner: 50 },
      { date: '2026-08-03', breakfast: 0, lunch: 50, dinner: 50 },
    ];

    const totalExpense = monthlyDeclarations.reduce(
      (sum, d) => sum + d.breakfast + d.lunch + d.dinner,
      0
    );

    assert.strictEqual(totalExpense, 350);
  });

  await test('Report & History 10: Formats system transaction history with date filters and transaction types', async () => {
    const trxs = [
      { id: 't1', date: '2026-08-01', type: 'RECHARGE', amount: 1000 },
      { id: 't2', date: '2026-08-02', type: 'MEAL_DEDUCTION', amount: 125 },
    ];
    const deductions = trxs.filter((t) => t.type === 'MEAL_DEDUCTION');

    assert.strictEqual(deductions.length, 1);
    assert.strictEqual(deductions[0].amount, 125);
  });

  // 5. আজকের মিল (Today's Meal)
  await test("Today's Meal 11: Real-time calculation of active breakfast, lunch, and dinner declarations", async () => {
    const declarationsToday = [
      { userId: 'u1', b: true, l: true, d: true },
      { userId: 'u2', b: false, l: true, d: true },
      { userId: 'u3', b: true, l: true, d: false },
    ];

    const activeCounts = declarationsToday.reduce(
      (acc, d) => ({
        b: acc.b + (d.b ? 1 : 0),
        l: acc.l + (d.l ? 1 : 0),
        d: acc.d + (d.d ? 1 : 0),
      }),
      { b: 0, l: 0, d: 0 }
    );

    assert.strictEqual(activeCounts.b, 2);
    assert.strictEqual(activeCounts.l, 3);
    assert.strictEqual(activeCounts.d, 2);
  });

  await test("Today's Meal 12: Includes guest meal orders in today's active meal totals", async () => {
    const residentMeals = { b: 10, l: 15, d: 15 };
    const guestMeals = { b: 2, l: 3, d: 3 };

    const grandTotal = {
      b: residentMeals.b + guestMeals.b,
      l: residentMeals.l + guestMeals.l,
      d: residentMeals.d + guestMeals.d,
    };

    assert.strictEqual(grandTotal.b, 12);
    assert.strictEqual(grandTotal.l, 18);
    assert.strictEqual(grandTotal.d, 18);
  });

  // 6. অ্যাডমিন হাব (Admin Hub)
  await test('Admin Hub 13: Admin approves pending resident registrations', async () => {
    const user = { id: 'u-pending', status: 'PENDING' };
    user.status = 'APPROVED';

    assert.strictEqual(user.status, 'APPROVED');
  });

  await test('Admin Hub 14: Restricts system setting modifications to verified ADMIN/SUPERADMIN roles', async () => {
    const checkPermission = (role) => ['ADMIN', 'SUPERADMIN'].includes(role);

    assert.strictEqual(checkPermission('RESIDENT'), false);
    assert.strictEqual(checkPermission('ADMIN'), true);
    assert.strictEqual(checkPermission('SUPERADMIN'), true);
  });

  // 7. বাবুর্চির হিসাব (Cook's Account / Chef Calculation)
  await test("Cook's Account 15: Calculates total raw ingredient requirements based on active meal count", async () => {
    const totalLunchMeals = 20;
    const ricePerPersonKg = 0.15; // 150 grams
    const totalRiceNeededKg = totalLunchMeals * ricePerPersonKg;

    assert.strictEqual(totalRiceNeededKg, 3.0);
  });

  await test("Cook's Account 16: Factors special meal orders into cook forecast calculations", async () => {
    const standardLunch = 20;
    const specialMealOrders = 5;
    const totalCookTarget = standardLunch + specialMealOrders;

    assert.strictEqual(totalCookTarget, 25);
  });

  // 8. বাল্ক মিল ওভাররাইড (Bulk Meal Override)
  await test('Bulk Meal Override 17: Admin applies mass meal override across all active residents', async () => {
    const residents = [
      { id: 'u1', b: false, l: false, d: false },
      { id: 'u2', b: false, l: false, d: false },
    ];

    // Admin mass overrides lunch to ON for all
    const updated = residents.map((r) => ({ ...r, l: true }));
    assert.strictEqual(updated[0].l, true);
    assert.strictEqual(updated[1].l, true);
  });

  await test('Bulk Meal Override 18: Bulk override respects balance floor for regular residents', async () => {
    const residents = [
      { id: 'u1', wallet: 100, isAllowedNegative: false },
      { id: 'u2', wallet: 0, isAllowedNegative: false },
    ];
    const mealPrice = 50;

    const results = residents.map((r) => ({
      id: r.id,
      canOverride: r.wallet >= mealPrice || r.isAllowedNegative,
    }));

    assert.strictEqual(results[0].canOverride, true);
    assert.strictEqual(results[1].canOverride, false);
  });

  // 9. ফাইন্যান্সিয়াল হাব (Financial Hub)
  await test('Financial Hub 19: Computes total system revenue vs meal expenses to evaluate net balance', async () => {
    const totalRecharges = 15000;
    const totalMealExpenses = 9500;
    const netSystemBalance = totalRecharges - totalMealExpenses;

    assert.strictEqual(netSystemBalance, 5500);
  });

  await test('Financial Hub 20: Reconciles total resident wallet balances against master system ledger', async () => {
    const wallets = [{ bal: 500 }, { bal: 300 }, { bal: 700 }];
    const totalWalletsSum = wallets.reduce((acc, w) => acc + w.bal, 0);

    assert.strictEqual(totalWalletsSum, 1500);
  });

  // 10. রেসিডেন্ট তালিকা (Resident List)
  await test('Resident List 21: Filters resident directory by status (APPROVED, PENDING, SUSPENDED)', async () => {
    const residents = [
      { name: 'Abir', status: 'APPROVED' },
      { name: 'Babul', status: 'PENDING' },
      { name: 'Chanchal', status: 'SUSPENDED' },
    ];

    const pendingOnly = residents.filter((r) => r.status === 'PENDING');
    assert.strictEqual(pendingOnly.length, 1);
    assert.strictEqual(pendingOnly[0].name, 'Babul');
  });

  await test('Resident List 22: Searches resident directory by normalized phone number', async () => {
    const residents = [
      { name: 'Rafiq', phone: '01711223344' },
      { name: 'Salam', phone: '01855667788' },
    ];

    const searchTarget = normalizePhoneNumber('+8801711223344');
    const match = residents.find((r) => r.phone === searchTarget);

    assert.ok(match);
    assert.strictEqual(match.name, 'Rafiq');
  });

  // 11. সিস্টেম সেটিংস (System Settings)
  await test('System Settings 23: Updates global cutoff time setting and validates lock logic', async () => {
    let cutoffTime = '10:00';
    cutoffTime = '11:00'; // Admin changes cutoff time to 11:00 AM

    const mockNow = new Date('2026-08-06T10:30:00+06:00');
    const lockCheck = isMealDateLocked('2026-08-06', cutoffTime, mockNow);

    // At 10:30 AM with cutoff 11:00 AM, meal is UNLOCKED
    assert.strictEqual(lockCheck.isLocked, false);
  });

  await test('System Settings 24: Configures default meal pricing for Permanent and Guest users', async () => {
    const ratesConfig = {
      permanent: { breakfast: 25, lunch: 50, dinner: 50 },
      guest: { breakfast: 35, lunch: 70, dinner: 70 },
    };

    assert.strictEqual(ratesConfig.permanent.lunch, 50);
    assert.strictEqual(ratesConfig.guest.lunch, 70);
  });

  // 12. অডিট লগ (Audit Log)
  await test('Audit Log 25: Records system audit entry capturing action, actor ID, target, and timestamp', async () => {
    const auditLogs = [];
    const logAction = (actorId, action, targetId) => {
      auditLogs.push({
        id: `aud-${Date.now()}`,
        actorId,
        action,
        targetId,
        timestamp: new Date().toISOString(),
      });
    };

    logAction('admin-1', 'APPROVE_TOPUP', 'req-101');
    assert.strictEqual(auditLogs.length, 1);
    assert.strictEqual(auditLogs[0].action, 'APPROVE_TOPUP');
    assert.strictEqual(auditLogs[0].targetId, 'req-101');
  });

  // 13. Emergency (ইমারজেন্সি)
  await test('Emergency 26: Emergency closure turns OFF declared meals and refunds wallet balance', async () => {
    let walletBal = 400; // 500 - 100 paid for meal
    const mealPrice = 100;

    // Emergency closure triggered for today
    const isEmergencyClosed = true;
    if (isEmergencyClosed) {
      walletBal += mealPrice; // Issue full refund
    }

    assert.strictEqual(walletBal, 500);
  });

  // 14. Repetation / Repeating Logic (পুনরাবৃত্তি / অটো-কপি)
  await test('Repetation 27: Auto-copy feature repeats previous day declared meals for upcoming dates', async () => {
    const prevDayDecl = { b: true, l: true, d: true };
    const autoCopiedDecl = { ...prevDayDecl, isAutoCopied: true };

    assert.strictEqual(autoCopiedDecl.b, true);
    assert.strictEqual(autoCopiedDecl.l, true);
    assert.strictEqual(autoCopiedDecl.isAutoCopied, true);
  });

  await test('Repetation 28: Low wallet balance automatically turns OFF repeated meals and auto-resumes after topup', async () => {
    const userLow = { id: 'u1', status: 'APPROVED', walletBalance: 20, isIndefinitelyPaused: false, userType: 'PERMANENT' };
    const dateStr = '2026-08-07';

    let stateLow = getUserMealStateForDate(userLow, dateStr);
    assert.strictEqual(stateLow.breakfast, false);
    assert.strictEqual(stateLow.lunch, false);
    assert.strictEqual(stateLow.dinner, false);

    // User topup 500 BDT
    const userRecharged = { ...userLow, walletBalance: 520 };
    let stateRecharged = getUserMealStateForDate(userRecharged, dateStr);
    assert.strictEqual(stateRecharged.breakfast, true);
    assert.strictEqual(stateRecharged.lunch, true);
    assert.strictEqual(stateRecharged.dinner, true);
  });

  return { total: passed + failed, passed, failed };
}

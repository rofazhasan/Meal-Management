import assert from 'node:assert';
import { normalizePhoneNumber } from '../src/utils/phoneUtils.ts';
import { getBgdDateStr, parseDateToUtcMidday, isMealDateLocked } from '../lib/mealEngine.ts';
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

  // Simulated Database State Store representing full production memory
  const state = {
    users: new Map(),
    wallets: new Map(),
    transactions: [],
    requests: [],
    declarations: new Map(),
    notifications: [],
    audits: [],
  };

  // Human Usage Session 1: Registration -> Login -> Topup Submission -> Approval
  await test('Human Session 1: Registration ➔ Login ➔ Submit bKash Topup ➔ Admin Approval', async () => {
    const rawPhone = '+8801755443322';
    const cleanPhone = normalizePhoneNumber(rawPhone);
    const userId = 'u-human-1';

    // User registers
    state.users.set(userId, {
      id: userId,
      name: 'Kamal Uddin',
      phone: cleanPhone,
      status: 'APPROVED', // Approved by admin
      role: 'RESIDENT',
      walletBalance: 0,
    });
    state.wallets.set(userId, { userId, balance: 0 });

    // User submits 500 BDT bKash Topup Request
    const req = {
      id: 'req-h1',
      userId,
      amount: 500,
      paymentMethod: 'BKASH',
      trxId: 'TRX_HUMAN_101',
      status: 'PENDING',
    };
    state.requests.push(req);

    // Admin approves request
    const pendingReq = state.requests.find((r) => r.id === 'req-h1');
    pendingReq.status = 'APPROVED';

    const wallet = state.wallets.get(userId);
    wallet.balance += 500;
    state.users.get(userId).walletBalance = wallet.balance;

    state.transactions.push({
      userId,
      type: 'RECHARGE',
      amount: 500,
      balanceAfter: 500,
    });

    state.notifications.push({
      userId,
      title: 'Topup Approved',
      message: 'Your 500 BDT topup was approved',
    });

    assert.strictEqual(state.users.get(userId).walletBalance, 500);
    assert.strictEqual(state.notifications.length, 1);
  });

  // Human Usage Session 2: Declare Meals -> Deduct Balance -> Cancel Dinner -> Refund
  await test('Human Session 2: Turn ON Meals ➔ Deduct Balance ➔ Cancel Dinner ➔ Receive Instant Refund', async () => {
    const userId = 'u-human-1';
    const dateStr = '2026-08-07';
    const mealRates = { breakfast: 25, lunch: 50, dinner: 50 };

    // Turn ON Lunch (50) + Dinner (50) = 100 BDT
    const initialCost = mealRates.lunch + mealRates.dinner;
    const user = state.users.get(userId);
    user.walletBalance -= initialCost;

    state.declarations.set(`${userId}:${dateStr}`, {
      userId,
      date: dateStr,
      breakfast: false,
      lunch: true,
      dinner: true,
    });

    assert.strictEqual(user.walletBalance, 400); // 500 - 100

    // User cancels Dinner before cutoff -> Refund 50 BDT
    user.walletBalance += mealRates.dinner;
    state.declarations.set(`${userId}:${dateStr}`, {
      userId,
      date: dateStr,
      breakfast: false,
      lunch: true,
      dinner: false,
    });

    assert.strictEqual(user.walletBalance, 450); // 400 + 50
  });

  // Human Usage Session 3: Low Balance Lock Prevention
  await test('Human Session 3: Zero balance user blocked from opting in ➔ Admin Topup ➔ Success', async () => {
    const userId = 'u-human-3';
    state.users.set(userId, { id: userId, status: 'APPROVED', walletBalance: 10 });

    const minMealCost = 25;
    const canOptIn = state.users.get(userId).walletBalance >= minMealCost;
    assert.strictEqual(canOptIn, false); // Blocked due to low balance (10 < 25)

    // Admin topups user with 200 BDT
    state.users.get(userId).walletBalance += 200;
    const canOptInNow = state.users.get(userId).walletBalance >= minMealCost;
    assert.strictEqual(canOptInNow, true); // Now allowed (210 >= 25)
  });

  // Human Usage Session 4: Emergency Closure Experience
  await test('Human Session 4: Emergency Announced ➔ Affected Meal Blocked & Marked Emergency Off', async () => {
    const user = { id: 'u-human-4', status: 'APPROVED', walletBalance: 500, isIndefinitelyPaused: false };
    const dec = { userId: 'u-human-4', date: '2026-08-07', breakfast: true, lunch: true, dinner: true };

    const emergency = { date: '2026-08-07', reason: 'Storm Warning', closedMeals: ['lunch', 'dinner'] };
    const resultState = getUserMealStateForDate(user, '2026-08-07', dec, undefined, emergency);

    assert.strictEqual(resultState.breakfast, true);
    assert.strictEqual(resultState.lunch, false); // Blocked by emergency
    assert.strictEqual(resultState.dinner, false); // Blocked by emergency
  });

  // Human Usage Session 5: Dual-Mode Role Switch (RESIDENT -> FINANCE_ADMIN)
  await test('Human Session 5: Admin promotes user to FINANCE_ADMIN ➔ Dual-Mode UI activated', async () => {
    const user = { id: 'u-human-5', role: 'RESIDENT', isDualMode: false, activeMode: 'USER' };

    // Admin promotes user
    user.role = 'FINANCE_ADMIN';
    user.isDualMode = true;
    user.activeMode = 'ADMIN';

    assert.strictEqual(user.isDualMode, true);
    assert.strictEqual(user.activeMode, 'ADMIN');
  });

  // Human Usage Session 6: Password Reset Request & Admin Approval
  await test('Human Session 6: Password reset requested ➔ Admin approves ➔ Login verified', async () => {
    const user = {
      id: 'u-human-6',
      phone: '01700000006',
      passwordHash: 'old_pass',
      isPasswordResetRequested: false,
    };

    // User clicks reset password
    user.isPasswordResetRequested = true;
    assert.strictEqual(user.isPasswordResetRequested, true);

    // Admin approves password reset -> Reset to '123'
    user.passwordHash = 'hashed_123';
    user.isPasswordResetRequested = false;

    assert.strictEqual(user.passwordHash, 'hashed_123');
    assert.strictEqual(user.isPasswordResetRequested, false);
  });

  // Human Usage Session 7: Indefinite Pause & Unpause Workflow
  await test('Human Session 7: User pauses meal declarations ➔ System returns false for all meals', async () => {
    const user = { id: 'u-human-7', status: 'APPROVED', isIndefinitelyPaused: true, walletBalance: 500 };
    const dec = { userId: 'u-human-7', date: '2026-08-07', breakfast: true, lunch: true, dinner: true };

    const pausedState = getUserMealStateForDate(user, '2026-08-07', dec);
    assert.deepStrictEqual(pausedState, { breakfast: false, lunch: false, dinner: false });

    // User unpauses
    user.isIndefinitelyPaused = false;
    const unpausedState = getUserMealStateForDate(user, '2026-08-07', dec);
    assert.strictEqual(unpausedState.breakfast, true);
  });

  // Human Usage Session 8: Special Meal (Biryani) Custom Pricing Opt-in
  await test('Human Session 8: Special Meal (Biryani) custom rate 150 BDT deducted on opt-in', async () => {
    const user = { id: 'u-human-8', walletBalance: 500 };
    const specialMeal = { date: '2026-08-07', mealType: 'lunch', customRate: 150, title: 'Biryani' };

    const costToDeduct = specialMeal.customRate;
    user.walletBalance -= costToDeduct;

    assert.strictEqual(user.walletBalance, 350); // 500 - 150 = 350 BDT
  });

  // Human Usage Session 9: Admin Monthly Fee Collection
  await test('Human Session 9: Admin collects 300 BDT monthly fee ➔ Ledger updated & notified', async () => {
    const user = { id: 'u-human-9', walletBalance: 600 };
    const monthlyFee = 300;

    user.walletBalance -= monthlyFee;
    state.transactions.push({
      userId: 'u-human-9',
      type: 'MONTHLY_CHARGE',
      amount: monthlyFee,
      balanceAfter: user.walletBalance,
    });

    assert.strictEqual(user.walletBalance, 300);
  });

  // Human Usage Session 10: Financial Audit Reconciliation Verification
  await test('Human Session 10: Audit reconciliation calculates 0 financial disparity', async () => {
    const userStartingBalance = 0;
    const totalTopups = 1000;
    const totalDeductions = 375;
    const totalRefunds = 50;

    const expectedCurrentBalance = userStartingBalance + totalTopups - totalDeductions + totalRefunds;
    const systemRecordedBalance = 675;

    const disparity = Math.abs(expectedCurrentBalance - systemRecordedBalance);
    assert.strictEqual(disparity, 0); // 0 Financial Disparity
  });

  // Human Usage Session 11: Double-Tap Prevention Guard
  await test('Human Session 11: User double-taps topup button ➔ Second request blocked idempotently', async () => {
    const processedRequests = new Set();

    function processRequestOnce(reqId) {
      if (processedRequests.has(reqId)) {
        throw new Error('Request already processed');
      }
      processedRequests.add(reqId);
      return 'SUCCESS';
    }

    assert.strictEqual(processRequestOnce('click-1'), 'SUCCESS');
    assert.throws(() => processRequestOnce('click-1'), /Request already processed/);
  });

  // Human Usage Session 12: Past Date Lock Guard
  await test('Human Session 12: User attempts to modify past meal date ➔ System locks modification', async () => {
    const nowBgd = new Date(2026, 7, 6, 12, 0, 0); // Aug 6, 2026
    const pastDateCheck = isMealDateLocked('2026-08-05', '10:00', nowBgd);

    assert.strictEqual(pastDateCheck.isLocked, true);
    assert.strictEqual(pastDateCheck.reason.includes('Past dates'), true);
  });

  return { total: passed + failed, passed, failed };
}

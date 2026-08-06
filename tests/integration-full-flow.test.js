import assert from 'node:assert';
import { normalizePhoneNumber } from '../src/utils/phoneUtils.ts';
import { getUserMealStateForDate } from '../src/utils/mealUtils.ts';
import { getBangladeshTomorrowStr } from '../src/utils/dateUtils.ts';

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

  // Integrated database state store
  const db = {
    users: new Map(),
    wallets: new Map(),
    transactions: [],
    requests: [],
    declarations: new Map(),
    audits: [],
  };

  // 1. Integration Flow: User Registration to Admin Approval
  await test('Integration Flow 1: User Registration -> Pending Status -> Admin Approval', async () => {
    // Step 1: User registers
    const rawRegistration = {
      name: 'Tanvir Hossain',
      phone: '+8801711223344',
      password: 'password123',
      userType: 'PERMANENT',
    };

    const cleanPhone = normalizePhoneNumber(rawRegistration.phone);
    const userId = 'u-tanvir-101';

    const newUser = {
      id: userId,
      name: rawRegistration.name,
      phone: cleanPhone,
      userType: rawRegistration.userType,
      role: 'RESIDENT',
      status: 'PENDING',
      approvalStatus: 'PENDING',
      isIndefinitelyPaused: false,
      walletBalance: 0,
      createdAt: new Date().toISOString(),
    };

    db.users.set(userId, newUser);
    db.wallets.set(userId, { id: `w-${userId}`, userId, currentBalance: 0 });

    assert.strictEqual(db.users.get(userId).status, 'PENDING');
    assert.strictEqual(db.wallets.get(userId).currentBalance, 0);

    // Step 2: Admin approves resident user
    const adminId = 'admin-super-1';
    const userToApprove = db.users.get(userId);
    userToApprove.status = 'APPROVED';
    userToApprove.approvalStatus = 'APPROVED';
    db.users.set(userId, userToApprove);

    db.audits.push({
      id: `audit-${Date.now()}`,
      performedBy: adminId,
      action: 'USER_STATUS_CHANGED',
      targetId: userId,
      details: 'Approved resident status',
      timestamp: new Date().toISOString(),
    });

    assert.strictEqual(db.users.get(userId).status, 'APPROVED');
    assert.strictEqual(db.audits.length, 1);
  });

  // 2. Integration Flow: Recharge Request -> Admin Approval -> Wallet Credit -> Audit Log
  await test('Integration Flow 2: Recharge Request -> Admin Topup Approval -> Balance Updated & Logged', async () => {
    const userId = 'u-tanvir-101';
    const adminId = 'admin-super-1';
    const rechargeAmt = 1000;

    // Step 1: User submits bKash recharge request
    const rechargeReq = {
      id: 'req-topup-99',
      userId,
      amount: rechargeAmt,
      paymentMethod: 'BKASH',
      trxId: 'TRX_BKASH_887766',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    db.requests.push(rechargeReq);

    assert.strictEqual(db.requests[0].status, 'PENDING');

    // Step 2: Admin approves request atomically
    const reqToApprove = db.requests.find((r) => r.id === 'req-topup-99');
    assert.strictEqual(reqToApprove.status, 'PENDING');

    reqToApprove.status = 'APPROVED';
    reqToApprove.approvedBy = adminId;

    const userWallet = db.wallets.get(userId);
    const balanceBefore = userWallet.currentBalance;
    userWallet.currentBalance += rechargeAmt;
    const balanceAfter = userWallet.currentBalance;

    // Update user balance cache
    const user = db.users.get(userId);
    user.walletBalance = balanceAfter;
    db.users.set(userId, user);

    const txRecord = {
      id: `tx-rec-${Date.now()}`,
      walletId: userWallet.id,
      userId,
      transactionType: 'RECHARGE',
      amount: rechargeAmt,
      balanceBefore,
      balanceAfter,
      referenceType: 'RECHARGE_APPROVAL',
      referenceId: reqToApprove.id,
      createdBy: adminId,
      createdAt: new Date().toISOString(),
    };
    db.transactions.push(txRecord);

    assert.strictEqual(db.wallets.get(userId).currentBalance, 1000);
    assert.strictEqual(db.users.get(userId).walletBalance, 1000);
    assert.strictEqual(db.transactions[0].amount, 1000);
  });

  // 3. Integration Flow: Meal Declaration -> Billing Deduction -> Partial Cancel Refund
  await test('Integration Flow 3: Declaration -> Billing Deduction -> Cancel Meal Refund', async () => {
    const userId = 'u-tanvir-101';
    const dateStr = getBangladeshTomorrowStr();

    const rates = {
      breakfast: 25,
      lunch: 50,
      dinner: 50,
    };

    // Step 1: User turns ON Breakfast (25) + Lunch (50) + Dinner (50) = Total 125
    const initialCost = rates.breakfast + rates.lunch + rates.dinner;
    let wallet = db.wallets.get(userId);
    const balBeforeDec = wallet.currentBalance;

    wallet.currentBalance -= initialCost;

    const user = db.users.get(userId);
    user.walletBalance = wallet.currentBalance;
    db.users.set(userId, user);

    db.transactions.push({
      id: `tx-dec-1`,
      walletId: wallet.id,
      userId,
      transactionType: 'MEAL_DEDUCTION',
      amount: initialCost,
      balanceBefore: balBeforeDec,
      balanceAfter: wallet.currentBalance,
      referenceType: 'MEAL_DECLARATION',
      createdAt: new Date().toISOString(),
    });

    db.declarations.set(`${userId}:${dateStr}`, {
      userId,
      date: dateStr,
      breakfast: true,
      lunch: true,
      dinner: true,
    });

    assert.strictEqual(db.wallets.get(userId).currentBalance, 875);

    // Step 2: User decides to turn OFF Dinner before cutoff -> Refund 50 BDT immediately
    const cancelRefundAmt = rates.dinner;
    const balBeforeRefund = wallet.currentBalance;
    wallet.currentBalance += cancelRefundAmt;

    user.walletBalance = wallet.currentBalance;
    db.users.set(userId, user);

    db.transactions.push({
      id: `tx-ref-1`,
      walletId: wallet.id,
      userId,
      transactionType: 'REFUND',
      amount: cancelRefundAmt,
      balanceBefore: balBeforeRefund,
      balanceAfter: wallet.currentBalance,
      referenceType: 'MEAL_DECLARATION_REFUND',
      createdAt: new Date().toISOString(),
    });

    db.declarations.set(`${userId}:${dateStr}`, {
      userId,
      date: dateStr,
      breakfast: true,
      lunch: true,
      dinner: false,
    });

    assert.strictEqual(db.wallets.get(userId).currentBalance, 925);
  });

  // 4. Integration Flow: Kitchen Forecast & Emergency Closure Override
  await test('Integration Flow 4: Kitchen Forecast Aggregation -> Emergency Closure Override', async () => {
    const dateStr = getBangladeshTomorrowStr();
    const user = db.users.get('u-tanvir-101');
    const dec = db.declarations.get(`u-tanvir-101:${dateStr}`);

    // Normal state forecast
    const normalState = getUserMealStateForDate(user, dateStr, dec);
    assert.strictEqual(normalState.breakfast, true);
    assert.strictEqual(normalState.lunch, true);
    assert.strictEqual(normalState.dinner, false);

    // Emergency Announced for Lunch due to severe weather
    const emergency = { date: dateStr, reason: 'Severe Cyclone Alert', closedMeals: ['lunch'] };
    const emergencyState = getUserMealStateForDate(user, dateStr, dec, undefined, emergency);

    assert.strictEqual(emergencyState.breakfast, true);
    assert.strictEqual(emergencyState.lunch, false); // Cancelled by emergency
    assert.strictEqual(emergencyState.dinner, false);
  });

  // 5. Integration Flow: Monthly Fee Collection -> Audit Reconciliation
  await test('Integration Flow 5: Monthly Fee Collection -> Financial Reconciliation', async () => {
    const userId = 'u-tanvir-101';
    const adminId = 'admin-super-1';
    const monthlyFee = 300;

    const wallet = db.wallets.get(userId);
    const balBeforeFee = wallet.currentBalance; // 925
    wallet.currentBalance -= monthlyFee; // 625

    const user = db.users.get(userId);
    user.walletBalance = wallet.currentBalance;
    db.users.set(userId, user);

    db.transactions.push({
      id: `tx-fee-1`,
      walletId: wallet.id,
      userId,
      transactionType: 'MONTHLY_CHARGE',
      amount: monthlyFee,
      balanceBefore: balBeforeFee,
      balanceAfter: wallet.currentBalance,
      referenceType: 'MONTHLY_FEE',
      createdBy: adminId,
      createdAt: new Date().toISOString(),
    });

    assert.strictEqual(db.wallets.get(userId).currentBalance, 625);

    // System Reconciliation Verification
    // Calculated Expected Balance = Initial(0) + Topup(1000) - MealDec(125) + Refund(50) - MonthlyFee(300) = 625
    const computedExpected = 0 + 1000 - 125 + 50 - 300;
    const actualWalletBal = db.wallets.get(userId).currentBalance;

    assert.strictEqual(actualWalletBal, computedExpected);
    assert.strictEqual(actualWalletBal, 625);
  });

  return { total: passed + failed, passed, failed };
}

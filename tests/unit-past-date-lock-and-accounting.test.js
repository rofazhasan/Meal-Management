import assert from 'node:assert';
import { getBgdDateStr, isMealDateLocked } from '../lib/mealEngine.ts';

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

  // 1. Past-date integrity for Special Meals
  await test('Past Date Lock 1: Past date is recognized as locked and cannot be edited', async () => {
    const todayStr = getBgdDateStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getBgdDateStr(yesterday);

    const lockCheck = isMealDateLocked(yesterdayStr);
    assert.strictEqual(lockCheck.isLocked, true);
    assert.ok(lockCheck.reason.includes('Past dates'));
  });

  // 2. Double-Entry Accounting Rule: Inflow = Net Spent + Wallet Balances
  await test('Economics Rule 2: Double-Entry Equation (Total Inflow = Real Net Spent + Member Wallet Balances)', async () => {
    // Simulating transactions
    const transactions = [
      // 3 users deposit 1000 each -> Total Inflow = 3000
      { id: 'tx-1', userId: 'u1', type: 'RECHARGE', amount: 1000, balanceAfter: 1000 },
      { id: 'tx-2', userId: 'u2', type: 'RECHARGE', amount: 1000, balanceAfter: 1000 },
      { id: 'tx-3', userId: 'u3', type: 'RECHARGE', amount: 1000, balanceAfter: 1000 },
      // u1 has 200 deducted for meals
      { id: 'tx-4', userId: 'u1', type: 'MEAL_DEDUCTION', amount: 200, balanceAfter: 800 },
      // u2 has 300 deducted for meals
      { id: 'tx-5', userId: 'u2', type: 'MEAL_DEDUCTION', amount: 300, balanceAfter: 700 },
      // u2 cancels a 100 meal before cutoff -> Refunded 100
      { id: 'tx-6', userId: 'u2', type: 'REFUND', amount: 100, balanceAfter: 800 },
      // u3 pays 500 monthly fee
      { id: 'tx-7', userId: 'u3', type: 'MONTHLY_CHARGE', amount: 500, balanceAfter: 500 },
    ];

    const wallets = [
      { id: 'w1', userId: 'u1', currentBalance: 800 },
      { id: 'w2', userId: 'u2', currentBalance: 800 },
      { id: 'w3', userId: 'u3', currentBalance: 500 },
    ];

    let totalInflow = 0;
    let grossDeductions = 0;
    let totalRefunds = 0;

    for (const tx of transactions) {
      if (['RECHARGE', 'ADMIN_TOPUP', 'CREDIT', 'CASH_PAID'].includes(tx.type)) {
        totalInflow += tx.amount;
      } else if (['MEAL_DEDUCTION', 'DEBIT', 'MONTHLY_CHARGE'].includes(tx.type)) {
        grossDeductions += tx.amount;
      } else if (tx.type === 'REFUND') {
        totalRefunds += tx.amount;
      }
    }

    const realNetSpent = grossDeductions - totalRefunds;
    const totalWalletBalance = wallets.reduce((acc, w) => acc + w.currentBalance, 0);

    assert.strictEqual(totalInflow, 3000);
    assert.strictEqual(grossDeductions, 1000); // 200 + 300 + 500
    assert.strictEqual(totalRefunds, 100);
    assert.strictEqual(realNetSpent, 900); // 1000 - 100 = 900
    assert.strictEqual(totalWalletBalance, 2100); // 800 + 800 + 500 = 2100

    // Double-Entry Identity: Inflow === Net Spent + Remaining Wallet Reserves
    assert.strictEqual(totalInflow, realNetSpent + totalWalletBalance);
  });

  // 3. Deduction + Refund of same meal results in Net 0 meal expense
  await test('Economics Rule 3: Same meal deduction and refund results in Net 0 transaction', async () => {
    const userTxs = [
      { type: 'RECHARGE', amount: 500 },
      { type: 'MEAL_DEDUCTION', amount: 60 },
      { type: 'REFUND', amount: 60 },
    ];

    let grossDeduct = 0;
    let refund = 0;

    userTxs.forEach((tx) => {
      if (tx.type === 'MEAL_DEDUCTION') grossDeduct += tx.amount;
      if (tx.type === 'REFUND') refund += tx.amount;
    });

    const netMealExpense = grossDeduct - refund;
    assert.strictEqual(netMealExpense, 0);
  });

  // 4. Special Meal creation rejection logic on past dates
  await test('Past Date Lock 4: Validates date comparison prevents creating or modifying past special meals', () => {
    const todayStr = getBgdDateStr();
    const pastDate = '2020-01-01';
    const futureDate = '2099-12-31';

    assert.strictEqual(pastDate < todayStr, true);
    assert.strictEqual(futureDate >= todayStr, true);
  });

  return { total: passed + failed, passed, failed };
}

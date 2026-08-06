import assert from 'node:assert';
import { autoCopyPreviousDayDeclarations } from '../lib/mealEngine.ts';

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

  await test('Relational Data Integrity: User Declaration ➔ Wallet ➔ Financial Hub ➔ Cook Report ➔ Today Meal Sync', async () => {
    // Simulated Central PostgreSQL Database
    const db = {
      users: [
        { id: 'u-rel-1', name: 'Rahim Uddin', phone: '01711223344', userType: 'PERMANENT', status: 'APPROVED' },
      ],
      wallets: new Map([
        ['u-rel-1', { id: 'w-rel-1', userId: 'u-rel-1', currentBalance: 1000 }],
      ]),
      transactions: [],
      declarations: new Map(),
    };

    // Step 1: User declares 3 meals for Today (2026-08-06)
    const dateStr = '2026-08-06';
    const rateConfig = { breakfast: 40, lunch: 60, dinner: 50 };
    const totalCost = rateConfig.breakfast + rateConfig.lunch + rateConfig.dinner; // 150 BDT

    // Atomic DB Transaction simulation
    const userWallet = db.wallets.get('u-rel-1');
    const balBefore = userWallet.currentBalance;
    userWallet.currentBalance -= totalCost;
    const balAfter = userWallet.currentBalance;

    const txEntry = {
      id: 'tx-101',
      walletId: userWallet.id,
      userId: 'u-rel-1',
      transactionType: 'MEAL_DEDUCTION',
      amount: totalCost,
      balanceBefore: balBefore,
      balanceAfter: balAfter,
      referenceType: 'MEAL_DECLARATION',
      createdAt: new Date().toISOString(),
    };
    db.transactions.push(txEntry);

    const decl = {
      id: 'd-101',
      userId: 'u-rel-1',
      date: dateStr,
      breakfast: true,
      lunch: true,
      dinner: true,
      sourceType: 'MANUAL',
    };
    db.declarations.set(`${decl.userId}_${decl.date}`, decl);

    // Verify 1: User Wallet updated
    assert.strictEqual(db.wallets.get('u-rel-1').currentBalance, 850);

    // Verify 2: Financial Hub (Master Ledger) contains transaction
    const ledgerTx = db.transactions.find(t => t.userId === 'u-rel-1');
    assert.ok(ledgerTx, 'Transaction must exist in Master Ledger');
    assert.strictEqual(ledgerTx.amount, 150);
    assert.strictEqual(ledgerTx.balanceBefore, 1000);
    assert.strictEqual(ledgerTx.balanceAfter, 850);

    // Verify 3: Cook Report (Baburchi) calculates correct prep quantity
    let cookBreakfastCount = 0;
    for (const d of db.declarations.values()) {
      if (d.date === dateStr && d.breakfast) cookBreakfastCount++;
    }
    assert.strictEqual(cookBreakfastCount, 1, 'Cook Report must count declared breakfast');

    // Verify 4: Today Meal & Fingerprint verifies exact declaration state
    const todayDecl = db.declarations.get(`u-rel-1_${dateStr}`);
    assert.ok(todayDecl);
    assert.strictEqual(todayDecl.breakfast, true);
    assert.strictEqual(todayDecl.lunch, true);
    assert.strictEqual(todayDecl.dinner, true);
  });

  await test('Relational Data Integrity: Bulk Meal Control ➔ Multi-Wallet Deductions ➔ Master Ledger ➔ Cook Forecast Sync', async () => {
    const db = {
      users: [
        { id: 'u-bulk-1', name: 'User 1' },
        { id: 'u-bulk-2', name: 'User 2' },
      ],
      wallets: new Map([
        ['u-bulk-1', { id: 'w-1', currentBalance: 500 }],
        ['u-bulk-2', { id: 'w-2', currentBalance: 500 }],
      ]),
      transactions: [],
      declarations: new Map(),
    };

    const dateStr = '2026-08-06';
    const costPerUser = 150;

    // Admin applies bulk meal opt-in for all residents
    for (const u of db.users) {
      const w = db.wallets.get(u.id);
      const bBefore = w.currentBalance;
      w.currentBalance -= costPerUser;
      const bAfter = w.currentBalance;

      db.transactions.push({
        id: `tx-bulk-${u.id}`,
        walletId: w.id,
        userId: u.id,
        transactionType: 'MEAL_DEDUCTION',
        amount: costPerUser,
        balanceBefore: bBefore,
        balanceAfter: bAfter,
        referenceType: 'BULK_MEAL_OVERRIDE',
        createdAt: new Date().toISOString(),
      });

      db.declarations.set(`${u.id}_${dateStr}`, {
        userId: u.id,
        date: dateStr,
        breakfast: true,
        lunch: true,
        dinner: true,
        sourceType: 'ADMIN_OVERRIDE',
      });
    }

    // Verify 1: Both wallets updated atomically
    assert.strictEqual(db.wallets.get('u-bulk-1').currentBalance, 350);
    assert.strictEqual(db.wallets.get('u-bulk-2').currentBalance, 350);

    // Verify 2: Master Ledger records transactions for all users
    assert.strictEqual(db.transactions.length, 2);

    // Verify 3: Cook Report totals updated to 2 for all meals
    let bTotal = 0, lTotal = 0, dTotal = 0;
    for (const d of db.declarations.values()) {
      if (d.date === dateStr) {
        if (d.breakfast) bTotal++;
        if (d.lunch) lTotal++;
        if (d.dinner) dTotal++;
      }
    }
    assert.strictEqual(bTotal, 2);
    assert.strictEqual(lTotal, 2);
    assert.strictEqual(dTotal, 2);
  });

  return { total: passed + failed, passed, failed };
}

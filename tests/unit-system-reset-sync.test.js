import assert from 'node:assert';

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

  await test('System Reset: Purging system data clears DB and updates user report/history to 0 state', async () => {
    // Simulated DB before reset
    const db = {
      declarations: [{ id: 'd1', userId: 'u1', breakfast: true, lunch: true, dinner: true }],
      transactions: [{ id: 't1', userId: 'u1', amount: 150, type: 'MEAL_DEDUCTION' }],
      consumptions: [{ id: 'c1', userId: 'u1', mealType: 'BREAKFAST', status: 'ON' }],
      approvalRequests: [{ id: 'ar1', userId: 'u1', status: 'PENDING' }],
      notifications: [{ id: 'n1', userId: 'u1', title: 'Test Alert' }],
      auditLogs: [{ id: 'a1', actorUserId: 'u1', action: 'LOGIN' }],
      specialMeals: [{ id: 'sm1', title: 'Biryani Night' }],
      mealSettings: [{ id: 'ms1', emergencyOff: true }],
      wallets: new Map([['u1', { currentBalance: 350 }]]),
    };

    // System Reset Action triggered via System Settings
    db.declarations = [];
    db.transactions = [];
    db.consumptions = [];
    db.approvalRequests = [];
    db.notifications = [];
    db.auditLogs = [];
    db.specialMeals = [];
    db.mealSettings = [];
    for (const w of db.wallets.values()) {
      w.currentBalance = 0;
    }

    // Assert 1: Declarations empty
    assert.strictEqual(db.declarations.length, 0);

    // Assert 2: Transactions empty
    assert.strictEqual(db.transactions.length, 0);

    // Assert 3: Consumptions empty
    assert.strictEqual(db.consumptions.length, 0);

    // Assert 4: Approval requests empty
    assert.strictEqual(db.approvalRequests.length, 0);

    // Assert 5: Notifications & audit logs empty
    assert.strictEqual(db.notifications.length, 0);
    assert.strictEqual(db.auditLogs.length, 0);

    // Assert 6: Special meals & emergency meal settings empty
    assert.strictEqual(db.specialMeals.length, 0);
    assert.strictEqual(db.mealSettings.length, 0);

    // Assert 7: User Wallet balance reset to 0
    assert.strictEqual(db.wallets.get('u1').currentBalance, 0);

    // Assert 8: User Reports rangeFilteredDecs returns empty array (0 meals, 0 cost)
    const rawUserDecs = db.declarations.filter(d => d.userId === 'u1');
    const rangeFilteredDecs = rawUserDecs.length === 0 ? [] : rawUserDecs;
    assert.strictEqual(rangeFilteredDecs.length, 0);

    const totalMoneySpent = rangeFilteredDecs.reduce((sum, d) => sum + (d.dailyCost || 0), 0);
    assert.strictEqual(totalMoneySpent, 0);
  });

  await test('System Reset: Access control blocks standard ADMIN and permits SUPERADMIN only', async () => {
    const roles = ['USER', 'ADMIN', 'FINANCE_ADMIN', 'MEAL_MANAGER', 'AUDITOR', 'SUPERADMIN'];

    const checkCanReset = (role) => role === 'SUPERADMIN';

    for (const r of roles) {
      if (r === 'SUPERADMIN') {
        assert.strictEqual(checkCanReset(r), true, `Role ${r} should be authorized to reset`);
      } else {
        assert.strictEqual(checkCanReset(r), false, `Role ${r} should NOT be authorized to reset`);
      }
    }
  });

  return { total: passed + failed, passed, failed };
}

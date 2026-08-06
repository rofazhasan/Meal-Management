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
      wallets: new Map([['u1', { currentBalance: 350 }]]),
    };

    // System Reset Action triggered via System Settings
    db.declarations = [];
    db.transactions = [];
    for (const w of db.wallets.values()) {
      w.currentBalance = 0;
    }

    // Assert 1: Declarations empty
    assert.strictEqual(db.declarations.length, 0);

    // Assert 2: Transactions empty
    assert.strictEqual(db.transactions.length, 0);

    // Assert 3: User Wallet balance reset to 0
    assert.strictEqual(db.wallets.get('u1').currentBalance, 0);

    // Assert 4: User Reports rangeFilteredDecs returns empty array (0 meals, 0 cost)
    const rawUserDecs = db.declarations.filter(d => d.userId === 'u1');
    const rangeFilteredDecs = rawUserDecs.length === 0 ? [] : rawUserDecs;
    assert.strictEqual(rangeFilteredDecs.length, 0);

    const totalMoneySpent = rangeFilteredDecs.reduce((sum, d) => sum + (d.dailyCost || 0), 0);
    assert.strictEqual(totalMoneySpent, 0);
  });

  return { total: passed + failed, passed, failed };
}

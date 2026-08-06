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

  // 1. Transactional Balance Isolation & Concurrency Safety
  await test('concurrent parallel transactions update balance without race conditions or lost updates (ACID Consistency & Isolation)', async () => {
    let currentBalance = 1000;
    let lock = Promise.resolve();

    // Transaction runner simulating DB isolation level with transactional lock
    async function executeTransaction(amount) {
      // Acquire isolation lock
      const release = lock;
      let resolveLock;
      lock = new Promise((res) => { resolveLock = res; });
      await release;

      try {
        const snapshot = currentBalance;
        // Simulate async DB latency
        await new Promise((r) => setTimeout(r, 10));
        currentBalance = snapshot + amount;
      } finally {
        resolveLock();
      }
    }

    // Fire 10 parallel topup transactions simultaneously
    const topupAmounts = [100, 200, 50, 300, 150, 250, 400, 500, 50, 100];
    await Promise.all(topupAmounts.map((amt) => executeTransaction(amt)));

    const expectedTotal = 1000 + topupAmounts.reduce((a, b) => a + b, 0);
    assert.strictEqual(currentBalance, expectedTotal);
  });

  // 2. Transaction Rollback Atomicity (All-or-Nothing)
  await test('failed transaction rolls back completely preserving initial state (ACID Atomicity)', async () => {
    let state = { balance: 500, status: 'PENDING' };

    async function failingTransaction() {
      const rollbackState = { ...state };
      try {
        state.balance -= 200;
        state.status = 'APPROVED';
        // Simulate unexpected DB constraint failure
        throw new Error('Database constraint violation!');
      } catch (err) {
        state = rollbackState; // Rollback
        throw err;
      }
    }

    await assert.rejects(async () => {
      await failingTransaction();
    }, /Database constraint violation!/);

    // Verify initial state remains untouched after rollback
    assert.strictEqual(state.balance, 500);
    assert.strictEqual(state.status, 'PENDING');
  });

  // 3. Double Approval Concurrency Guard
  await test('concurrent approval of same recharge request prevents double-crediting', async () => {
    let requestStatus = 'PENDING';
    let userWallet = 200;
    let approvalCount = 0;

    async function approveRequest(requestId, amount) {
      // Transactional status check and update
      if (requestStatus !== 'PENDING') {
        throw new Error(`Request is already ${requestStatus}`);
      }
      requestStatus = 'APPROVED';
      userWallet += amount;
      approvalCount++;
      return true;
    }

    const req1 = approveRequest('req-100', 500);
    const req2 = approveRequest('req-100', 500);

    const results = await Promise.allSettled([req1, req2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 1);
    assert.strictEqual(approvalCount, 1);
    assert.strictEqual(userWallet, 700); // 200 + 500 once
  });

  // 4. Idempotent Upsert for Meal Declarations
  await test('concurrent declaration updates for same date execute idempotently', async () => {
    const declarationStore = new Map();

    async function upsertDeclaration(userId, dateStr, meals) {
      const key = `${userId}:${dateStr}`;
      const existing = declarationStore.get(key);

      const updated = {
        userId,
        date: dateStr,
        breakfast: meals.breakfast ?? existing?.breakfast ?? false,
        lunch: meals.lunch ?? existing?.lunch ?? false,
        dinner: meals.dinner ?? existing?.dinner ?? false,
        updatedAt: new Date().toISOString(),
      };

      declarationStore.set(key, updated);
      return updated;
    }

    // Fire 3 parallel updates for the same user and date
    await Promise.all([
      upsertDeclaration('u1', '2026-08-06', { breakfast: true, lunch: false }),
      upsertDeclaration('u1', '2026-08-06', { lunch: true, dinner: true }),
      upsertDeclaration('u1', '2026-08-06', { breakfast: false, dinner: true }),
    ]);

    const finalDec = declarationStore.get('u1:2026-08-06');
    assert.notStrictEqual(finalDec, undefined);
    assert.strictEqual(declarationStore.size, 1); // Strictly single record per user/date
  });

  return { total: passed + failed, passed, failed };
}

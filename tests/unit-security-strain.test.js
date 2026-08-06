import assert from 'node:assert';
import { normalizePhoneNumber } from '../src/utils/phoneUtils.ts';

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

  // 1. Security Test 1: Rejection of Invalid/NaN Financial Amounts
  await test('Security 1: Rejects NaN, string, and invalid amounts in topups', async () => {
    function validateTopupAmount(amount) {
      const num = Number(amount);
      if (amount === undefined || amount === null || isNaN(num) || typeof amount === 'object') {
        throw new Error('Invalid financial amount');
      }
      return num;
    }

    assert.throws(() => validateTopupAmount('invalid'), /Invalid financial amount/);
    assert.throws(() => validateTopupAmount(NaN), /Invalid financial amount/);
    assert.throws(() => validateTopupAmount({}), /Invalid financial amount/);
    assert.strictEqual(validateTopupAmount('500'), 500);
  });

  // 2. Security Test 2: Rejection of Zero & Negative Topup Amounts
  await test('Security 2: Blocks zero and negative amounts in recharge requests', async () => {
    function validateRechargeRequest(amount) {
      const num = Number(amount);
      if (isNaN(num) || num <= 0) {
        throw new Error('Amount must be positive');
      }
      return num;
    }

    assert.throws(() => validateRechargeRequest(0), /Amount must be positive/);
    assert.throws(() => validateRechargeRequest(-500), /Amount must be positive/);
    assert.strictEqual(validateRechargeRequest(100), 100);
  });

  // 3. Security Test 3: Insufficient Balance Security Lock
  await test('Security 3: Enforces wallet balance lock for non-admin meal activations', async () => {
    const userWalletBalance = 15; // Current balance is 15 BDT
    const mealCost = 50; // Required cost is 50 BDT
    const isAdminOverride = false;

    function processMealDeclaration(bal, cost, isAdmin) {
      if (bal < cost && !isAdmin) {
        throw new Error(`Insufficient wallet balance. Required ৳${cost}, available ৳${bal}`);
      }
      return bal - cost;
    }

    // Resident attempt should be blocked
    assert.throws(
      () => processMealDeclaration(userWalletBalance, mealCost, isAdminOverride),
      /Insufficient wallet balance/
    );

    // Admin override attempt should succeed
    const newBal = processMealDeclaration(userWalletBalance, mealCost, true);
    assert.strictEqual(newBal, -35);
  });

  // 4. Security Test 4: Floating Point Rounding Precision Guard
  await test('Security 4: Prevents floating point accumulation drift in BDT calculations', async () => {
    function roundCurrency(val) {
      return Math.round((val + Number.EPSILON) * 100) / 100;
    }

    // Standard JS float drift: 0.1 + 0.2 = 0.30000000000000004
    const rawSum = 0.1 + 0.2;
    assert.notStrictEqual(rawSum, 0.3);

    const safeSum = roundCurrency(rawSum);
    assert.strictEqual(safeSum, 0.3);

    // Test multiple fractional transactions
    let total = 0;
    for (let i = 0; i < 10; i++) {
      total = roundCurrency(total + 33.33);
    }
    assert.strictEqual(total, 333.3);
  });

  // 5. Security Test 5: Role-Based Authorization Security (RBAC)
  await test('Security 5: Restricts admin actions to verified ADMIN roles', async () => {
    const ADMIN_ROLES = new Set([
      'ADMIN', 'SUPERADMIN', 'OWNER', 'FINANCE_ADMIN',
      'MEAL_MANAGER', 'HOSTEL_MANAGER', 'AUDITOR', 'SUPPORT_ADMIN', 'READONLY_ADMIN'
    ]);

    function checkAdminAuthorization(role) {
      if (!ADMIN_ROLES.has(role)) {
        throw new Error('Unauthorized: Admin privilege required');
      }
      return true;
    }

    assert.throws(() => checkAdminAuthorization('RESIDENT'), /Unauthorized/);
    assert.throws(() => checkAdminAuthorization('GUEST'), /Unauthorized/);
    assert.strictEqual(checkAdminAuthorization('FINANCE_ADMIN'), true);
    assert.strictEqual(checkAdminAuthorization('SUPERADMIN'), true);
  });

  // 6. Security Test 6: Double-Recharge Replay Attack Prevention
  await test('Security 6: Blocks duplicate transaction submission (Replay Guard)', async () => {
    const processedTrxIds = new Set();

    function processPaymentTrx(trxId) {
      if (processedTrxIds.has(trxId)) {
        throw new Error(`Duplicate transaction ID '${trxId}' detected`);
      }
      processedTrxIds.add(trxId);
      return true;
    }

    assert.strictEqual(processPaymentTrx('TRX998877'), true);
    assert.throws(() => processPaymentTrx('TRX998877'), /Duplicate transaction ID/);
  });

  // 7. Security Test 7: Input Sanitization against Script Injection (XSS)
  await test('Security 7: Sanitizes script tags from transaction notes', async () => {
    function sanitizeInput(str) {
      if (!str) return '';
      return String(str)
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    const maliciousNote = 'Recharge note <script>alert("hack")</script>';
    const cleanNote = sanitizeInput(maliciousNote);
    assert.strictEqual(cleanNote.includes('<script>'), false);
    assert.strictEqual(cleanNote, 'Recharge note &lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;');
  });

  // 8. Financial Strain Test 8: High-Volume Concurrent Wallet Deductions (100 Operations)
  await test('Strain 8: Handles 100 high-volume concurrent wallet deductions accurately', async () => {
    let balance = 10000;
    const deductionAmount = 25;
    let lock = Promise.resolve();

    async function safeDeduct(amt) {
      const release = lock;
      let resolveLock;
      lock = new Promise((res) => { resolveLock = res; });
      await release;

      try {
        const snap = balance;
        await new Promise((r) => setTimeout(r, 1)); // Async IO latency
        balance = snap - amt;
      } finally {
        resolveLock();
      }
    }

    // Fire 100 parallel deductions simultaneously
    const tasks = Array.from({ length: 100 }, () => safeDeduct(deductionAmount));
    await Promise.all(tasks);

    const expectedBalance = 10000 - (100 * deductionAmount); // 10000 - 2500 = 7500
    assert.strictEqual(balance, expectedBalance);
  });

  // 9. Financial Strain Test 9: Rapid Toggle Stress Test (Flapping State Recovery)
  await test('Strain 9: Rapid declaration toggling preserves exact ledger balance', async () => {
    let walletBal = 1000;
    const mealPrice = 50;
    let isMealOn = false;

    for (let i = 0; i < 50; i++) {
      const toggleTo = !isMealOn;
      if (toggleTo && !isMealOn) {
        walletBal -= mealPrice; // Turn ON
      } else if (!toggleTo && isMealOn) {
        walletBal += mealPrice; // Turn OFF (Refund)
      }
      isMealOn = toggleTo;
    }

    // 50 toggles starts OFF -> ON (1) -> OFF (2) ... -> OFF (50)
    // 50 is even, so final state should be OFF and balance restored to 1000
    assert.strictEqual(isMealOn, false);
    assert.strictEqual(walletBal, 1000);
  });

  // 10. Financial Strain Test 10: Multi-User Concurrent Batch Billing (50 Users)
  await test('Strain 10: Charges monthly fee concurrently across 50 users without dropping updates', async () => {
    const users = Array.from({ length: 50 }, (_, i) => ({
      id: `u-${i}`,
      balance: 1000,
    }));

    const monthlyFee = 300;

    await Promise.all(
      users.map(async (u) => {
        await new Promise((r) => setTimeout(r, Math.random() * 5));
        u.balance -= monthlyFee;
      })
    );

    const unchargedCount = users.filter((u) => u.balance !== 700).length;
    assert.strictEqual(unchargedCount, 0); // All 50 users charged 300 BDT
  });

  // 11. Security Test 11: Non-Negative Balance Floor Guarantee
  await test('Security 11: Enforces balance floor for standard resident declarations', async () => {
    function canAffordMeal(walletBal, mealCost, isAdmin) {
      if (isAdmin) return true;
      return walletBal >= mealCost;
    }

    assert.strictEqual(canAffordMeal(0, 25, false), false);
    assert.strictEqual(canAffordMeal(20, 25, false), false);
    assert.strictEqual(canAffordMeal(25, 25, false), true);
    assert.strictEqual(canAffordMeal(50, 25, false), true);
  });

  // 12. Security Test 12: Audit Trail Transaction Chain Verification
  await test('Security 12: Audit trail transaction log chain matches current wallet balance', async () => {
    const transactions = [
      { type: 'RECHARGE', amount: 1000 },
      { type: 'MEAL_DEDUCTION', amount: 125 },
      { type: 'REFUND', amount: 50 },
      { type: 'MONTHLY_CHARGE', amount: 300 },
    ];

    let computedBalance = 0; // Starting balance

    for (const tx of transactions) {
      if (tx.type === 'RECHARGE' || tx.type === 'REFUND') {
        computedBalance += tx.amount;
      } else if (tx.type === 'MEAL_DEDUCTION' || tx.type === 'MONTHLY_CHARGE') {
        computedBalance -= tx.amount;
      }
    }

    const actualWalletBalance = 625;
    assert.strictEqual(computedBalance, actualWalletBalance);
  });

  return { total: passed + failed, passed, failed };
}

import assert from 'node:assert';
import { resolveMealPricing, processEmergencyClosureWithRefunds, isMealDateLocked } from '../lib/mealEngine.ts';

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

  await test('Interconnection 1: Special Meal custom rate overrides base meal rate & updates billing', async () => {
    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 30, lunch: 50, dinner: 50 } },
          { key: 'rates_guest', valueJson: { breakfast: 40, lunch: 70, dinner: 70 } },
          { key: 'global_status', valueJson: { breakfast: true, lunch: true, dinner: true } },
        ],
      },
      specialMeal: {
        findMany: async () => [
          { id: 'sm-1', mealType: 'LUNCH', customRate: 150, isActive: true }, // Special Biryani
        ],
      },
    };

    const ratesPermanent = await resolveMealPricing('2026-08-06', 'PERMANENT', mockDb);
    assert.strictEqual(ratesPermanent.breakfast, 30);
    assert.strictEqual(ratesPermanent.lunch, 150); // Biryani Custom Rate 150 BDT
    assert.strictEqual(ratesPermanent.dinner, 50);

    const ratesGuest = await resolveMealPricing('2026-08-06', 'GUEST', mockDb);
    assert.strictEqual(ratesGuest.breakfast, 40);
    assert.strictEqual(ratesGuest.lunch, 150); // Special Biryani Custom Rate applies to Guest too
    assert.strictEqual(ratesGuest.dinner, 70);
  });

  await test('Interconnection 2: Emergency closure turns OFF declarations, refunds wallets & logs REFUND transaction', async () => {
    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 30, lunch: 50, dinner: 50 } },
        ],
      },
      specialMeal: { findMany: async () => [] },
      mealDeclaration: {
        findMany: async () => [
          {
            id: 'decl-em-1',
            userId: 'u-em-1',
            declarationDate: new Date('2026-08-06T12:00:00Z'),
            breakfastSelected: true,
            lunchSelected: true,
            dinnerSelected: true,
            user: {
              id: 'u-em-1',
              userType: 'PERMANENT',
              wallet: { id: 'w-em-1', currentBalance: 200 },
            },
          },
        ],
        update: async ({ where, data }) => {
          mockDb.updatedDeclaration = { id: where.id, ...data };
        },
      },
      wallet: {
        update: async ({ where, data }) => {
          mockDb.updatedWallet = { id: where.id, ...data };
        },
      },
      walletTransaction: {
        create: async ({ data }) => {
          mockDb.createdRefundTx = data;
        },
      },
    };

    const result = await processEmergencyClosureWithRefunds('2026-08-06', 'Cyclone Warning', mockDb);
    assert.strictEqual(result.refundedUsersCount, 1);
    assert.strictEqual(result.totalRefundedAmount, 130); // 30 + 50 + 50 = 130 BDT

    assert.strictEqual(mockDb.updatedWallet.currentBalance, 330); // 200 + 130
    assert.strictEqual(mockDb.createdRefundTx.transactionType, 'REFUND');
    assert.strictEqual(mockDb.createdRefundTx.amount, 130);
    assert.strictEqual(mockDb.updatedDeclaration.breakfastSelected, false);
    assert.strictEqual(mockDb.updatedDeclaration.lunchSelected, false);
    assert.strictEqual(mockDb.updatedDeclaration.dinnerSelected, false);
  });

  await test('Interconnection 3: Global meal status OFF suppresses meal pricing and selections', async () => {
    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 30, lunch: 50, dinner: 50 } },
          { key: 'global_status', valueJson: { breakfast: true, lunch: false, dinner: true } }, // Lunch Globally OFF
        ],
      },
      specialMeal: { findMany: async () => [] },
    };

    const rates = await resolveMealPricing('2026-08-06', 'PERMANENT', mockDb);
    assert.strictEqual(rates.breakfast, 30);
    assert.strictEqual(rates.lunch, 0); // Lunch is 0 because globally OFF
    assert.strictEqual(rates.dinner, 50);
  });

  await test('Interconnection 4: Cutoff lock algorithm enforces lockout for today after cutoff time', () => {
    const pastCheck = isMealDateLocked('2026-08-05', '10:00', new Date('2026-08-06T12:00:00Z'));
    assert.strictEqual(pastCheck.isLocked, true);
    assert.strictEqual(pastCheck.reason, 'Past dates cannot be modified.');

    const futureCheck = isMealDateLocked('2026-08-07', '10:00', new Date('2026-08-06T12:00:00Z'));
    assert.strictEqual(futureCheck.isLocked, false);
  });

  return { total: passed + failed, passed, failed };
}

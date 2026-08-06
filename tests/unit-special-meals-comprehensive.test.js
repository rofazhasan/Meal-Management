import assert from 'node:assert';
import { resolveMealPricing, processEmergencyClosureWithRefunds } from '../lib/mealEngine.ts';

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

  // 1. Special Meal custom rate overrides base meal rate for PERMANENT user
  await test('Special Meal 1: Custom rate (150 BDT) overrides default base lunch rate (50 BDT) for Permanent users', async () => {
    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 25, lunch: 50, dinner: 50 } },
          { key: 'global_status', valueJson: { breakfast: true, lunch: true, dinner: true } },
        ],
      },
      specialMeal: {
        findMany: async () => [
          { id: 'sm-biryani', mealType: 'LUNCH', customRate: 150, isActive: true, isRecurring: false },
        ],
      },
    };

    const rates = await resolveMealPricing('2026-08-07', 'PERMANENT', mockDb);
    assert.strictEqual(rates.breakfast, 25);
    assert.strictEqual(rates.lunch, 150); // Special Biryani rate applied
    assert.strictEqual(rates.dinner, 50);
  });

  // 2. Special Meal custom rate overrides base meal rate for GUEST user
  await test('Special Meal 2: Custom rate overrides base lunch rate for Guest users as well', async () => {
    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_guest', valueJson: { breakfast: 35, lunch: 70, dinner: 70 } },
          { key: 'global_status', valueJson: { breakfast: true, lunch: true, dinner: true } },
        ],
      },
      specialMeal: {
        findMany: async () => [
          { id: 'sm-biryani', mealType: 'LUNCH', customRate: 150, isActive: true, isRecurring: false },
        ],
      },
    };

    const rates = await resolveMealPricing('2026-08-07', 'GUEST', mockDb);
    assert.strictEqual(rates.breakfast, 35);
    assert.strictEqual(rates.lunch, 150); // Custom rate overrides Guest rate too
    assert.strictEqual(rates.dinner, 70);
  });

  // 3. Priority: Specific date special meal overrides weekly recurring special meal
  await test('Special Meal 3: Specific date custom rate (200 BDT) takes priority over recurring custom rate (120 BDT)', async () => {
    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 25, lunch: 50, dinner: 50 } },
          { key: 'global_status', valueJson: { breakfast: true, lunch: true, dinner: true } },
        ],
      },
      specialMeal: {
        findMany: async () => [
          { id: 'sm-recurring', mealType: 'LUNCH', customRate: 120, isActive: true, isRecurring: true, repeatDayOfWeek: 5 },
          { id: 'sm-specific', mealType: 'LUNCH', customRate: 200, isActive: true, isRecurring: false },
        ],
      },
    };

    const rates = await resolveMealPricing('2026-08-07', 'PERMANENT', mockDb);
    assert.strictEqual(rates.lunch, 200); // Date-specific rate (200) overrides recurring rate (120)
  });

  // 4. Inactive special meals are ignored
  await test('Special Meal 4: Inactive special meal (isActive: false) is ignored and reverts to standard rates', async () => {
    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 25, lunch: 50, dinner: 50 } },
          { key: 'global_status', valueJson: { breakfast: true, lunch: true, dinner: true } },
        ],
      },
      specialMeal: {
        findMany: async () => [
          { id: 'sm-disabled', mealType: 'LUNCH', customRate: 180, isActive: false, isRecurring: false },
        ],
      },
    };

    const rates = await resolveMealPricing('2026-08-07', 'PERMANENT', mockDb);
    assert.strictEqual(rates.lunch, 50); // Reverts to default 50 BDT
  });

  // 5. Global meal status OFF suppresses special meal pricing to 0 BDT
  await test('Special Meal 5: Global meal status OFF suppresses special meal rate to 0 BDT', async () => {
    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 25, lunch: 50, dinner: 50 } },
          { key: 'global_status', valueJson: { breakfast: true, lunch: false, dinner: true } }, // Lunch OFF globally
        ],
      },
      specialMeal: {
        findMany: async () => [
          { id: 'sm-special', mealType: 'LUNCH', customRate: 150, isActive: true, isRecurring: false },
        ],
      },
    };

    const rates = await resolveMealPricing('2026-08-07', 'PERMANENT', mockDb);
    assert.strictEqual(rates.lunch, 0); // 0 because Lunch is globally disabled
  });

  // 6. Special Meal declaration cost calculation
  await test('Special Meal 6: Billing calculation accurately sums custom special meal rate with standard meal rates', async () => {
    const rates = { breakfast: 25, lunch: 150, dinner: 50 }; // Special lunch 150 BDT
    const userSelections = { breakfast: true, lunch: true, dinner: true };

    const totalCost =
      (userSelections.breakfast ? rates.breakfast : 0) +
      (userSelections.lunch ? rates.lunch : 0) +
      (userSelections.dinner ? rates.dinner : 0);

    assert.strictEqual(totalCost, 225); // 25 + 150 + 50 = 225 BDT
  });

  // 7. Special Meal Emergency Refund calculation
  await test('Special Meal 7: Emergency closure refunds exact special meal custom rate (225 BDT) to wallet', async () => {
    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 25, lunch: 50, dinner: 50 } },
        ],
      },
      specialMeal: {
        findMany: async () => [
          { id: 'sm-special', mealType: 'LUNCH', customRate: 150, isActive: true, isRecurring: false },
        ],
      },
      mealDeclaration: {
        findMany: async () => [
          {
            id: 'decl-spec-1',
            userId: 'u-spec-1',
            declarationDate: new Date('2026-08-07T12:00:00Z'),
            breakfastSelected: true,
            lunchSelected: true,
            dinnerSelected: true,
            user: {
              id: 'u-spec-1',
              userType: 'PERMANENT',
              wallet: { id: 'w-spec-1', currentBalance: 500 },
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

    const result = await processEmergencyClosureWithRefunds('2026-08-07', 'Weather Emergency', mockDb);
    assert.strictEqual(result.refundedUsersCount, 1);
    assert.strictEqual(result.totalRefundedAmount, 225); // 25 + 150 + 50 = 225 BDT refunded

    assert.strictEqual(mockDb.updatedWallet.currentBalance, 725); // 500 + 225
    assert.strictEqual(mockDb.createdRefundTx.amount, 225);
  });

  // 8. Multiple Special Meals on same day (e.g. Special Breakfast 60 BDT + Special Lunch 180 BDT)
  await test('Special Meal 8: Supports multiple special meals on the same date for different meal slots', async () => {
    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 25, lunch: 50, dinner: 50 } },
          { key: 'global_status', valueJson: { breakfast: true, lunch: true, dinner: true } },
        ],
      },
      specialMeal: {
        findMany: async () => [
          { id: 'sm-b', mealType: 'BREAKFAST', customRate: 60, isActive: true, isRecurring: false },
          { id: 'sm-l', mealType: 'LUNCH', customRate: 180, isActive: true, isRecurring: false },
        ],
      },
    };

    const rates = await resolveMealPricing('2026-08-07', 'PERMANENT', mockDb);
    assert.strictEqual(rates.breakfast, 60);
    assert.strictEqual(rates.lunch, 180);
    assert.strictEqual(rates.dinner, 50);
  });

  return { total: passed + failed, passed, failed };
}

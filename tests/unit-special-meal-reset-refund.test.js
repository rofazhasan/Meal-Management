import assert from 'node:assert';
import { processSpecialMealCreationWithRefunds } from '../lib/mealEngine.ts';

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

  // 1. Test Targeted Slot Reset: Only LUNCH is turned OFF & refunded when Special Lunch is created
  await test('Targeted Special Meal Reset 1: Special Lunch creation turns OFF Lunch and refunds Lunch price, leaving Breakfast & Dinner ON', async () => {
    let updatedDecl = null;
    let updatedWallet = null;
    let createdTx = null;
    const upsertedConsumptions = [];

    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 25, lunch: 50, dinner: 50 } },
          { key: 'global_status', valueJson: { breakfast: true, lunch: true, dinner: true } },
        ],
      },
      specialMeal: { findMany: async () => [] },
      mealDeclaration: {
        findMany: async () => [
          {
            id: 'decl-user-1',
            userId: 'user-1',
            declarationDate: new Date('2026-08-07T12:00:00Z'),
            breakfastSelected: true,
            lunchSelected: true,
            dinnerSelected: true,
            user: {
              id: 'user-1',
              userType: 'PERMANENT',
              wallet: { id: 'wallet-1', userId: 'user-1', currentBalance: 300 },
            },
          },
        ],
        update: async ({ where, data }) => {
          updatedDecl = { id: where.id, ...data };
        },
      },
      wallet: {
        update: async ({ where, data }) => {
          updatedWallet = { id: where.id, ...data };
        },
      },
      walletTransaction: {
        create: async ({ data }) => {
          createdTx = data;
        },
      },
      mealConsumption: {
        upsert: async (args) => {
          upsertedConsumptions.push(args);
        },
      },
    };

    const res = await processSpecialMealCreationWithRefunds('2026-08-07', 'LUNCH', mockDb);

    assert.strictEqual(res.refundedUsersCount, 1);
    assert.strictEqual(res.totalRefundedAmount, 50); // Only Lunch cost (50 BDT) refunded

    // Wallet balance updated by 50 (from 300 to 350)
    assert.strictEqual(updatedWallet.currentBalance, 350);

    // Transaction created with REFUND type and reference SPECIAL_MEAL_RESET_REFUND
    assert.strictEqual(createdTx.transactionType, 'REFUND');
    assert.strictEqual(createdTx.amount, 50);
    assert.strictEqual(createdTx.referenceType, 'SPECIAL_MEAL_RESET_REFUND');

    // Declaration update check: lunchSelected turned false, breakfast & dinner NOT touched (undefined in update data)
    assert.strictEqual(updatedDecl.lunchSelected, false);
    assert.strictEqual(updatedDecl.breakfastSelected, undefined);
    assert.strictEqual(updatedDecl.dinnerSelected, undefined);

    // MealConsumption for LUNCH updated to OFF
    assert.strictEqual(upsertedConsumptions.length, 1);
    assert.strictEqual(upsertedConsumptions[0].where.uq_user_meal_date_type.mealType, 'LUNCH');
    assert.strictEqual(upsertedConsumptions[0].update.status, 'OFF');
  });

  // 2. Test No Active Meal in Targeted Slot: If user had Lunch OFF already, no refund or declaration change is triggered
  await test('Targeted Special Meal Reset 2: If Lunch was already OFF, no refund is performed', async () => {
    let walletUpdated = false;

    const mockDb = {
      systemConfig: {
        findMany: async () => [
          { key: 'rates_permanent', valueJson: { breakfast: 25, lunch: 50, dinner: 50 } },
        ],
      },
      specialMeal: { findMany: async () => [] },
      mealDeclaration: {
        findMany: async () => [
          {
            id: 'decl-user-2',
            userId: 'user-2',
            declarationDate: new Date('2026-08-07T12:00:00Z'),
            breakfastSelected: true,
            lunchSelected: false, // Already OFF
            dinnerSelected: true,
            user: {
              id: 'user-2',
              userType: 'PERMANENT',
              wallet: { id: 'wallet-2', userId: 'user-2', currentBalance: 300 },
            },
          },
        ],
      },
      wallet: {
        update: async () => { walletUpdated = true; },
      },
    };

    const res = await processSpecialMealCreationWithRefunds('2026-08-07', 'LUNCH', mockDb);
    assert.strictEqual(res.refundedUsersCount, 0);
    assert.strictEqual(res.totalRefundedAmount, 0);
    assert.strictEqual(walletUpdated, false);
  });

  return { total: passed + failed, passed, failed };
}

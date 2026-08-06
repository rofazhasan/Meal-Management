import assert from 'node:assert';
import { autoCopyPreviousDayDeclarations } from '../lib/mealEngine.ts';
import { prisma } from '../lib/prisma.ts';

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

  await test('Auto-copy: Copies previous day 3 meals when user has sufficient wallet balance', async () => {
    // Simulated mock database state
    const mockDb = createMockPrisma({
      users: [
        {
          id: 'u-sufficient-1',
          fullName: 'Sufficient User',
          userType: 'PERMANENT',
          isActive: true,
          isIndefinitelyPaused: false,
          approvalStatus: 'APPROVED',
          deletedAt: null,
          wallet: { id: 'w-1', userId: 'u-sufficient-1', currentBalance: 500 },
        },
      ],
      declarations: [
        {
          id: 'd-prev-1',
          userId: 'u-sufficient-1',
          declarationDate: new Date('2026-08-05T12:00:00Z'),
          breakfastSelected: true,
          lunchSelected: true,
          dinnerSelected: true,
          sourceType: 'MANUAL',
        },
      ],
      rates: {
        permanent: { breakfast: 30, lunch: 50, dinner: 45 },
        guest: { breakfast: 40, lunch: 70, dinner: 60 },
        globalMealStatus: { breakfast: true, lunch: true, dinner: true },
      },
    });

    const result = await autoCopyPreviousDayDeclarations('2026-08-06', mockDb);
    assert.strictEqual(result.copiedCount, 1);
    assert.strictEqual(result.totalDeductedAmount, 125); // 30 + 50 + 45 = 125

    const createdToday = mockDb.createdDeclarations.find(d => d.userId === 'u-sufficient-1');
    assert.ok(createdToday, 'Today declaration should be created');
    assert.strictEqual(createdToday.breakfastSelected, true);
    assert.strictEqual(createdToday.lunchSelected, true);
    assert.strictEqual(createdToday.dinnerSelected, true);
    assert.strictEqual(createdToday.sourceType, 'COPIED');
    assert.strictEqual(mockDb.updatedWallets['w-1'].currentBalance, 375); // 500 - 125
  });

  await test('Auto-copy: Auto turns OFF all meals when money is running out (currentBal < total meal cost)', async () => {
    // Simulated user with only 50 BDT balance, but 3 meals cost 125 BDT
    const mockDb = createMockPrisma({
      users: [
        {
          id: 'u-lowbal-1',
          fullName: 'Low Balance User',
          userType: 'PERMANENT',
          isActive: true,
          isIndefinitelyPaused: false,
          approvalStatus: 'APPROVED',
          deletedAt: null,
          wallet: { id: 'w-low-1', userId: 'u-lowbal-1', currentBalance: 50 },
        },
      ],
      declarations: [
        {
          id: 'd-prev-2',
          userId: 'u-lowbal-1',
          declarationDate: new Date('2026-08-05T12:00:00Z'),
          breakfastSelected: true,
          lunchSelected: true,
          dinnerSelected: true,
          sourceType: 'MANUAL',
        },
      ],
      rates: {
        permanent: { breakfast: 30, lunch: 50, dinner: 45 },
        guest: { breakfast: 40, lunch: 70, dinner: 60 },
        globalMealStatus: { breakfast: true, lunch: true, dinner: true },
      },
    });

    const result = await autoCopyPreviousDayDeclarations('2026-08-06', mockDb);
    assert.strictEqual(result.copiedCount, 1);
    assert.strictEqual(result.totalDeductedAmount, 0); // 0 deducted because meals auto turned OFF

    const createdToday = mockDb.createdDeclarations.find(d => d.userId === 'u-lowbal-1');
    assert.ok(createdToday, 'Today declaration should be created');
    assert.strictEqual(createdToday.breakfastSelected, false, 'Breakfast should auto turn OFF when money is running out');
    assert.strictEqual(createdToday.lunchSelected, false, 'Lunch should auto turn OFF when money is running out');
    assert.strictEqual(createdToday.dinnerSelected, false, 'Dinner should auto turn OFF when money is running out');
    assert.strictEqual(createdToday.sourceType, 'COPIED');
    assert.strictEqual(mockDb.updatedWallets['w-low-1'], undefined, 'Wallet should not be updated when cost is 0');
  });

  await test('Auto-copy: Auto resumes 3 meals after wallet topup following a low-balance auto-off', async () => {
    // User had Day 1 (3 meals), Day 2 (Auto OFF due to low balance 50 BDT), Day 3 (Recharged to 500 BDT)
    const mockDb = createMockPrisma({
      users: [
        {
          id: 'u-recharged-1',
          fullName: 'Recharged User',
          userType: 'PERMANENT',
          isActive: true,
          isIndefinitelyPaused: false,
          approvalStatus: 'APPROVED',
          deletedAt: null,
          wallet: { id: 'w-rec-1', userId: 'u-recharged-1', currentBalance: 500 },
        },
      ],
      declarations: [
        // Day 1: Manual 3 meals
        {
          id: 'd-day-1',
          userId: 'u-recharged-1',
          declarationDate: new Date('2026-08-05T12:00:00Z'),
          breakfastSelected: true,
          lunchSelected: true,
          dinnerSelected: true,
          sourceType: 'MANUAL',
        },
        // Day 2: Auto-copied OFF due to low balance
        {
          id: 'd-day-2',
          userId: 'u-recharged-1',
          declarationDate: new Date('2026-08-06T12:00:00Z'),
          breakfastSelected: false,
          lunchSelected: false,
          dinnerSelected: false,
          sourceType: 'COPIED',
        },
      ],
      rates: {
        permanent: { breakfast: 30, lunch: 50, dinner: 45 },
        guest: { breakfast: 40, lunch: 70, dinner: 60 },
        globalMealStatus: { breakfast: true, lunch: true, dinner: true },
      },
    });

    // Auto-copy for Day 3 (2026-08-07)
    const result = await autoCopyPreviousDayDeclarations('2026-08-07', mockDb);
    assert.strictEqual(result.copiedCount, 1);
    assert.strictEqual(result.totalDeductedAmount, 125);

    const createdDay3 = mockDb.createdDeclarations.find(d => d.userId === 'u-recharged-1');
    assert.ok(createdDay3);
    assert.strictEqual(createdDay3.breakfastSelected, true, 'Should resume 3 meals after wallet topup');
    assert.strictEqual(createdDay3.lunchSelected, true);
    assert.strictEqual(createdDay3.dinnerSelected, true);
    assert.strictEqual(mockDb.updatedWallets['w-rec-1'].currentBalance, 375); // 500 - 125
  });

  return { total: passed + failed, passed, failed };
}

// Helper to construct in-memory mock Prisma interface for testing meal engine algorithms
function createMockPrisma(initialData) {
  const users = [...initialData.users];
  const declarations = [...initialData.declarations];
  const rates = initialData.rates;

  const createdDeclarations = [];
  const createdTransactions = [];
  const updatedWallets = {};

  return {
    createdDeclarations,
    createdTransactions,
    updatedWallets,
    mealSetting: {
      findFirst: async () => null,
    },
    user: {
      findMany: async () => users,
    },
    systemConfig: {
      findMany: async () => [
        { key: 'rates_permanent', valueJson: rates.permanent },
        { key: 'rates_guest', valueJson: rates.guest },
        { key: 'global_status', valueJson: rates.globalMealStatus },
      ],
      findUnique: async () => null,
    },
    specialMeal: {
      findMany: async () => [],
    },
    wallet: {
      create: async ({ data }) => {
        const w = { id: `w-${data.userId}`, userId: data.userId, currentBalance: data.currentBalance };
        updatedWallets[w.id] = w;
        return w;
      },
      update: async ({ where, data }) => {
        const wId = where.id;
        updatedWallets[wId] = { id: wId, currentBalance: data.currentBalance };
        return updatedWallets[wId];
      },
    },
    walletTransaction: {
      create: async ({ data }) => {
        createdTransactions.push(data);
        return data;
      },
    },
    mealDeclaration: {
      findUnique: async ({ where }) => {
        const uq = where.uq_user_declaration_date;
        const targetTime = uq.declarationDate.getTime();
        return declarations.find(
          d => d.userId === uq.userId && d.declarationDate.getTime() === targetTime
        ) || null;
      },
      findFirst: async ({ where, orderBy }) => {
        let matches = declarations.filter(d => d.userId === where.userId);
        if (where.declarationDate && where.declarationDate.lt) {
          const ltTime = where.declarationDate.lt.getTime();
          matches = matches.filter(d => d.declarationDate.getTime() < ltTime);
        }
        if (where.OR) {
          matches = matches.filter(d =>
            d.breakfastSelected || d.lunchSelected || d.dinnerSelected || d.sourceType === 'MANUAL' || d.sourceType === 'ADMIN_OVERRIDE'
          );
        }
        if (orderBy && orderBy.declarationDate === 'desc') {
          matches.sort((a, b) => b.declarationDate.getTime() - a.declarationDate.getTime());
        }
        return matches[0] || null;
      },
      create: async ({ data }) => {
        createdDeclarations.push(data);
        declarations.push(data);
        return data;
      },
    },
  };
}

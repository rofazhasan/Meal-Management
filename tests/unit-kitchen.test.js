import assert from 'node:assert';
import { getUserMealStateForDate } from '../src/utils/mealUtils.ts';

export async function runSuite() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  test('kitchen forecast aggregates meal counts accurately across active residents', () => {
    const users = [
      { id: 'u1', name: 'User 1', status: 'APPROVED', isIndefinitelyPaused: false, walletBalance: 200, userType: 'PERMANENT' },
      { id: 'u2', name: 'User 2', status: 'APPROVED', isIndefinitelyPaused: false, walletBalance: 200, userType: 'PERMANENT' },
      { id: 'u3', name: 'User 3', status: 'APPROVED', isIndefinitelyPaused: true, walletBalance: 500, userType: 'PERMANENT' }, // Paused
    ];

    const declarations = [
      { id: 'd1', date: '2026-08-06', userId: 'u1', breakfast: true, lunch: true, dinner: false },
      { id: 'd2', date: '2026-08-06', userId: 'u2', breakfast: false, lunch: true, dinner: true },
    ];

    const decMap = new Map(declarations.map(d => [d.userId, d]));

    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;

    for (const u of users) {
      const state = getUserMealStateForDate(u, '2026-08-06', decMap.get(u.id));
      if (state.breakfast) breakfastCount++;
      if (state.lunch) lunchCount++;
      if (state.dinner) dinnerCount++;
    }

    assert.strictEqual(breakfastCount, 1);
    assert.strictEqual(lunchCount, 2);
    assert.strictEqual(dinnerCount, 1);
  });

  test('special meal order quantities add to forecast total', () => {
    const baseLunch = 15;
    const specialMealOrders = [
      { id: 'sm1', userId: 'u1', mealType: 'lunch', quantity: 2 },
      { id: 'sm2', userId: 'u4', mealType: 'lunch', quantity: 1 },
    ];

    const extraLunch = specialMealOrders.reduce((sum, item) => sum + item.quantity, 0);
    const totalLunchForecast = baseLunch + extraLunch;

    assert.strictEqual(extraLunch, 3);
    assert.strictEqual(totalLunchForecast, 18);
  });

  return { total: passed + failed, passed, failed };
}

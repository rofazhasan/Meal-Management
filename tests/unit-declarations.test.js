import assert from 'node:assert';
import { getBangladeshDateStr, getBangladeshTomorrowStr, parseDateStr } from '../src/utils/dateUtils.ts';
import { getUserMealStateForDate } from '../src/utils/mealUtils.ts';
import { isMealDateLocked } from '../lib/mealEngine.ts';

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

  test('declarations date parsing correctly identifies today vs future dates', () => {
    const todayStr = getBangladeshDateStr();
    const tomorrowStr = getBangladeshTomorrowStr();

    const todayDate = parseDateStr(todayStr);
    const tomorrowDate = parseDateStr(tomorrowStr);

    assert.strictEqual(tomorrowDate > todayDate, true);
  });

  test('declaration state correctly respects user wallet balance threshold', () => {
    const userLowBalance = {
      id: 'u-1',
      name: 'Low Balance User',
      status: 'APPROVED',
      isIndefinitelyPaused: false,
      walletBalance: 10, // Below min meal cost (25)
      userType: 'PERMANENT',
    };

    const rates = {
      permanent: { breakfast: 25, lunch: 50, dinner: 50, monthlyCharge: 300 },
      guest: { breakfast: 35, lunch: 70, dinner: 70, monthlyCharge: 0 },
    };

    // Without explicit declaration, default active should be false due to low balance
    const stateNoDec = getUserMealStateForDate(userLowBalance, '2026-08-06', undefined, rates);
    assert.strictEqual(stateNoDec.breakfast, false);
    assert.strictEqual(stateNoDec.lunch, false);
    assert.strictEqual(stateNoDec.dinner, false);

    // With explicit declaration, explicit user choice is used
    const explicitDec = { id: 'd-1', date: '2026-08-06', userId: 'u-1', breakfast: true, lunch: false, dinner: true };
    const stateWithDec = getUserMealStateForDate(userLowBalance, '2026-08-06', explicitDec, rates);
    assert.strictEqual(stateWithDec.breakfast, true);
    assert.strictEqual(stateWithDec.lunch, false);
    assert.strictEqual(stateWithDec.dinner, true);
  });

  test('declaration state suppresses meals when emergency closure applies to specified meals', () => {
    const user = {
      id: 'u-2',
      name: 'User 2',
      status: 'APPROVED',
      isIndefinitelyPaused: false,
      walletBalance: 500,
      userType: 'PERMANENT',
    };

    const emergencyAllClosed = { date: '2026-08-06', reason: 'Maintenance', closedMeals: [] };
    const explicitDec = { id: 'd-2', date: '2026-08-06', userId: 'u-2', breakfast: true, lunch: true, dinner: true };

    // Empty closedMeals array means ALL meals closed
    const stateAllClosed = getUserMealStateForDate(user, '2026-08-06', explicitDec, undefined, emergencyAllClosed);
    assert.deepStrictEqual(stateAllClosed, { breakfast: false, lunch: false, dinner: false });
  });

  test('isMealDateLocked identifies cutoff time expiry accurately', () => {
    // Simulate time at 09:30 AM with cutoff set to 09:00 AM
    const simNow = new Date('2026-08-06T09:30:00+06:00');
    const lockCheck = isMealDateLocked('2026-08-06', '09:00', simNow);

    assert.strictEqual(lockCheck.isLocked, true);
    assert.strictEqual(lockCheck.reason, "Today's meal cutoff time (09:00) has passed.");
  });

  return { total: passed + failed, passed, failed };
}

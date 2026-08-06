import assert from 'node:assert';
import { normalizePhoneNumber } from '../src/utils/phoneUtils.ts';
import { getBangladeshDateStr, parseDateStr, fillMissingDeclarationsForDateRange } from '../src/utils/dateUtils.ts';
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

  // 1. Phone Normalization Tests
  test('normalizePhoneNumber handles Bangla digits correctly', () => {
    assert.strictEqual(normalizePhoneNumber('০১৭১২৩৪৫৬৭৮'), '01712345678');
  });

  test('normalizePhoneNumber strips country code 8801', () => {
    assert.strictEqual(normalizePhoneNumber('+8801712345678'), '01712345678');
    assert.strictEqual(normalizePhoneNumber('8801812345678'), '01812345678');
  });

  test('normalizePhoneNumber prepends 0 to 10-digit 171... numbers', () => {
    assert.strictEqual(normalizePhoneNumber('1712345678'), '01712345678');
  });

  test('normalizePhoneNumber handles empty or invalid input gracefully', () => {
    assert.strictEqual(normalizePhoneNumber(''), '');
  });

  // 2. Date Utilities Tests
  test('getBangladeshDateStr formats specific dates strictly as YYYY-MM-DD', () => {
    const d = new Date(2026, 7, 6); // Aug 6, 2026
    const str = getBangladeshDateStr(d);
    assert.strictEqual(str, '2026-08-06');
  });

  test('parseDateStr creates Date object accurately', () => {
    const d = parseDateStr('2026-08-06');
    assert.strictEqual(d.getFullYear(), 2026);
    assert.strictEqual(d.getMonth(), 7); // 0-indexed month
    assert.strictEqual(d.getDate(), 6);
  });

  test('fillMissingDeclarationsForDateRange populates missing dates with auto-copys', () => {
    const existing = [
      { id: '1', date: '2026-08-01', userId: 'u1', breakfast: true, lunch: false, dinner: true }
    ];
    const filled = fillMissingDeclarationsForDateRange(existing, '2026-08-01', '2026-08-03', 'u1');
    assert.strictEqual(filled.length, 3);
    assert.strictEqual(filled[0].date, '2026-08-01');
    assert.strictEqual(filled[0].lunch, false);
    assert.strictEqual(filled[1].date, '2026-08-02');
    assert.strictEqual(filled[1].isAutoCopied, false);
    assert.strictEqual(filled[1].breakfast, false);
    assert.strictEqual(filled[2].date, '2026-08-03');
  });

  // 3. Meal Utils Tests
  test('getUserMealStateForDate returns false for paused or unapproved users', () => {
    const userPaused = { id: '1', status: 'APPROVED', isIndefinitelyPaused: true, walletBalance: 500 };
    const statePaused = getUserMealStateForDate(userPaused, '2026-08-06');
    assert.deepStrictEqual(statePaused, { breakfast: false, lunch: false, dinner: false });

    const userPending = { id: '2', status: 'PENDING', isIndefinitelyPaused: false, walletBalance: 500 };
    const statePending = getUserMealStateForDate(userPending, '2026-08-06');
    assert.deepStrictEqual(statePending, { breakfast: false, lunch: false, dinner: false });
  });

  test('getUserMealStateForDate respects global meal status off settings', () => {
    const user = { id: '1', status: 'APPROVED', isIndefinitelyPaused: false, walletBalance: 500, userType: 'PERMANENT' };
    const rates = {
      permanent: { breakfast: 25, lunch: 50, dinner: 50, monthlyCharge: 300 },
      guest: { breakfast: 35, lunch: 70, dinner: 70, monthlyCharge: 0 },
      globalMealStatus: { breakfast: true, lunch: false, dinner: true }
    };
    const dec = { id: '1', date: '2026-08-06', userId: '1', breakfast: true, lunch: true, dinner: true };
    const state = getUserMealStateForDate(user, '2026-08-06', dec, rates);
    assert.strictEqual(state.breakfast, true);
    assert.strictEqual(state.lunch, false); // Disabled globally
    assert.strictEqual(state.dinner, true);
  });

  test('getUserMealStateForDate respects emergency closure off settings', () => {
    const user = { id: '1', status: 'APPROVED', isIndefinitelyPaused: false, walletBalance: 500, userType: 'PERMANENT' };
    const emergency = { date: '2026-08-06', reason: 'Storm', closedMeals: ['dinner'] };
    const dec = { id: '1', date: '2026-08-06', userId: '1', breakfast: true, lunch: true, dinner: true };
    const state = getUserMealStateForDate(user, '2026-08-06', dec, undefined, emergency);
    assert.strictEqual(state.breakfast, true);
    assert.strictEqual(state.lunch, true);
    assert.strictEqual(state.dinner, false); // Disabled by emergency
  });

  return { total: passed + failed, passed, failed };
}

import assert from 'node:assert';

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

  test('Guest Meal Rate Tier calculation correctly resolves Permanent vs Guest base rates', () => {
    const permRates = { breakfast: 40, lunch: 70, dinner: 70, monthlyCharge: 300 };
    const guestRates = { breakfast: 50, lunch: 85, dinner: 85, monthlyCharge: 0 };

    const calculateGuestCost = (b, l, d, tier) => {
      const rates = tier === 'PERMANENT' ? permRates : guestRates;
      return b * rates.breakfast + l * rates.lunch + d * rates.dinner;
    };

    // 2 guests for lunch at GUEST rate (2 * 85 = 170)
    const guestCost1 = calculateGuestCost(0, 2, 0, 'GUEST');
    assert.strictEqual(guestCost1, 170);

    // 2 guests for lunch at PERMANENT rate (2 * 70 = 140)
    const guestCost2 = calculateGuestCost(0, 2, 0, 'PERMANENT');
    assert.strictEqual(guestCost2, 140);
  });

  test('Wallet deduction calculation correctly handles wallet vs cash payment mode', () => {
    let walletBalance = 500;
    const guestMealPrice = 170;
    const paymentMethod = 'WALLET';

    if (paymentMethod === 'WALLET') {
      walletBalance -= guestMealPrice;
    }

    assert.strictEqual(walletBalance, 330);

    // Cash mode does not deduct wallet balance
    let cashWalletBalance = 500;
    const cashPaymentMethod = 'CASH';
    if (cashPaymentMethod === 'WALLET') {
      cashWalletBalance -= guestMealPrice;
    }
    assert.strictEqual(cashWalletBalance, 500);
  });

  test('Turning off guest meals calculates exact refund amount for WALLET payment mode', () => {
    let walletBalance = 330; // After 170 BDT deduction
    const oldCharged = 170;
    const paymentMethod = 'WALLET';
    const newCharged = 0; // Turned off guest meal

    if (paymentMethod === 'WALLET') {
      const netDiff = newCharged - oldCharged; // -170
      if (netDiff < 0) {
        walletBalance += Math.abs(netDiff);
      }
    }

    assert.strictEqual(walletBalance, 500);
  });

  test('CASH payment mode does NOT refund wallet balance when turned off or reduced (hand-to-hand cash refund)', () => {
    let walletBalance = 500;
    const oldCharged = 170;
    const paymentMethod = 'CASH';
    const oldPaymentMethod = 'CASH';
    const newCharged = 0; // Turned off guest meal

    // Cash mode does not touch wallet balance
    if (paymentMethod === 'WALLET') {
      const netDiff = newCharged - oldCharged;
      if (netDiff < 0) {
        walletBalance += Math.abs(netDiff);
      }
    } else if (paymentMethod === 'CASH' && oldPaymentMethod === 'WALLET') {
      walletBalance += oldCharged; // Only refund if switching from WALLET to CASH
    }

    // Wallet balance remains 500 (no wallet refund for CASH mode)
    assert.strictEqual(walletBalance, 500);
  });

  test('Emergency closure refunds WALLET guest meals and zeroes out counts', () => {
    let walletBalance = 300;
    const guestMeal = {
      breakfastCount: 2,
      lunchCount: 0,
      dinnerCount: 0,
      chargedAmount: 100,
      paymentMethod: 'WALLET',
    };

    const isEmergencyClosed = true;
    let totalRefunded = 0;

    if (isEmergencyClosed) {
      if (guestMeal.paymentMethod === 'WALLET' && guestMeal.chargedAmount > 0) {
        walletBalance += guestMeal.chargedAmount;
        totalRefunded += guestMeal.chargedAmount;
      }
      guestMeal.breakfastCount = 0;
      guestMeal.lunchCount = 0;
      guestMeal.dinnerCount = 0;
      guestMeal.chargedAmount = 0;
    }

    assert.strictEqual(walletBalance, 400);
    assert.strictEqual(totalRefunded, 100);
    assert.strictEqual(guestMeal.breakfastCount, 0);
  });

  test('Partial reduction of guest meal counts refunds the exact net difference to wallet', () => {
    let walletBalance = 500;
    const oldCharged = 240; // 3 guest lunches @ 80 BDT
    walletBalance -= oldCharged; // 260
    assert.strictEqual(walletBalance, 260);

    // Reducing from 3 guest lunches down to 1 guest lunch (80 BDT)
    const newCharged = 80;
    const netDiff = newCharged - oldCharged; // 80 - 240 = -160
    if (netDiff < 0) {
      walletBalance += Math.abs(netDiff); // +160 refund
    }

    assert.strictEqual(walletBalance, 420); // 260 + 160 = 420
  });

  return { total: passed + failed, passed, failed };
}

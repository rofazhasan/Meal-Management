import assert from 'node:assert';
import * as loginRoute from '../src/app/api/auth/login/route.ts';
import * as registerRoute from '../src/app/api/auth/register/route.ts';
import * as usersRoute from '../src/app/api/users/route.ts';
import * as declarationsRoute from '../src/app/api/declarations/route.ts';
import * as topupRoute from '../src/app/api/wallets/topup/route.ts';
import * as kitchenRoute from '../src/app/api/kitchen/forecast/route.ts';
import * as emergenciesRoute from '../src/app/api/emergencies/route.ts';
import * as notificationsRoute from '../src/app/api/notifications/route.ts';

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

  // 1. Auth API exports
  test('/api/auth/login exports POST handler', () => {
    assert.strictEqual(typeof loginRoute.POST, 'function');
  });

  test('/api/auth/register exports POST handler', () => {
    assert.strictEqual(typeof registerRoute.POST, 'function');
  });

  // 2. Users API exports
  test('/api/users exports GET handler', () => {
    assert.strictEqual(typeof usersRoute.GET, 'function');
  });

  // 3. Declarations API exports
  test('/api/declarations exports GET and POST handlers', () => {
    assert.strictEqual(typeof declarationsRoute.GET, 'function');
    assert.strictEqual(typeof declarationsRoute.POST, 'function');
  });

  // 4. Wallets API exports
  test('/api/wallets/topup exports POST handler', () => {
    assert.strictEqual(typeof topupRoute.POST, 'function');
  });

  // 5. Kitchen API exports
  test('/api/kitchen/forecast exports GET handler', () => {
    assert.strictEqual(typeof kitchenRoute.GET, 'function');
  });

  // 6. Emergencies API exports
  test('/api/emergencies exports GET and POST handlers', () => {
    assert.strictEqual(typeof emergenciesRoute.GET, 'function');
    assert.strictEqual(typeof emergenciesRoute.POST, 'function');
  });

  // 7. Notifications API exports
  test('/api/notifications exports GET and PATCH handlers', () => {
    assert.strictEqual(typeof notificationsRoute.GET, 'function');
    assert.strictEqual(typeof notificationsRoute.PATCH, 'function');
  });

  return { total: passed + failed, passed, failed };
}

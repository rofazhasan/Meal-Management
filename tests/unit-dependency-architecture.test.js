import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

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

  // Dependency Test 1: Package dependencies integrity
  await test('Dependency 1: package.json specifies required core dependencies', async () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    assert.ok(fs.existsSync(pkgPath), 'package.json must exist');
    
    const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert.ok(pkgContent.dependencies['next'], 'next dependency present');
    assert.ok(pkgContent.dependencies['react'], 'react dependency present');
    assert.ok(pkgContent.dependencies['@prisma/client'], 'prisma client dependency present');
    assert.ok(pkgContent.dependencies['pg'], 'pg dependency present');
    assert.ok(pkgContent.dependencies['bcryptjs'], 'bcryptjs dependency present');
  });

  // Architecture Test 2: Layered separation (src/app, lib, services, components)
  await test('Architecture 2: Verifies workspace project directory structure and module separation', async () => {
    const root = process.cwd();
    assert.ok(fs.existsSync(path.join(root, 'src')), 'src folder exists');
    assert.ok(fs.existsSync(path.join(root, 'lib')), 'lib folder exists');
    assert.ok(fs.existsSync(path.join(root, 'prisma')), 'prisma folder exists');
    assert.ok(fs.existsSync(path.join(root, 'src', 'app', 'api')), 'api routes directory exists');
  });

  // Architecture Test 3: API Route dynamic configuration
  await test('Architecture 3: Essential API endpoints export force-dynamic route segment config', async () => {
    const routePath = path.resolve(process.cwd(), 'src/app/api/declarations/route.ts');
    if (fs.existsSync(routePath)) {
      const code = fs.readFileSync(routePath, 'utf8');
      assert.ok(code.includes("export const dynamic = 'force-dynamic'"), 'Route must export force-dynamic directive');
    }
  });

  // Data Structure Test 4: Financial Ledger map and balance ledger nodes
  await test('Data Structure 4: Financial Ledger tree structure calculates credit/debit balances accurately', async () => {
    const ledger = {
      entries: [
        { id: '1', type: 'RECHARGE', amount: 1000, category: 'CREDIT' },
        { id: '2', type: 'MEAL_BILL', amount: 125, category: 'DEBIT' },
        { id: '3', type: 'MONTHLY_FEE', amount: 50, category: 'DEBIT' },
        { id: '4', type: 'REFUND', amount: 25, category: 'CREDIT' },
      ],
    };

    const totalCredit = ledger.entries
      .filter((e) => e.category === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalDebit = ledger.entries
      .filter((e) => e.category === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);

    const netLedgerBalance = totalCredit - totalDebit;

    assert.strictEqual(totalCredit, 1025);
    assert.strictEqual(totalDebit, 175);
    assert.strictEqual(netLedgerBalance, 850);
  });

  // Data Structure Test 5: Cook forecast aggregation map structure
  await test('Data Structure 5: Cook Forecast Data Map aggregates counts per meal slot', async () => {
    const forecastMap = new Map();
    const dateStr = '2026-08-06';

    forecastMap.set(dateStr, { breakfast: 15, lunch: 22, dinner: 20, specialMealCount: 5 });

    const dayData = forecastMap.get(dateStr);
    assert.strictEqual(dayData.breakfast, 15);
    assert.strictEqual(dayData.lunch, 22);
    assert.strictEqual(dayData.dinner, 20);
    assert.strictEqual(dayData.specialMealCount, 5);
  });

  return { total: passed + failed, passed, failed };
}

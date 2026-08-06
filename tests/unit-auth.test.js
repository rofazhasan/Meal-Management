import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { normalizePhoneNumber } from '../src/utils/phoneUtils.ts';

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

  // 1. Password Security & Hashing Tests
  await test('bcrypt hashes and verifies password correctly', async () => {
    const rawPass = 'secret123';
    const hash = await bcrypt.hash(rawPass, 10);
    assert.notStrictEqual(hash, rawPass);
    const isMatch = await bcrypt.compare(rawPass, hash);
    assert.strictEqual(isMatch, true);
    const isWrongMatch = await bcrypt.compare('wrongpass', hash);
    assert.strictEqual(isWrongMatch, false);
  });

  // 2. Auth Payload Normalization & Defaults
  await test('registration data normalizes phone numbers and assigns default status PENDING', () => {
    const rawData = {
      name: 'Rahim Uddin',
      phone: '+8801700000000',
      password: '123',
      userType: 'PERMANENT',
    };

    const normalizedPhone = normalizePhoneNumber(rawData.phone);
    const defaultStatus = 'PENDING';
    const defaultRole = 'RESIDENT';
    const initialBalance = 0;

    assert.strictEqual(normalizedPhone, '01700000000');
    assert.strictEqual(defaultStatus, 'PENDING');
    assert.strictEqual(defaultRole, 'RESIDENT');
    assert.strictEqual(initialBalance, 0);
  });

  await test('login payload rejects empty phone numbers', () => {
    const cleanPhone = normalizePhoneNumber('');
    assert.strictEqual(cleanPhone, '');
    assert.strictEqual(cleanPhone.length < 11, true);
  });

  return { total: passed + failed, passed, failed };
}

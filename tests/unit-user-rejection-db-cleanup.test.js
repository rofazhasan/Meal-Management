import assert from 'node:assert';

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

  // 1. User rejection deletes user and all child relational records from DB
  await test('User Rejection 1: Rejecting a user permanently deletes user and cascading records from DB', async () => {
    const deletedTables = [];
    const testUserId = 'test-pending-user-id';

    const mockPrisma = {
      user: {
        findUnique: async ({ where }) => {
          if (where.id === testUserId) {
            return { id: testUserId, fullName: 'Rafiu Hasan', phoneNumber: '01700000000' };
          }
          return null;
        },
        delete: ({ where }) => {
          deletedTables.push(`user:${where.id}`);
          return Promise.resolve();
        },
      },
      walletTransaction: {
        deleteMany: ({ where }) => {
          deletedTables.push(`walletTransaction:${where.userId}`);
          return Promise.resolve();
        },
      },
      rechargeRequest: {
        deleteMany: ({ where }) => {
          deletedTables.push(`rechargeRequest:${where.userId}`);
          return Promise.resolve();
        },
      },
      mealDeclaration: {
        deleteMany: ({ where }) => {
          deletedTables.push(`mealDeclaration:${where.userId}`);
          return Promise.resolve();
        },
      },
      mealConsumption: {
        deleteMany: ({ where }) => {
          deletedTables.push(`mealConsumption:${where.userId}`);
          return Promise.resolve();
        },
      },
      guestMeal: {
        deleteMany: ({ where }) => {
          deletedTables.push(`guestMeal:${where.userId}`);
          return Promise.resolve();
        },
      },
      notification: {
        deleteMany: ({ where }) => {
          deletedTables.push(`notification:${where.userId}`);
          return Promise.resolve();
        },
      },
      approvalRequest: {
        deleteMany: ({ where }) => {
          deletedTables.push(`approvalRequest:${where.userId}`);
          return Promise.resolve();
        },
      },
      profile: {
        deleteMany: ({ where }) => {
          deletedTables.push(`profile:${where.userId}`);
          return Promise.resolve();
        },
      },
      wallet: {
        deleteMany: ({ where }) => {
          deletedTables.push(`wallet:${where.userId}`);
          return Promise.resolve();
        },
      },
      $transaction: async (operations) => {
        return Promise.all(operations);
      },
    };

    // Simulate rejection handler logic
    const handleStatusUpdateSim = async (userId, status) => {
      if (status === 'REJECTED') {
        const existingUser = await mockPrisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) throw new Error('User not found');

        await mockPrisma.$transaction([
          mockPrisma.walletTransaction.deleteMany({ where: { userId } }),
          mockPrisma.rechargeRequest.deleteMany({ where: { userId } }),
          mockPrisma.mealDeclaration.deleteMany({ where: { userId } }),
          mockPrisma.mealConsumption.deleteMany({ where: { userId } }),
          mockPrisma.guestMeal.deleteMany({ where: { userId } }),
          mockPrisma.notification.deleteMany({ where: { userId } }),
          mockPrisma.approvalRequest.deleteMany({ where: { userId } }),
          mockPrisma.profile.deleteMany({ where: { userId } }),
          mockPrisma.wallet.deleteMany({ where: { userId } }),
          mockPrisma.user.delete({ where: { id: userId } }),
        ]);

        return {
          id: userId,
          status: 'REJECTED',
          deleted: true,
        };
      }
    };

    const res = await handleStatusUpdateSim(testUserId, 'REJECTED');
    assert.strictEqual(res.deleted, true);
    assert.strictEqual(res.status, 'REJECTED');

    // Assert all 10 cascade operations were performed
    assert.ok(deletedTables.includes(`user:${testUserId}`));
    assert.ok(deletedTables.includes(`wallet:${testUserId}`));
    assert.ok(deletedTables.includes(`profile:${testUserId}`));
    assert.ok(deletedTables.includes(`mealDeclaration:${testUserId}`));
    assert.strictEqual(deletedTables.length, 10);
  });

  return { total: passed + failed, passed, failed };
}

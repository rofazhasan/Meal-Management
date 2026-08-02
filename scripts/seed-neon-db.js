import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set.");
  console.error("   Please create a .env file with your DATABASE_URL and run: node -r dotenv/config scripts/seed-neon-db.js");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log("🔌 Connecting to Neon Cloud PostgreSQL Database...");
  await client.connect();
  console.log("✅ Connected successfully to Neon DB!");

  console.log("👑 Updating Real Master Superadmin Account in Neon DB...");
  // ⚠️  SECURITY WARNING: 'password_hash' below stores a PLAINTEXT password.
  // Before going to production, replace this with a properly bcrypt-hashed value.
  // Example: const hash = await bcrypt.hash('your-secure-password', 12);
  const adminQuery = `
    INSERT INTO users (id, phone_number, password_hash, full_name, role, user_type, approval_status, is_active)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', '01822222222', 'admin', 'মেস সুপার অ্যাডমিন (Master Admin)', 'ADMIN', 'PERMANENT', 'APPROVED', true)
    ON CONFLICT (id) DO UPDATE 
    SET phone_number = '01822222222', password_hash = 'admin', full_name = 'মেস সুপার অ্যাডমিন (Master Admin)', role = 'ADMIN', approval_status = 'APPROVED', is_active = true;
  `;
  await client.query(adminQuery);

  const profileQuery = `
    INSERT INTO profiles (user_id, room_number, department, hostel_name)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Admin-1', 'Administration', 'Main Hostel')
    ON CONFLICT (user_id) DO NOTHING;
  `;
  await client.query(profileQuery);

  const walletQuery = `
    INSERT INTO wallets (user_id, current_balance, currency)
    VALUES ('11111111-1111-1111-1111-111111111111', 5000.00, 'BDT')
    ON CONFLICT (user_id) DO NOTHING;
  `;
  await client.query(walletQuery);

  console.log("🎉 REAL SUPERADMIN ACCOUNT CREATED AND CONFIRMED IN NEON DB!");
  console.log("📱 Mobile: 01822222222 | Password: admin | Role: ADMIN | Balance: ৳5,000");

  const res = await client.query("SELECT id, phone_number, full_name, role, approval_status FROM users;");
  console.log("\n📊 ALL USERS CURRENTLY IN NEON CLOUD DATABASE:");
  console.table(res.rows);

  await client.end();
}

main().catch((err) => {
  console.error("❌ Error executing Neon DB script:", err);
  process.exit(1);
});

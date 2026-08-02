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
  const adminQuery = `
    INSERT INTO users (id, phone_number, password_hash, full_name, role, user_type, approval_status, is_active)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', '01794678595', 'admin', 'Mas Manager', 'SUPERADMIN', 'PERMANENT', 'APPROVED', true)
    ON CONFLICT (id) DO UPDATE 
    SET phone_number = '01794678595', password_hash = 'admin', full_name = 'Mas Manager', role = 'SUPERADMIN', approval_status = 'APPROVED', is_active = true;
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
  console.log("📱 Mobile: 01794678595 | Password: admin | Role: ADMIN | Balance: ৳5,000");

  const res = await client.query("SELECT id, phone_number, full_name, role, approval_status FROM users;");
  console.log("\n📊 ALL USERS CURRENTLY IN NEON CLOUD DATABASE:");
  console.table(res.rows);

  await client.end();
}

main().catch((err) => {
  console.error("❌ Error executing Neon DB script:", err);
  process.exit(1);
});

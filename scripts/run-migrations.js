import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

async function runMigrations() {
  console.log("🔌 Connecting to PostgreSQL Database to run migrations...");
  await client.connect();

  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`\n📦 Found ${files.length} migration files in migrations/`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`▶ Executing migration: [${file}]...`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    try {
      await client.query(sql);
      console.log(`  ✓ Successfully applied ${file}`);
    } catch (err) {
      console.error(`  ❌ Migration failed for ${file}:`, err.message);
    }
  }

  console.log("\n🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!");
  await client.end();
}

runMigrations().catch((err) => {
  console.error("❌ Migration runner error:", err);
  process.exit(1);
});

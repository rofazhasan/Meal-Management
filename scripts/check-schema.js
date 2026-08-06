import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name IN ('notifications', 'audit_logs', 'users');
  `);
  console.log("Table Columns in DB:");
  console.table(res.rows);
  await client.end();
}

run().catch(console.error);

import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let columnsChecked = false;

export async function ensureColumnsExist() {
  if (!connectionString || columnsChecked) return;
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_indefinitely_paused BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_password_reset_requested BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_requested_at TIMESTAMPTZ;
    `);
    columnsChecked = true;
  } catch (err) {
    console.warn('Database column check failed:', err);
  }
}

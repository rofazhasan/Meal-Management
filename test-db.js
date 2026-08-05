import pg from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_Y1QmKSVJXF6h@ep-gentle-pine-ax7ory74-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name, column_name, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log('Users columns and UDT types:', res.rows);
  } catch (err) {
    console.error('Error inspecting columns:', err);
  } finally {
    await client.end();
  }
}

run();

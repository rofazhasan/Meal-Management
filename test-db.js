import pg from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_Y1QmKSVJXF6h@ep-gentle-pine-ax7ory74-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Successfully connected to Neon Pooled Database!');
    const res = await client.query('SELECT count(*) FROM users;');
    console.log('Users count via pooler:', res.rows[0].count);
  } catch (err) {
    console.error('Neon Pooler DB connection error:', err);
  } finally {
    await client.end();
  }
}

run();

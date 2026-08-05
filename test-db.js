import pg from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_Y1QmKSVJXF6h@ep-gentle-pine-ax7ory74.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Successfully connected to Neon Database!');
    const res = await client.query('SELECT count(*), json_agg(u.*) FROM users u;');
    console.log('Users count:', res.rows[0].count);
    console.log('Users rows:', JSON.stringify(res.rows[0].json_agg, null, 2));
  } catch (err) {
    console.error('Neon DB connection error:', err);
  } finally {
    await client.end();
  }
}

run();

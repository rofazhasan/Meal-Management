import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

const defaultConfig = {
  permanent: { breakfast: 25, lunch: 50, dinner: 50, monthlyCharge: 300 },
  guest: { breakfast: 35, lunch: 70, dinner: 70, monthlyCharge: 0 },
  globalMealStatus: { breakfast: true, lunch: true, dinner: true },
  cutoffTime: '10:00',
};

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const res = await pool.query(`SELECT key_name, value_json FROM meal_settings;`);
      if (res.rows.length > 0) {
        const config = { ...defaultConfig };
        res.rows.forEach((row: any) => {
          if (row.key_name === 'rates_permanent') config.permanent = row.value_json;
          if (row.key_name === 'rates_guest') config.guest = row.value_json;
          if (row.key_name === 'global_status') config.globalMealStatus = row.value_json;
          if (row.key_name === 'cutoff_time') config.cutoffTime = row.value_json?.cutoffTime || '10:00';
        });
        return NextResponse.json(config);
      }
    }
    return NextResponse.json(defaultConfig);
  } catch (error: any) {
    return NextResponse.json(defaultConfig);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { permanent, guest, globalMealStatus, cutoffTime } = body;

    if (process.env.DATABASE_URL) {
      if (permanent) {
        await pool.query(
          `INSERT INTO meal_settings (key_name, value_json, updated_at) VALUES ('rates_permanent', $1, CURRENT_TIMESTAMP) ON CONFLICT (key_name) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = CURRENT_TIMESTAMP;`,
          [JSON.stringify(permanent)]
        );
      }
      if (guest) {
        await pool.query(
          `INSERT INTO meal_settings (key_name, value_json, updated_at) VALUES ('rates_guest', $1, CURRENT_TIMESTAMP) ON CONFLICT (key_name) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = CURRENT_TIMESTAMP;`,
          [JSON.stringify(guest)]
        );
      }
      if (globalMealStatus) {
        await pool.query(
          `INSERT INTO meal_settings (key_name, value_json, updated_at) VALUES ('global_status', $1, CURRENT_TIMESTAMP) ON CONFLICT (key_name) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = CURRENT_TIMESTAMP;`,
          [JSON.stringify(globalMealStatus)]
        );
      }
      if (cutoffTime) {
        await pool.query(
          `INSERT INTO meal_settings (key_name, value_json, updated_at) VALUES ('cutoff_time', $1, CURRENT_TIMESTAMP) ON CONFLICT (key_name) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = CURRENT_TIMESTAMP;`,
          [JSON.stringify({ cutoffTime })]
        );
      }
    }

    return NextResponse.json({ success: true, ...body });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update rates' }, { status: 500 });
  }
}

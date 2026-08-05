import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const res = await pool.query(`
        SELECT 
          id, 
          to_char(meal_date, 'YYYY-MM-DD') AS date, 
          meal_type AS "mealType", 
          title, 
          custom_rate::float AS "customRate", 
          description, 
          is_recurring AS "isRecurring", 
          repeat_day_of_week AS "repeatDayOfWeek", 
          is_active AS "isActive",
          to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
        FROM special_meals
        ORDER BY meal_date ASC;
      `);
      return NextResponse.json(res.rows);
    }
    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { date, mealType, title, customRate, description, isRecurring, repeatDayOfWeek } = await req.json();

    let meal: any = {
      id: `sm-${Date.now()}`,
      date,
      mealType,
      title,
      customRate: Number(customRate),
      description,
      isRecurring: Boolean(isRecurring),
      repeatDayOfWeek,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    if (process.env.DATABASE_URL) {
      const res = await pool.query(
        `INSERT INTO special_meals (meal_date, meal_type, title, custom_rate, description, is_recurring, repeat_day_of_week, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         RETURNING id, to_char(meal_date, 'YYYY-MM-DD') AS date, meal_type AS "mealType", title, custom_rate::float AS "customRate", description, is_recurring AS "isRecurring", repeat_day_of_week AS "repeatDayOfWeek", is_active AS "isActive", to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt";`,
        [date, mealType, title, Number(customRate), description || null, Boolean(isRecurring), repeatDayOfWeek || null]
      );
      if (res.rows.length > 0) meal = res.rows[0];
    }

    return NextResponse.json(meal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add special meal' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, isActive } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Special meal ID required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      const res = await pool.query(
        `UPDATE special_meals SET is_active = $1 WHERE id = $2 RETURNING id, to_char(meal_date, 'YYYY-MM-DD') AS date, meal_type AS "mealType", title, custom_rate::float AS "customRate", description, is_recurring AS "isRecurring", repeat_day_of_week AS "repeatDayOfWeek", is_active AS "isActive";`,
        [Boolean(isActive), id]
      );
      if (res.rows.length > 0) {
        return NextResponse.json(res.rows[0]);
      }
    }
    return NextResponse.json({ id, isActive });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update special meal' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Special meal ID required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await pool.query(`DELETE FROM special_meals WHERE id = $1;`, [id]);
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete special meal' }, { status: 500 });
  }
}

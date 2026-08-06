import { NextResponse } from 'next/server';
import { forecastKitchenDemand, getBgdDateStr } from '@/lib/mealEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || getBgdDateStr();
    const safetyBuffer = Number(searchParams.get('buffer') || 5);

    if (process.env.DATABASE_URL) {
      const forecast = await forecastKitchenDemand(dateStr, safetyBuffer);
      return NextResponse.json(forecast);
    }

    return NextResponse.json({
      date: dateStr,
      safetyBufferPercent: safetyBuffer,
      actualDemand: { breakfast: 0, lunch: 0, dinner: 0 },
      recommendedKitchenPrep: { breakfast: 0, lunch: 0, dinner: 0 },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate kitchen forecast' },
      { status: 500 }
    );
  }
}

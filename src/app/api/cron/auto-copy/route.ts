import { NextResponse } from 'next/server';
import { autoCopyPreviousDayDeclarations, getBgdDateStr } from '@/lib/mealEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const todayStr = getBgdDateStr();
    const result = await autoCopyPreviousDayDeclarations(todayStr);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      todayStr,
      ...result,
    });
  } catch (error: any) {
    console.error('Error executing auto-copy cron job:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute auto-copy cron job' },
      { status: 500 }
    );
  }
}

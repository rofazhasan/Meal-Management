import { NextResponse } from 'next/server';
import { reconcileUserWalletsAndDetectAnomalies } from '@/lib/mealEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const auditResult = await reconcileUserWalletsAndDetectAnomalies();
      return NextResponse.json(auditResult);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalAuditedWallets: 0,
      anomaliesCount: 0,
      isSystemClean: true,
      anomalies: [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to run wallet audit reconciliation' },
      { status: 500 }
    );
  }
}

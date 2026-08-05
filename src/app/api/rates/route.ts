import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const defaultConfig = {
  permanent: { breakfast: 25, lunch: 50, dinner: 50, monthlyCharge: 300 },
  guest: { breakfast: 35, lunch: 70, dinner: 70, monthlyCharge: 0 },
  globalMealStatus: { breakfast: true, lunch: true, dinner: true },
  cutoffTime: '10:00',
};

export async function GET() {
  try {
    const configs = await prisma.systemConfig.findMany();
    if (configs.length > 0) {
      const config = { ...defaultConfig };
      configs.forEach((item) => {
        if (item.key === 'rates_permanent') config.permanent = item.valueJson as any;
        if (item.key === 'rates_guest') config.guest = item.valueJson as any;
        if (item.key === 'global_status') config.globalMealStatus = item.valueJson as any;
        if (item.key === 'cutoff_time') config.cutoffTime = (item.valueJson as any)?.cutoffTime || '10:00';
      });
      return NextResponse.json(config);
    }
    return NextResponse.json(defaultConfig);
  } catch (error: any) {
    console.error('Error fetching rates:', error);
    return NextResponse.json(defaultConfig);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { permanent, guest, globalMealStatus, cutoffTime } = body;

    const updates: Promise<any>[] = [];

    if (permanent) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'rates_permanent' },
          update: { valueJson: permanent },
          create: { key: 'rates_permanent', valueJson: permanent },
        })
      );
    }

    if (guest) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'rates_guest' },
          update: { valueJson: guest },
          create: { key: 'rates_guest', valueJson: guest },
        })
      );
    }

    if (globalMealStatus) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'global_status' },
          update: { valueJson: globalMealStatus },
          create: { key: 'global_status', valueJson: globalMealStatus },
        })
      );
    }

    if (cutoffTime) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'cutoff_time' },
          update: { valueJson: { cutoffTime } },
          create: { key: 'cutoff_time', valueJson: { cutoffTime } },
        })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, ...body });
  } catch (error: any) {
    console.error('Error updating rates:', error);
    return NextResponse.json({ error: error.message || 'Failed to update rates' }, { status: 500 });
  }
}

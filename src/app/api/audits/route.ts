import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const formatted = logs.map((l) => ({
      id: l.id,
      adminId: l.actorUserId || 'admin',
      action: l.action,
      details: l.details || '',
      timestamp: l.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { adminId, action, targetUserId, details, reason } = body;

    const created = await prisma.auditLog.create({
      data: {
        actorUserId: adminId && adminId.length === 36 ? adminId : null,
        action: action || 'ACTION',
        details: details || reason || '',
      },
    });

    return NextResponse.json({
      id: created.id,
      adminId: created.actorUserId || adminId || 'admin',
      action: created.action,
      targetUserId,
      details: created.details,
      timestamp: created.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Audit log error:', error);
    return NextResponse.json({ success: true });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = [
  'ADMIN', 'SUPERADMIN', 'OWNER', 'FINANCE_ADMIN',
  'MEAL_MANAGER', 'HOSTEL_MANAGER', 'AUDITOR', 'SUPPORT_ADMIN', 'READONLY_ADMIN'
] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requesterRole = body.requesterRole || 'ADMIN';

    if (!ADMIN_ROLES.includes(requesterRole as any)) {
      return NextResponse.json(
        { error: 'অ্যাক্সেস প্রত্যাখ্যান করা হয়েছে: ইউজার মোছার ক্ষমতা শুধুমাত্র অ্যাডমিনের রয়েছে।' },
        { status: 403 }
      );
    }

    // Soft delete non-admin test users
    const result = await prisma.user.updateMany({
      where: {
        role: 'USER',
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `সফলভাবে ${result.count} জন টেস্ট ইউজার মুছে ফেলা হয়েছে!`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Error purging test users:', error);
    return NextResponse.json(
      { error: error.message || 'ইউজার ডিলিট করতে সমস্যা হয়েছে' },
      { status: 500 }
    );
  }
}

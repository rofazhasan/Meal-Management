import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  try {
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    const targetRole = role === 'ADMIN' ? 'SUPERADMIN' : (role in UserRole ? role : 'USER');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: targetRole as UserRole,
      },
    });

    return NextResponse.json({ success: true, userId: updated.id, role: updated.role });
  } catch (error: any) {
    console.error('Failed to update user role:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user role' }, { status: 500 });
  }
}

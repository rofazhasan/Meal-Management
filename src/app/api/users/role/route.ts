import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function handleRoleUpdate(req: Request) {
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

    return NextResponse.json({
      id: updated.id,
      name: updated.fullName,
      phone: updated.phoneNumber,
      role: updated.role,
      userType: updated.userType,
      status: updated.approvalStatus,
      isIndefinitelyPaused: !updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to update user role:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user role' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handleRoleUpdate(req);
}

export async function PATCH(req: Request) {
  return handleRoleUpdate(req);
}

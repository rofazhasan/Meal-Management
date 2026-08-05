import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const {
      studentId,
      roomNumber,
      department,
      bloodGroup,
      emergencyContact,
      hostelName,
      fullName,
      name,
    } = body;

    if (fullName || name) {
      await prisma.user.update({
        where: { id: userId },
        data: { fullName: fullName || name },
      });
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        studentId: studentId !== undefined ? studentId : undefined,
        roomNumber: roomNumber !== undefined ? roomNumber : undefined,
        department: department !== undefined ? department : undefined,
        bloodGroup: bloodGroup !== undefined ? bloodGroup : undefined,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : undefined,
        hostelName: hostelName !== undefined ? hostelName : undefined,
      },
      create: {
        userId,
        studentId: studentId || '',
        roomNumber: roomNumber || '',
        department: department || '',
        bloodGroup: bloodGroup || 'B+',
        emergencyContact: emergencyContact || '',
        hostelName: hostelName || 'Main Hostel',
      },
    });

    return NextResponse.json({ id: userId, profile });
  } catch (error: any) {
    console.error('Failed to update user profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}

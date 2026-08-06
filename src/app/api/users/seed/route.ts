import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set([
  'ADMIN', 'SUPERADMIN', 'OWNER', 'FINANCE_ADMIN',
  'MEAL_MANAGER', 'HOSTEL_MANAGER', 'AUDITOR', 'SUPPORT_ADMIN', 'READONLY_ADMIN'
]);

const BANGLA_NAMES = [
  'আরিফুল ইসলাম', 'সাকিব আল হাসান', 'তানভীর আহমেদ', 'রাফসান জানি', 'রেজওয়ান হোসেন',
  'মাশরাফি জামান', 'মুশফিকুর রহিম', 'মাহমুদুল হাসান', 'ফারহান আহমেদ', 'মেহেদী হাসান',
  'ইশতিয়াক জামান', 'নাসিম শাহরিয়ার', 'কামরুল ইসলাম', 'শাহাদাত হোসেন', 'আতিকুর রহমান',
  'জাহিদ হাসান', 'নুরুল হুদা', 'আসাদুল হক', 'শামীম হোসেন', 'মোস্তফা কামাল'
];

const DEPARTMENTS = ['Computer Science', 'Electrical Eng.', 'Mechanical Eng.', 'Civil Eng.', 'Architecture', 'BBA'];
const BLOOD_GROUPS = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(Number(body.count) || 300, 1), 500);
    const requesterRole = body.requesterRole || 'SUPERADMIN';

    // Verification check: ensure requester has admin privileges
    if (requesterRole && !ADMIN_ROLES.has(requesterRole)) {
      return NextResponse.json(
        { error: 'অ্যাক্সেস প্রত্যাখ্যান করা হয়েছে: শুধুমাত্র অ্যাডমিন বা সুপারঅ্যাডমিন টেস্ট ইউজার তৈরি করতে পারবেন।' },
        { status: 403 }
      );
    }

    // Pre-hash password '123456' for fast bulk generation
    const hashedPassword = await bcrypt.hash('123456', 10);

    const basePhoneOffset = 1000;
    let createdCount = 0;

    for (let i = 1; i <= count; i += 50) {
      const chunkSize = Math.min(50, count - i + 1);
      
      await prisma.$transaction(async (tx) => {
        for (let j = 0; j < chunkSize; j++) {
          const index = i + j;
          const phoneNum = `+880179${String(basePhoneOffset + index).padStart(7, '0')}`;
          const nameIndex = (index - 1) % BANGLA_NAMES.length;
          const fullName = `মেম্বার-${index} (${BANGLA_NAMES[nameIndex]})`;
          const dept = DEPARTMENTS[(index - 1) % DEPARTMENTS.length];
          const blood = BLOOD_GROUPS[(index - 1) % BLOOD_GROUPS.length];
          const roomNum = `${100 + Math.floor((index - 1) / 4)}-${String.fromCharCode(65 + ((index - 1) % 4))}`;
          const userType = index % 5 === 0 ? 'GUEST' : 'PERMANENT';

          // Upsert User
          const user = await tx.user.upsert({
            where: { phoneNumber: phoneNum },
            update: {
              deletedAt: null,
              isActive: true,
              approvalStatus: 'APPROVED',
              passwordHash: hashedPassword,
            },
            create: {
              phoneNumber: phoneNum,
              fullName,
              passwordHash: hashedPassword,
              role: 'USER',
              userType,
              approvalStatus: 'APPROVED',
              isActive: true,
            },
          });

          // Upsert Profile
          await tx.profile.upsert({
            where: { userId: user.id },
            update: {
              roomNumber: roomNum,
              department: dept,
              bloodGroup: blood,
              hostelName: 'Main Hostel',
            },
            create: {
              userId: user.id,
              roomNumber: roomNum,
              department: dept,
              studentId: `STU-2026-${String(index).padStart(4, '0')}`,
              bloodGroup: blood,
              hostelName: 'Main Hostel',
              emergencyContact: '+8801700000000',
            },
          });

          // Upsert Wallet
          await tx.wallet.upsert({
            where: { userId: user.id },
            update: {
              currentBalance: 500.0,
            },
            create: {
              userId: user.id,
              currentBalance: 500.0,
              currency: 'BDT',
            },
          });

          createdCount++;
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `সফলভাবে ${createdCount} জন টেস্ট ইউজার তৈরি করা হয়েছে!`,
      count: createdCount,
    });
  } catch (error: any) {
    console.error('Error seeding test users:', error);
    return NextResponse.json(
      { error: error.message || 'টেস্ট ইউজার সেটিং করতে ব্যর্থ হয়েছে' },
      { status: 500 }
    );
  }
}

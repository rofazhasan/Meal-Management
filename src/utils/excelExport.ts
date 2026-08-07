import * as XLSX from 'xlsx';

export interface ArchiveDataPayload {
  period: {
    startDate: string;
    endDate: string;
    periodLabel: string;
  };
  archivedAt: string;
  archivedByAdminName: string;
  summary: {
    totalUsers: number;
    totalPermanentUsers: number;
    totalGuestUsers: number;
    totalRegularMeals: number;
    totalGuestMeals: number;
    totalSpecialMealsCount: number;
    totalRegularCharges: number;
    totalGuestCharges: number;
    totalMonthlyFees: number;
    totalWalletDeductions: number;
    totalRechargesReceived: number;
    totalCashPaidGuestMeals: number;
  };
  membersSummary: Array<{
    userId: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    userType: string;
    department?: string;
    studentId?: string;
    roomNumber?: string;
    hostelName?: string;
    breakfastCount: number;
    lunchCount: number;
    dinnerCount: number;
    totalRegularMeals: number;
    regularMealCharges: number;
    guestBreakfastCount: number;
    guestLunchCount: number;
    guestDinnerCount: number;
    totalGuestMeals: number;
    guestMealCharges: number;
    monthlyFee: number;
    totalRechargesReceived: number;
    totalDeductions: number;
    currentWalletBalance: number;
  }>;
  dailyKitchenSummary: Array<{
    date: string;
    dayOfWeek: string;
    regularBreakfast: number;
    regularLunch: number;
    regularDinner: number;
    guestBreakfast: number;
    guestLunch: number;
    guestDinner: number;
    totalBreakfast: number;
    totalLunch: number;
    totalDinner: number;
    grandTotalMeals: number;
    isEmergencyOff: boolean;
    emergencyReason?: string;
    specialMealTitle?: string;
  }>;
  declarations: Array<{
    userId: string;
    userName: string;
    userPhone: string;
    date: string;
    dayOfWeek: string;
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    sourceType: string;
  }>;
  consumptions: Array<{
    userId: string;
    userName: string;
    userPhone: string;
    date: string;
    dayOfWeek: string;
    mealType: string;
    status: string;
    chargeAmount: number;
    deductedFromWallet: boolean;
  }>;
  guestMeals: Array<{
    id: string;
    userId: string;
    userName: string;
    userPhone: string;
    date: string;
    dayOfWeek: string;
    breakfastCount: number;
    lunchCount: number;
    dinnerCount: number;
    rateTier: string;
    paymentMethod: string;
    chargedAmount: number;
    createdBy?: string;
  }>;
  transactions: Array<{
    id: string;
    userName: string;
    userPhone: string;
    transactionType: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceType?: string;
    note?: string;
    createdAt: string;
  }>;
  specialMeals: Array<{
    title: string;
    date: string;
    mealType: string;
    customRate: number;
    description?: string;
    isRecurring: boolean;
  }>;
}

export function downloadArchiveExcel(data: ArchiveDataPayload) {
  const workbook = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const overviewRows = [
    { Key: 'আর্কাইভ রিপোর্ট শিরোনাম (Title)', Value: 'মেস ডাটা আর্কাইভ রিপোর্ট' },
    { Key: 'আর্কাইভ সময়কাল (Period)', Value: data.period.periodLabel },
    { Key: 'আর্কাইভ তারিখ (Archived At)', Value: new Date(data.archivedAt).toLocaleString('bn-BD') },
    { Key: 'আর্কাইভকারী অ্যাডমিন (Admin Name)', Value: data.archivedByAdminName },
    { Key: '', Value: '' },
    { Key: '--- মেস ব্যবহারকারী পরিসংখ্যান ---', Value: '' },
    { Key: 'মোট সক্রিয় ব্যবহারকারী (Total Users)', Value: data.summary.totalUsers },
    { Key: 'স্থায়ী সদস্য (Permanent Members)', Value: data.summary.totalPermanentUsers },
    { Key: 'গেস্ট সদস্য (Guest Users)', Value: data.summary.totalGuestUsers },
    { Key: '', Value: '' },
    { Key: '--- খাবারের পরিসংখ্যান ---', Value: '' },
    { Key: 'মোট সাধারণ মিল সংখ্যা (Regular Meals)', Value: data.summary.totalRegularMeals },
    { Key: 'মোট গেস্ট মিল সংখ্যা (Guest Meals)', Value: data.summary.totalGuestMeals },
    { Key: 'মোট মিল সংখ্যা (Grand Total Meals)', Value: data.summary.totalRegularMeals + data.summary.totalGuestMeals },
    { Key: 'স্পেশাল মিল ইভেন্ট সংখ্যা', Value: data.summary.totalSpecialMealsCount },
    { Key: '', Value: '' },
    { Key: '--- আর্থিক হিসাব (BDT ৳) ---', Value: '' },
    { Key: 'সাধারণ মিল বাবদ মোট চার্জ (৳)', Value: data.summary.totalRegularCharges },
    { Key: 'গেস্ট মিল বাবদ মোট চার্জ (৳)', Value: data.summary.totalGuestCharges },
    { Key: 'মাসিক সার্ভিস চার্জ বাবদ মোট (৳)', Value: data.summary.totalMonthlyFees },
    { Key: 'মোট ওয়ালেট ডিক্লেয়ারেশন/কাটতি (৳)', Value: data.summary.totalWalletDeductions },
    { Key: 'মোট ওয়ালেট রিচার্জ প্রাপ্তি (৳)', Value: data.summary.totalRechargesReceived },
    { Key: 'গেস্ট মিল নগদে পরিশোধ (Cash Paid ৳)', Value: data.summary.totalCashPaidGuestMeals },
  ];
  const sheet1 = XLSX.utils.json_to_sheet(overviewRows);
  XLSX.utils.book_append_sheet(workbook, sheet1, 'Executive Overview');

  // 2. Member-Wise Summary Sheet
  const memberRows = data.membersSummary.map((m, idx) => ({
    'ক্রমিক (SL)': idx + 1,
    'নাম (Full Name)': m.fullName,
    'মোবাইল (Phone)': m.phoneNumber,
    'রোল (Role)': m.role,
    'টাইপ (User Type)': m.userType === 'PERMANENT' ? 'স্থায়ী' : 'গেস্ট',
    'ডিপার্টমেন্ট': m.department || '-',
    'স্টুডেন্ট আইডি': m.studentId || '-',
    'রুম নম্বর': m.roomNumber || '-',
    'হোস্টেল': m.hostelName || '-',
    'ব্রেকফাস্ট সংখ্যা': m.breakfastCount,
    'লাঞ্চ সংখ্যা': m.lunchCount,
    'ডিনার সংখ্যা': m.dinnerCount,
    'মোট সাধারণ মিল': m.totalRegularMeals,
    'সাধারণ মিল চার্জ (৳)': m.regularMealCharges,
    'গেস্ট ব্রেকফাস্ট': m.guestBreakfastCount,
    'গেস্ট লাঞ্চ': m.guestLunchCount,
    'গেস্ট ডিনার': m.guestDinnerCount,
    'মোট গেস্ট মিল': m.totalGuestMeals,
    'গেস্ট মিল চার্জ (৳)': m.guestMealCharges,
    'মাসিক ফি (৳)': m.monthlyFee,
    'মাসিক মোট রিচার্জ (৳)': m.totalRechargesReceived,
    'মাসিক মোট কাটতি (৳)': m.totalDeductions,
    'বর্তমান ওয়ালেট ব্যালেন্স (৳)': m.currentWalletBalance,
  }));
  const sheet2 = XLSX.utils.json_to_sheet(memberRows);
  XLSX.utils.book_append_sheet(workbook, sheet2, 'Member Summary');

  // 3. Daily Kitchen & Cook Summary Sheet
  const kitchenRows = data.dailyKitchenSummary.map((k) => ({
    'তারিখ (Date)': k.date,
    'বার (Day)': k.dayOfWeek,
    'সাধারণ নাস্তা': k.regularBreakfast,
    'গেস্ট নাস্তা': k.guestBreakfast,
    'মোট নাস্তা (Breakfast)': k.totalBreakfast,
    'সাধারণ দুপুরের খাবার': k.regularLunch,
    'গেস্ট দুপুরের খাবার': k.guestLunch,
    'মোট লাঞ্চ (Lunch)': k.totalLunch,
    'সাধারণ রাতের খাবার': k.regularDinner,
    'গেস্ট রাতের খাবার': k.guestDinner,
    'মোট ডিনার (Dinner)': k.totalDinner,
    'দিনের মোট মিল (Grand Total)': k.grandTotalMeals,
    'জরুরি বন্ধ (Emergency Off)': k.isEmergencyOff ? `জরুরি বন্ধ (${k.emergencyReason || ''})` : 'স্বাভাবিক',
    'স্পেশাল মিল ইভেন্ট': k.specialMealTitle || '-',
  }));
  const sheet3 = XLSX.utils.json_to_sheet(kitchenRows);
  XLSX.utils.book_append_sheet(workbook, sheet3, 'Daily Kitchen Summary');

  // 4. Detailed Meal Declarations Sheet
  const declarationRows = data.declarations.map((d, idx) => ({
    'ক্রমিক (SL)': idx + 1,
    'সদস্য নাম': d.userName,
    'ফোন': d.userPhone,
    'তারিখ': d.date,
    'বার': d.dayOfWeek,
    'সকালের নাস্তা': d.breakfast ? 'হ্যাঁ (ON)' : 'না (OFF)',
    'দুপুরের খাবার': d.lunch ? 'হ্যাঁ (ON)' : 'না (OFF)',
    'রাতের খাবার': d.dinner ? 'হ্যাঁ (ON)' : 'না (OFF)',
    'উৎস (Source)': d.sourceType,
  }));
  const sheet4 = XLSX.utils.json_to_sheet(declarationRows);
  XLSX.utils.book_append_sheet(workbook, sheet4, 'Declarations');

  // 5. Detailed Meal Consumptions Sheet
  const consumptionRows = data.consumptions.map((c, idx) => ({
    'ক্রমিক (SL)': idx + 1,
    'সদস্য নাম': c.userName,
    'ফোন': c.userPhone,
    'তারিখ': c.date,
    'বার': c.dayOfWeek,
    'মিলের ধরণ': c.mealType === 'BREAKFAST' ? 'নাস্তা' : c.mealType === 'LUNCH' ? 'লাঞ্চ' : 'ডিনার',
    'স্ট্যাটাস (Status)': c.status,
    'চার্জ (৳)': c.chargeAmount,
    'ওয়ালেট থেকে কর্তন': c.deductedFromWallet ? 'হ্যাঁ' : 'না',
  }));
  const sheet5 = XLSX.utils.json_to_sheet(consumptionRows);
  XLSX.utils.book_append_sheet(workbook, sheet5, 'Consumptions');

  // 6. Guest Meals Log Sheet
  const guestMealRows = data.guestMeals.map((g, idx) => ({
    'ক্রমিক (SL)': idx + 1,
    'হোস্ট সদস্য নাম': g.userName,
    'হোস্ট ফোন': g.userPhone,
    'তারিখ': g.date,
    'বার': g.dayOfWeek,
    'গেস্ট ব্রেকফাস্ট সংখ্যা': g.breakfastCount,
    'গেস্ট লাঞ্চ সংখ্যা': g.lunchCount,
    'গেস্ট ডিনার সংখ্যা': g.dinnerCount,
    'রেট টায়ার': g.rateTier === 'PERMANENT' ? 'স্থায়ী রেট' : 'গেস্ট রেট',
    'পেমেন্ট মেথড': g.paymentMethod === 'WALLET' ? 'ওয়ালেট' : 'নগদ/ক্যাশ',
    'মোট চার্জ (৳)': g.chargedAmount,
  }));
  const sheet6 = XLSX.utils.json_to_sheet(guestMealRows);
  XLSX.utils.book_append_sheet(workbook, sheet6, 'Guest Meals');

  // 7. Wallet Transactions History Sheet
  const transactionRows = data.transactions.map((t, idx) => ({
    'ক্রমিক (SL)': idx + 1,
    'লেনদেন নম্বর (ID)': t.id,
    'সদস্য নাম': t.userName,
    'ফোন': t.userPhone,
    'ট্রানজেকশন টাইপ': t.transactionType,
    'পরিমাণ (৳)': t.amount,
    'পূর্বের ব্যালেন্স (৳)': t.balanceBefore,
    'পরের ব্যালেন্স (৳)': t.balanceAfter,
    'রেফারেন্স టైপ': t.referenceType || '-',
    'নোট/বিবরণ': t.note || '-',
    'তারিখ ও সময়': new Date(t.createdAt).toLocaleString('bn-BD'),
  }));
  const sheet7 = XLSX.utils.json_to_sheet(transactionRows);
  XLSX.utils.book_append_sheet(workbook, sheet7, 'Transactions Ledger');

  // 8. Special Meals Sheet
  const specialMealRows = data.specialMeals.map((s, idx) => ({
    'ক্রমিক (SL)': idx + 1,
    'ইভেন্ট শিরোনাম': s.title,
    'তারিখ': s.date,
    'খাবারের সময়': s.mealType === 'BREAKFAST' ? 'নাস্তা' : s.mealType === 'LUNCH' ? 'লাঞ্চ' : 'ডিনার',
    'কাস্টম রেট (৳)': s.customRate,
    'বিবরণ': s.description || '-',
    'পুনরাবৃত্তি': s.isRecurring ? 'প্রতি সপ্তাহে' : 'একবার',
  }));
  const sheet8 = XLSX.utils.json_to_sheet(specialMealRows);
  XLSX.utils.book_append_sheet(workbook, sheet8, 'Special Meals');

  // Set column widths for better legibility
  const sheets = [sheet1, sheet2, sheet3, sheet4, sheet5, sheet6, sheet7, sheet8];
  sheets.forEach((sh) => {
    sh['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  });

  // Generate binary output and trigger browser file save
  const safeFilename = `Meal_Management_Archive_${data.period.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, safeFilename);
}

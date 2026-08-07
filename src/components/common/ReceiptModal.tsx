import React from 'react';
import { X, Printer, CheckCircle2, Shield, UtensilsCrossed, Calendar, Sparkles, User, Phone, Home, CreditCard, ArrowDownRight, Clock, ShieldCheck, QrCode } from 'lucide-react';
import { WalletTransaction, User as UserType, MealDeclaration, MealRateConfig } from '../../types';

interface ReceiptModalProps {
  transaction: WalletTransaction | null;
  user: UserType | null;
  admin?: UserType | null;
  declarations?: MealDeclaration[];
  rates?: MealRateConfig;
  onClose: () => void;
}

const DEFAULT_RATES: MealRateConfig = {
  permanent: { breakfast: 30, lunch: 60, dinner: 60, monthlyCharge: 300 },
  guest: { breakfast: 40, lunch: 80, dinner: 80, monthlyCharge: 0 },
  globalMealStatus: { breakfast: true, lunch: true, dinner: true },
  cutoffTime: "10:00",
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  user,
  admin,
  declarations = [],
  rates = DEFAULT_RATES,
  onClose,
}) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(transaction.date).toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate User Average Meal Consumption & Estimated Finish Date
  const userDecs = declarations.filter((d) => d.userId === (user?.id || transaction.userId));
  const activeRateConfig = user?.userType === 'GUEST' ? rates.guest : rates.permanent;

  let avgDailySpend = 0;
  let avgMealsPerDay = 3;
  let isEstimatedFallback = true;

  if (userDecs.length > 0) {
    const totalDays = userDecs.length;
    const totalBreakfast = userDecs.filter((d) => d.breakfast).length;
    const totalLunch = userDecs.filter((d) => d.lunch).length;
    const totalDinner = userDecs.filter((d) => d.dinner).length;

    const avgB = totalBreakfast / totalDays;
    const avgL = totalLunch / totalDays;
    const avgD = totalDinner / totalDays;
    avgMealsPerDay = avgB + avgL + avgD;

    const dailyShareOfMonthly = (activeRateConfig.monthlyCharge || 0) / 30;
    avgDailySpend = (avgB * activeRateConfig.breakfast) +
                    (avgL * activeRateConfig.lunch) +
                    (avgD * activeRateConfig.dinner) +
                    dailyShareOfMonthly;
    isEstimatedFallback = false;
  }

  // Fallback to standard 3 meals per day if no past history exists
  if (avgDailySpend <= 0) {
    const dailyShareOfMonthly = (activeRateConfig.monthlyCharge || 0) / 30;
    avgDailySpend = activeRateConfig.breakfast + activeRateConfig.lunch + activeRateConfig.dinner + dailyShareOfMonthly;
    avgMealsPerDay = 3.0;
    isEstimatedFallback = true;
  }

  // Calculate estimated days remaining based on balance after recharge
  const currentBalance = Math.max(0, transaction.balanceAfter);
  const estimatedDaysRemaining = avgDailySpend > 0 ? Math.floor(currentBalance / avgDailySpend) : 0;

  // Calculate estimated exhaustion date
  const txDateObj = new Date(transaction.date);
  const finishDateObj = new Date(txDateObj);
  finishDateObj.setDate(finishDateObj.getDate() + estimatedDaysRemaining);

  const formattedFinishDate = finishDateObj.toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const securityHash = `SEC-${transaction.id.slice(-6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print:block print:inset-auto print:static overflow-y-auto">
      
      {/* Luxury Voucher Card */}
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/60 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-cyan-950/50 overflow-hidden print:shadow-none print:border-none print:bg-white print:text-black print:rounded-none print:max-w-none print:p-8">
        
        {/* Glowing Top Ambient Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none print:hidden" />
        <div className="absolute -bottom-24 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />

        {/* Close Button (Hidden when printing) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 transition-all print:hidden z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="relative text-center pb-5 border-b border-slate-800/80 print:border-gray-300">
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-sky-400 p-0.5 shadow-lg shadow-cyan-500/25 print:shadow-none">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center print:bg-white">
                <UtensilsCrossed className="w-5 h-5 text-cyan-400 print:text-black" />
              </div>
            </div>
          </div>

          <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 print:bg-gray-100 print:text-black print:border-gray-300">
            ডিজিটাল ক্যাশ মেমো ও ভাউচার
          </span>

          <h2 className="text-xl font-extrabold text-white print:text-black font-display mt-2">
            মেস ম্যানেজমেন্ট ক্যাশ রসিদ
          </h2>
          <p className="text-xs text-slate-400 print:text-gray-600">মেস / হোস্টেল ক্যাশ রিচার্জ বিবরণী</p>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-xl font-mono text-[11px] font-bold bg-slate-950 text-cyan-300 border border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300">
              VOUCHER ID: {transaction.id.toUpperCase()}
            </span>
          </div>

        </div>

        {/* User & Transaction Detail Grid */}
        <div className="py-4 space-y-2.5 text-xs">
          
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 print:bg-gray-50 print:border-gray-200">
            <div>
              <span className="text-[10px] text-slate-400 print:text-gray-500 font-semibold block">গ্রাহকের নাম</span>
              <span className="font-bold text-slate-100 print:text-black text-sm">{user?.name || 'অনুমোদিত মেম্বার'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-gray-500 font-semibold block">মোবাইল নম্বর</span>
              <span className="font-mono font-bold text-cyan-300 print:text-black text-xs">{user?.phone || 'N/A'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="flex justify-between py-1.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/50 print:bg-white print:border-gray-100">
              <span className="text-slate-400 print:text-gray-500">মেম্বারশিপ ধরণ:</span>
              <span className="font-bold text-slate-200 print:text-black">
                {user?.userType === 'PERMANENT' ? 'স্থায়ী মেম্বার' : 'গেস্ট মেম্বার'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/50 print:bg-white print:border-gray-100">
              <span className="text-slate-400 print:text-gray-500">অনুমোদনকারী:</span>
              <span className="font-bold text-slate-200 print:text-black">
                {admin?.name ? admin.name : (transaction.adminId ? `Admin (${transaction.adminId})` : 'মেস এডমিন')}
              </span>
            </div>
          </div>

          {user?.profile?.roomNumber && (
            <div className="flex justify-between py-1.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/50 print:bg-white print:border-gray-100">
              <span className="text-slate-400 print:text-gray-500">মেস স্থান (রুম ও সিট):</span>
              <span className="font-bold text-cyan-300 print:text-black">
                রুম {user.profile.roomNumber} {user.profile.seatNumber ? `(সিট ${user.profile.seatNumber})` : ''}
              </span>
            </div>
          )}

          <div className="flex justify-between py-1.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/50 print:bg-white print:border-gray-100">
            <span className="text-slate-400 print:text-gray-500">লেনদেনের তারিখ ও সময়:</span>
            <span className="font-medium text-slate-200 print:text-black font-sans">{formattedDate}</span>
          </div>

          <div className="flex justify-between py-1.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/50 print:bg-white print:border-gray-100">
            <span className="text-slate-400 print:text-gray-500">পেমেন্ট মেথড / নোট:</span>
            <span className="font-semibold text-emerald-400 print:text-black">{transaction.description}</span>
          </div>

        </div>

        {/* Transaction Amount Hero Box */}
        {(() => {
          const isRefund = transaction.type === 'REFUND';
          const isDeduction = ['MEAL_DEDUCTION', 'DEBIT'].includes(transaction.type);
          const isMonthly = transaction.type === 'MONTHLY_CHARGE';
          const isCash = transaction.type === 'CASH_PAID';
          const isDiscount = transaction.type === 'DISCOUNT';
          const isPenalty = transaction.type === 'PENALTY';

          let heroTitle = 'মোট পরিশোধিত রিচার্জ পরিমাণ';
          let sign = '+';
          let textColor = 'text-emerald-400 print:text-emerald-700';

          if (isRefund) {
            heroTitle = 'মিল বন্ধের রিফান্ড জমাকৃত পরিমাণ';
            sign = '+';
            textColor = 'text-cyan-300 print:text-cyan-700';
          } else if (isDiscount) {
            heroTitle = 'বিশেষ ছাড় / ডিসকাউন্ট জমাকৃত পরিমাণ';
            sign = '+';
            textColor = 'text-emerald-300 print:text-emerald-700';
          } else if (isPenalty) {
            heroTitle = 'জরিমানা / পেনাল্টি কর্তন পরিমাণ';
            sign = '-';
            textColor = 'text-rose-400 print:text-rose-700';
          } else if (isDeduction) {
            heroTitle = 'মিল খাবার ফি কর্তন পরিমাণ';
            sign = '-';
            textColor = 'text-rose-400 print:text-rose-700';
          } else if (isMonthly) {
            heroTitle = 'মাসিক মেস ফি কর্তন পরিমাণ';
            sign = '-';
            textColor = 'text-amber-300 print:text-amber-700';
          } else if (isCash) {
            heroTitle = 'হাতে গ্রহণকৃত নগদ ফি পরিমাণ';
            sign = '+';
            textColor = 'text-purple-300 print:text-purple-700';
          }

          return (
            <div className="my-3 p-5 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 border border-slate-800 text-center print:bg-gray-50 print:border-gray-300 relative overflow-hidden shadow-inner">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider print:text-gray-600">
                {heroTitle}
              </span>

              <div className={`text-4xl font-black my-1.5 font-sans ${textColor} flex items-center justify-center gap-1`}>
                {sign && <span className="text-2xl">{sign}</span>} ৳{transaction.amount}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/80 print:border-gray-300 text-xs">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 print:text-gray-500 block">পূর্বের ব্যালেন্স</span>
                  <span className="font-extrabold text-slate-300 print:text-black font-mono text-sm">৳{transaction.balanceBefore}</span>
                </div>
                <div className="text-center border-l border-slate-800/80 print:border-gray-300">
                  <span className="text-[10px] text-slate-400 print:text-gray-500 block">আপডেটকৃত ব্যালেন্স</span>
                  <span className="font-extrabold text-emerald-300 print:text-emerald-800 font-mono text-sm">৳{transaction.balanceAfter}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Average Meal Consumption & Estimated Finish Date Assumption Box */}
        <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-cyan-950/20 to-slate-950 border border-cyan-500/30 text-left print:bg-gray-50 print:border-gray-300 space-y-3 shadow-lg">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-300 print:text-black font-bold text-xs font-display">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>মিল মেয়াদের পূর্বাভাস (Meal Run-Out Estimation)</span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono print:bg-gray-200 print:text-black font-bold">
              {isEstimatedFallback ? 'স্ট্যান্ডার্ড হিসেব' : 'গড় মিল ভিত্তিক'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 print:bg-white print:border-gray-200 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 print:text-gray-500">গড় দৈনিক খাবার খরচ</span>
              <div className="my-1">
                <span className="font-extrabold text-slate-100 print:text-black font-mono text-base">
                  ~৳{Math.round(avgDailySpend)}
                </span>
                <span className="text-[11px] text-slate-400 font-sans"> / দিন</span>
              </div>
              <span className="text-[10px] text-cyan-400 print:text-gray-600 font-medium">
                (গড়ে {avgMealsPerDay.toFixed(1)} টি মিল/দিন)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 print:bg-emerald-50 print:border-emerald-200 flex flex-col justify-between">
              <span className="text-[10px] text-emerald-300 print:text-emerald-800 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                আনুমানিক শেষ তারিখ
              </span>
              <div className="my-1">
                <span className="font-extrabold text-emerald-300 print:text-emerald-800 font-sans text-sm block">
                  {formattedFinishDate}
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 print:text-emerald-900 font-extrabold font-mono">
                (আর প্রায় {estimatedDaysRemaining} দিন চলবে)
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 print:text-gray-600 leading-relaxed italic border-t border-slate-800/60 print:border-gray-200 pt-2">
            💡 <strong className="not-italic text-slate-300 print:text-black">বিশেষ নোট:</strong> এটি আপনার দৈনিক গড় মিল গ্রহণ (Avg {avgMealsPerDay.toFixed(1)} meals) ও নির্ধারিত মেস চার্জ অনুযায়ী স্বয়ংক্রিয় গাণিতিক অনুমান। মিল অন/অফ বা অতিরিক্ত মিল চালুর ভিত্তিতে উক্ত মেয়াদী তারিখ পরিবর্তিত হতে পারে।
          </p>

        </div>

        {/* QR Code & Security Stamp Block */}
        <div className="my-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between print:bg-white print:border-gray-200">
          
          <div className="flex items-center gap-3">
            {/* Visual SVG QR Code Block */}
            <div className="w-14 h-14 bg-white p-1 rounded-xl flex items-center justify-center shrink-0 border border-slate-700 print:border-black">
              <svg viewBox="0 0 24 24" className="w-full h-full text-black fill-current">
                <rect x="2" y="2" width="7" height="7" fill="black" />
                <rect x="3" y="3" width="5" height="5" fill="white" />
                <rect x="4" y="4" width="3" height="3" fill="black" />
                
                <rect x="15" y="2" width="7" height="7" fill="black" />
                <rect x="16" y="3" width="5" height="5" fill="white" />
                <rect x="17" y="4" width="3" height="3" fill="black" />
                
                <rect x="2" y="15" width="7" height="7" fill="black" />
                <rect x="3" y="16" width="5" height="5" fill="white" />
                <rect x="4" y="17" width="3" height="3" fill="black" />
                
                <rect x="10" y="2" width="3" height="3" fill="black" />
                <rect x="10" y="7" width="2" height="4" fill="black" />
                <rect x="13" y="10" width="3" height="3" fill="black" />
                <rect x="10" y="15" width="4" height="2" fill="black" />
                <rect x="15" y="15" width="3" height="3" fill="black" />
                <rect x="19" y="19" width="3" height="3" fill="black" />
                <rect x="10" y="19" width="3" height="3" fill="black" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 print:text-emerald-700 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>সফলভাবে সম্পন্ন ও সত্যায়িত</span>
              </div>
              <p className="text-[10px] text-slate-400 print:text-gray-500 font-mono mt-0.5">
                {securityHash}
              </p>
              <p className="text-[9px] text-slate-500 print:text-gray-400">
                ডিজিটাল মেস ওয়ালেট সিকিউরিটি ভাউচার
              </p>
            </div>
          </div>

          <div className="hidden sm:block text-right shrink-0">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 print:bg-gray-100 print:text-black font-mono">
              PAID & VERIFIED
            </span>
          </div>

        </div>

        {/* Printable Formal Voucher Signatures & Authorization (Print Only) */}
        <div className="hidden print:block pt-8 mt-6 print-avoid-break border-t-2 border-black">
          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-t border-black pt-1 font-bold text-black w-44 mx-auto">
                গ্রাহক / মেম্বারের স্বাক্ষর
              </div>
              <p className="text-[8pt] text-gray-700 mt-0.5">(জমা প্রদানকারী / গ্রহণকারী)</p>
            </div>
            <div>
              <div className="border-t border-black pt-1 font-bold text-black w-44 mx-auto">
                ক্যাশিয়ার / এডমিন সীল ও স্বাক্ষর
              </div>
              <p className="text-[8pt] text-gray-700 mt-0.5">(অনুমোদনকারী মেস এডমিন)</p>
            </div>
          </div>

          <div className="mt-5 flex justify-between items-center text-[8pt] text-gray-600 border-t border-gray-300 pt-1.5 font-mono">
            <span>কপি: ১ম কপি - মেস অফিস ফাইল | ২য় কপি - গ্রাহক নথি</span>
            <span>প্রিন্ট সময়: {new Date().toLocaleString('bn-BD')}</span>
          </div>
        </div>

        {/* Printable Action Buttons */}
        <div className="mt-5 flex items-center gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all active:scale-95 font-display"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট / PDF ভাউচার সেভ করুন</span>
          </button>
        </div>

      </div>
    </div>
  );
};



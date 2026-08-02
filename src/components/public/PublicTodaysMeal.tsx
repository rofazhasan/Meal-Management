import React, { useState, useMemo } from 'react';
import { 
  Utensils, 
  Sun, 
  Moon, 
  Coffee, 
  Search, 
  Eye, 
  LogIn, 
  Lock, 
  Sparkles, 
  Phone, 
  Wallet, 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle,
  ShieldAlert,
  ArrowRight,
  Banknote,
  Coins,
  TrendingUp
} from 'lucide-react';
import { User, MealDeclaration, MealRateConfig } from '../../types';
import { BN } from '../../constants/banglaText';
import { AppLogo } from '../common/AppLogo';
import { getBangladeshDateStr } from '../../utils/dateUtils';

interface PublicTodaysMealProps {
  users: User[];
  declarations: MealDeclaration[];
  rates?: MealRateConfig;
  onNavigateToLogin: () => void;
  currentUser?: User | null;
}

export const PublicTodaysMeal: React.FC<PublicTodaysMealProps> = ({
  users,
  declarations,
  rates,
  onNavigateToLogin,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);

  const todayStr = getBangladeshDateStr();

  // Format Bangla Date Display
  const formattedTodayBangla = useMemo(() => {
    const d = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return d.toLocaleDateString('bn-BD', options);
  }, []);

  // Filter approved users only
  const approvedUsers = useMemo(() => {
    return users.filter((u) => u.status === 'APPROVED');
  }, [users]);

  // Today's declarations map
  const todayDeclarationsMap = useMemo(() => {
    const map = new Map<string, MealDeclaration>();
    declarations
      .filter((d) => d.date === todayStr)
      .forEach((d) => map.set(d.userId, d));
    return map;
  }, [declarations, todayStr]);

  // Overall Statistics for Today (Counts & Financial Amounts)
  const stats = useMemo(() => {
    let breakfast = 0;
    let lunch = 0;
    let dinner = 0;

    let breakfastMoney = 0;
    let lunchMoney = 0;
    let dinnerMoney = 0;

    const permRates = rates?.permanent || { breakfast: 40, lunch: 70, dinner: 70, monthlyCharge: 500 };
    const guestRates = rates?.guest || { breakfast: 50, lunch: 85, dinner: 85, monthlyCharge: 0 };

    approvedUsers.forEach((u) => {
      const dec = todayDeclarationsMap.get(u.id);
      const userRates = u.userType === 'GUEST' ? guestRates : permRates;
      
      if (dec) {
        if (dec.breakfast) {
          breakfast += 1;
          breakfastMoney += userRates.breakfast;
        }
        if (dec.lunch) {
          lunch += 1;
          lunchMoney += userRates.lunch;
        }
        if (dec.dinner) {
          dinner += 1;
          dinnerMoney += userRates.dinner;
        }
      }
    });

    const totalMeals = breakfast + lunch + dinner;
    const totalMealMoney = breakfastMoney + lunchMoney + dinnerMoney;

    return { 
      breakfast, 
      lunch, 
      dinner, 
      totalMeals, 
      breakfastMoney, 
      lunchMoney, 
      dinnerMoney, 
      totalMealMoney, 
      totalUsers: approvedUsers.length 
    };
  }, [approvedUsers, todayDeclarationsMap, rates]);

  // Filtered Users based on Search
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return approvedUsers;
    const term = searchTerm.toLowerCase();
    return approvedUsers.filter((u) => 
      u.name.toLowerCase().includes(term) ||
      u.phone.includes(term) ||
      (u.profile?.department && u.profile.department.toLowerCase().includes(term))
    );
  }, [approvedUsers, searchTerm]);

  // Phone masking function: e.g., 017000000***
  const maskPhone = (phone: string): string => {
    if (!phone) return '017000000***';
    if (phone.length >= 8) {
      return phone.substring(0, 4) + '00000***';
    }
    return phone.substring(0, 3) + '***';
  };

  // Money balance masking function: e.g., ৳ *00 or ৳ 1*00
  const maskMoney = (amount: number): string => {
    if (isNaN(amount)) return '৳ *00';
    const amountStr = Math.max(0, Math.floor(amount)).toString();
    if (amountStr.length <= 2) return '৳ *00';
    const firstPart = amountStr.substring(0, amountStr.length - 2);
    return `৳ ${firstPart}*00`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 animate-fade-in font-sans">
      
      {/* Top Hero Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/20 shadow-2xl relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-cyan-950/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <AppLogo size="md" />
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                {formattedTodayBangla}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
              {BN.publicTodaysMealTitle}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {BN.publicTodaysMealSubtitle}
            </p>
          </div>

          {/* Action Button: Login */}
          {!currentUser ? (
            <button
              onClick={onNavigateToLogin}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2.5 shrink-0 font-display"
            >
              <LogIn className="w-4 h-4" />
              <span>{BN.loginToSeeDetails}</span>
            </button>
          ) : (
            <div className="px-4 py-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>আপনি {currentUser.name} হিসেবে লগইন আছেন</span>
            </div>
          )}
        </div>

        {/* Security Notice Pill */}
        <div className="mt-6 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3 text-slate-300 text-xs font-medium">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <p className="leading-relaxed">
            {BN.publicNoticeBanner}
          </p>
        </div>
      </div>

      {/* Today's Meal & Financial Grand Breakdown Card */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-slate-900/90 via-emerald-950/20 to-slate-900/90 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 font-sans">আজকের মেসের মোট মিলের আনুমানিক মূল্য / টাকা (Grand Total)</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight flex items-baseline gap-2">
                <span>৳ {stats.totalMealMoney.toLocaleString('bn-BD')}</span>
                <span className="text-xs font-normal text-emerald-300/70 font-sans">আজকের সর্বমোট বরাদ্দ</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 shrink-0">
            <Coins className="w-5 h-5 text-amber-400" />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-sans">সর্বমোট মিল সংখ্যা</span>
              <span className="text-base font-extrabold text-white font-mono">{stats.totalMeals} টি</span>
            </div>
          </div>
        </div>

        {/* Meal Numbers & Money Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {/* Breakfast Breakdown */}
          <div className="glass-card p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-1">
            <div className="flex items-center justify-between text-amber-300 text-xs font-medium">
              <span>সকালের নাস্তা</span>
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-extrabold text-white font-mono">{stats.breakfast} টি</div>
            <div className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1">
              <span>৳ {stats.breakfastMoney}</span>
              <span className="text-[10px] font-normal text-amber-300/70 font-sans">(মোট খরচ)</span>
            </div>
          </div>

          {/* Lunch Breakdown */}
          <div className="glass-card p-3.5 rounded-2xl border border-sky-500/20 bg-sky-500/5 space-y-1">
            <div className="flex items-center justify-between text-sky-300 text-xs font-medium">
              <span>দুপুরের খাবার</span>
              <Sun className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-extrabold text-white font-mono">{stats.lunch} টি</div>
            <div className="text-xs font-bold text-sky-400 font-mono flex items-center gap-1">
              <span>৳ {stats.lunchMoney}</span>
              <span className="text-[10px] font-normal text-sky-300/70 font-sans">(মোট খরচ)</span>
            </div>
          </div>

          {/* Dinner Breakdown */}
          <div className="glass-card p-3.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-1">
            <div className="flex items-center justify-between text-indigo-300 text-xs font-medium">
              <span>রাতের খাবার</span>
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-extrabold text-white font-mono">{stats.dinner} টি</div>
            <div className="text-xs font-bold text-indigo-400 font-mono flex items-center gap-1">
              <span>৳ {stats.dinnerMoney}</span>
              <span className="text-[10px] font-normal text-indigo-300/70 font-sans">(মোট খরচ)</span>
            </div>
          </div>

          {/* Active Members Count */}
          <div className="glass-card p-3.5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 space-y-1">
            <div className="flex items-center justify-between text-cyan-300 text-xs font-medium">
              <span>সক্রিয় মেম্বার</span>
              <Users className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-extrabold text-white font-mono">{stats.totalUsers} জন</div>
            <div className="text-xs font-bold text-cyan-400 font-mono flex items-center gap-1">
              <span>{stats.totalMeals} টি মিল</span>
              <span className="text-[10px] font-normal text-cyan-300/70 font-sans">(আজ)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Resident List Section */}
      <div className="space-y-4">
        {/* Search Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display flex items-center gap-2">
              <Utensils className="w-5 h-5 text-cyan-400" />
              <span>মেম্বারদের মিল তালিকা ({filteredUsers.length})</span>
            </h2>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="নাম বা ফোন দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const dec = todayDeclarationsMap.get(u.id);
            const bOn = dec ? dec.breakfast : false;
            const lOn = dec ? dec.lunch : false;
            const dOn = dec ? dec.dinner : false;
            const userTotalMeals = (bOn ? 1 : 0) + (lOn ? 1 : 0) + (dOn ? 1 : 0);

            return (
              <div
                key={u.id}
                className="glass-card p-5 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 space-y-4 relative group"
              >
                {/* Top Row: User Name & Type Badge */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-base font-display group-hover:text-cyan-300 transition-colors">
                      {u.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {maskPhone(u.phone)}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                    u.userType === 'GUEST'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {u.userType === 'GUEST' ? 'গেস্ট' : 'স্থায়ী'}
                  </span>
                </div>

                {/* Middle Row: Today's Meals Breakdown */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    আজকের মিল স্ট্যাটাস:
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Breakfast Pill */}
                    <div className={`p-2 rounded-xl text-center border transition-colors ${
                      bOn
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500'
                    }`}>
                      <div className="text-[10px] font-medium font-sans">সকাল</div>
                      <div className="text-xs font-bold font-mono mt-0.5">
                        {bOn ? 'চালু (১)' : 'বন্ধ (০)'}
                      </div>
                    </div>

                    {/* Lunch Pill */}
                    <div className={`p-2 rounded-xl text-center border transition-colors ${
                      lOn
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500'
                    }`}>
                      <div className="text-[10px] font-medium font-sans">দুপুর</div>
                      <div className="text-xs font-bold font-mono mt-0.5">
                        {lOn ? 'চালু (১)' : 'বন্ধ (০)'}
                      </div>
                    </div>

                    {/* Dinner Pill */}
                    <div className={`p-2 rounded-xl text-center border transition-colors ${
                      dOn
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500'
                    }`}>
                      <div className="text-[10px] font-medium font-sans">রাত</div>
                      <div className="text-xs font-bold font-mono mt-0.5">
                        {dOn ? 'চালু (১)' : 'বন্ধ (০)'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Masked Balance & Eye Icon Action */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  {/* Masked Money */}
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">ব্যালেন্স</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {maskMoney(u.walletBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Eye Action Button */}
                  <button
                    onClick={() => setSelectedUserForModal(u)}
                    title={BN.clickEyeToLogin}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all active:scale-95 group/btn"
                  >
                    <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform text-cyan-400" />
                    <span>বিস্তারিত</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-300 font-display">কোনো মেম্বার পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-500 font-sans">আপনার কাঙ্ক্ষিত অনুসন্ধানের সাথে কোনো রেকর্ড মিলছে না</p>
          </div>
        )}
      </div>

      {/* Eye Click Redirect Dialog Modal */}
      {selectedUserForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/40 max-w-md w-full text-center space-y-5 shadow-2xl animate-scale-in relative">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
              <Eye className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white font-display">
                {selectedUserForModal.name}
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                পূর্ণাঙ্গ মোবাইল নম্বর, আসল ওয়ালেট ব্যালেন্স এবং আগের দিনের সকল মিলের বিস্তারিত ইতিহাস দেখতে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন।
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>ফোন নম্বর (সুরক্ষিত):</span>
                <span className="font-mono text-white">{maskPhone(selectedUserForModal.phone)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ব্যালেন্স (সুরক্ষিত):</span>
                <span className="font-mono text-emerald-400">{maskMoney(selectedUserForModal.walletBalance)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedUserForModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-all active:scale-95"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={() => {
                  setSelectedUserForModal(null);
                  onNavigateToLogin();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/25 hover:scale-95 transition-all flex items-center justify-center gap-1.5 font-display"
              >
                <LogIn className="w-4 h-4" />
                <span>লগইন করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

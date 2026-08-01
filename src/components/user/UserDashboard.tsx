import React, { useState, useEffect } from 'react';
import { Wallet, Clock, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Calendar, AlertCircle, UtensilsCrossed, Sparkles, ShieldAlert, ChevronRight } from 'lucide-react';
import { User, MealRateConfig, MealDeclaration, WalletTransaction, EmergencyClosure } from '../../types';
import { BN } from '../../constants/banglaText';
import { StatusBadge } from '../common/StatusBadge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { MockService } from '../../services/mockStorage';

interface UserDashboardProps {
  currentUser: User;
  rates: MealRateConfig;
  declarations: MealDeclaration[];
  transactions: WalletTransaction[];
  emergencies: EmergencyClosure[];
  onNavigateTab: (tab: 'meals' | 'wallet' | 'reports') => void;
  onRefreshData: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  rates,
  declarations,
  transactions,
  emergencies,
  onNavigateTab,
  onRefreshData,
}) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isPassed10AM, setIsPassed10AM] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const userRates = currentUser.userType === 'PERMANENT' ? rates.permanent : rates.guest;

  const todayDec = declarations.find(d => d.date === todayStr) || {
    id: 'temp',
    userId: currentUser.id,
    date: todayStr,
    breakfast: true,
    lunch: true,
    dinner: true,
    isAutoCopied: false,
    updatedAt: new Date().toISOString(),
  };

  const todayEmergency = emergencies.find(e => e.date === todayStr);

  // Live 10 AM Deadline Calculator
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(10, 0, 0, 0);

      if (now > cutoff) {
        setIsPassed10AM(true);
        setTimeLeft('আজকের ১০:০০ AM ডেডলাইন শেষ');
      } else {
        setIsPassed10AM(false);
        const diffMs = cutoff.getTime() - now.getTime();
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeLeft(`${hrs} ঘণ্টা ${mins} মিনিট ${secs} সেকেন্ড বাকি`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleTodayMeal = async (meal: 'breakfast' | 'lunch' | 'dinner') => {
    if (isPassed10AM) {
      alert(BN.deadlinePassedWarning);
      return;
    }
    const newMeals = {
      breakfast: todayDec.breakfast,
      lunch: todayDec.lunch,
      dinner: todayDec.dinner,
      [meal]: !todayDec[meal],
    };
    await MockService.updateDeclaration(currentUser.id, todayStr, newMeals);
    onRefreshData();
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto animate-scale-in">
      
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
                স্বাগতম, {currentUser.name}!
              </h2>
              <StatusBadge userType={currentUser.userType} />
              <StatusBadge status={currentUser.status} />
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
              রুম নম্বর: <span className="text-slate-200 font-bold">{currentUser.roomNo || 'নির্ধারিত নয়'}</span> • ফোন: <span className="font-mono text-cyan-300">{currentUser.phone}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('meals')}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/25 active:scale-95 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>মিল প্ল্যান পরিবর্তন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Indefinite Pause Banner */}
      {currentUser.isIndefinitelyPaused && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm font-display text-amber-300">মিল সুবিধা অনির্দিষ্টকালের জন্য স্থগিত রাখা আছে</h4>
              <p className="text-xs text-amber-200/80">মিল আবার চালু করতে "মিল প্ল্যান পরিবর্তন" ট্যাবে গিয়ে "মিল চালু করুন" সিলেক্ট করুন।</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('meals')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-bold shrink-0"
          >
            অন করুন
          </button>
        </div>
      )}

      {/* Emergency Notice Alert */}
      {todayEmergency && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-center gap-3 shadow-lg shadow-rose-950/20 backdrop-blur-md animate-slide-up">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
          <div>
            <h4 className="font-bold text-sm font-display text-rose-300">জরুরি নোটিশ: আজকের মিল বন্ধ!</h4>
            <p className="text-xs text-rose-200/80">{todayEmergency.reason}</p>
          </div>
        </div>
      )}

      {/* Hero Grid Cards: Wallet Balance & 10 AM Cutoff Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Luxury Metallic Holographic Wallet Card */}
        <div className="wallet-card-holographic p-6 sm:p-7 rounded-3xl text-white shadow-2xl shadow-sky-950/40 border border-cyan-500/30 flex flex-col justify-between min-h-[220px]">
          
          {/* Card Top Row */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-6 rounded-md bg-gradient-to-tr from-amber-400 to-yellow-200 opacity-90 shadow-inner flex items-center justify-center">
                <div className="w-4 h-3 border border-amber-900/40 rounded-sm" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-200 font-sans">
                {BN.currentBalance}
              </span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 backdrop-blur-md">
              {currentUser.userType === 'PERMANENT' ? 'স্থায়ী সদস্য' : 'গেস্ট সদস্য'}
            </span>
          </div>

          {/* Card Amount Center */}
          <div className="my-4 z-10">
            <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              <AnimatedNumber value={currentUser.walletBalance} prefix={BN.tkSymbol} decimals={0} />
            </div>
            <p className="text-xs text-cyan-200/80 mt-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 inline" />
              মাসিক সার্ভিস চার্জ: ৳{userRates.monthlyCharge} (হিসাবভুক্ত)
            </p>
          </div>

          {/* Card Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20 z-10">
            <button
              onClick={() => onNavigateTab('wallet')}
              className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white transition-colors"
            >
              <span>{BN.wallet} বিস্তারিত & রিচার্জ</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-slate-400 font-mono">
              ID: {currentUser.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* 10 AM Cutoff Timer Block */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Clock className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-display">{BN.deadlineNotice}</h3>
                <p className="text-[11px] text-slate-400 font-sans">প্রতিদিন সকাল ১০:০০ AM এর পূর্বে</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              isPassed10AM ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }`}>
              {isPassed10AM ? 'ডেডলাইন সময় শেষ' : 'সক্রিয়'}
            </span>
          </div>

          <div className="my-5 text-center p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60">
            <div className="text-xl sm:text-2xl font-extrabold text-cyan-400 font-mono tracking-wide">
              {timeLeft}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {BN.autoCopyNotice}
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('meals')}
            className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-slate-200 hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
          >
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>আগামীকালের মিল পছন্দসমূহ পরিচালনা করুন</span>
          </button>
        </div>

      </div>

      {/* Today's Meal Interactive Toggles */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <UtensilsCrossed className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base font-display">{BN.todayMealStatus}</h3>
              <p className="text-xs text-slate-400 font-mono">{todayStr}</p>
            </div>
          </div>
          {todayDec.isAutoCopied && (
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
              {BN.autoCopied}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Breakfast */}
          <div
            onClick={() => handleToggleTodayMeal('breakfast')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
              todayDec.breakfast
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-950/20'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-400">{BN.breakfast}</p>
              <p className="text-xl font-bold mt-1 font-display">
                {todayDec.breakfast ? BN.mealOn : BN.mealOff}
              </p>
              <p className="text-xs font-mono opacity-80 mt-1">৳{userRates.breakfast}</p>
            </div>
            {todayDec.breakfast ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
            ) : (
              <XCircle className="w-8 h-8 text-slate-600 group-hover:scale-110 transition-transform" />
            )}
          </div>

          {/* Lunch */}
          <div
            onClick={() => handleToggleTodayMeal('lunch')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
              todayDec.lunch
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-950/20'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-400">{BN.lunch}</p>
              <p className="text-xl font-bold mt-1 font-display">
                {todayDec.lunch ? BN.mealOn : BN.mealOff}
              </p>
              <p className="text-xs font-mono opacity-80 mt-1">৳{userRates.lunch}</p>
            </div>
            {todayDec.lunch ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
            ) : (
              <XCircle className="w-8 h-8 text-slate-600 group-hover:scale-110 transition-transform" />
            )}
          </div>

          {/* Dinner */}
          <div
            onClick={() => handleToggleTodayMeal('dinner')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
              todayDec.dinner
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-950/20'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-400">{BN.dinner}</p>
              <p className="text-xl font-bold mt-1 font-display">
                {todayDec.dinner ? BN.mealOn : BN.mealOff}
              </p>
              <p className="text-xs font-mono opacity-80 mt-1">৳{userRates.dinner}</p>
            </div>
            {todayDec.dinner ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
            ) : (
              <XCircle className="w-8 h-8 text-slate-600 group-hover:scale-110 transition-transform" />
            )}
          </div>

        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-base font-display">সাম্প্রতিক লেনদেন ইতিহাস</h3>
          <button
            onClick={() => onNavigateTab('wallet')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
          >
            <span>সবগুলো দেখুন</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="কোন লেনদেন রেকর্ড নেই"
            description="এখনও কোনো ডিপোজিট বা চার্জ হিসাব করা হয়নি।"
            actionText="ওয়ালেট দেখুন"
            onAction={() => onNavigateTab('wallet')}
          />
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 3).map((tx) => (
              <div key={tx.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl ${
                    tx.type === 'RECHARGE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {tx.type === 'RECHARGE' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 font-sans">{tx.description}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{tx.date}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-sm font-bold font-mono ${
                    tx.type === 'RECHARGE' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.type === 'RECHARGE' ? '+' : '-'} ৳{tx.amount}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    অবশিষ্ট: ৳{tx.balanceAfter}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

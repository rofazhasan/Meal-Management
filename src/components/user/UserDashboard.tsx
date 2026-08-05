'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Clock, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Calendar, AlertCircle, UtensilsCrossed, Sparkles, ShieldAlert, ChevronRight, UserCheck, Lock, Edit3, X } from 'lucide-react';
import { User, MealRateConfig, MealDeclaration, WalletTransaction, EmergencyClosure, SpecialMeal } from '../../types';
import { BN } from '../../constants/banglaText';
import { StatusBadge } from '../common/StatusBadge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { ApiService } from '../../services/apiService';
import { getBangladeshDateStr, getBangladeshNow } from '../../utils/dateUtils';

interface UserDashboardProps {
  currentUser: User;
  rates: MealRateConfig;
  declarations: MealDeclaration[];
  transactions: WalletTransaction[];
  emergencies: EmergencyClosure[];
  specialMeals?: SpecialMeal[];
  onNavigateTab: (tab: 'meals' | 'wallet' | 'reports') => void;
  onRefreshData: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  rates,
  declarations,
  transactions,
  emergencies,
  specialMeals = [],
  onNavigateTab,
  onRefreshData,
}) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isPassed10AM, setIsPassed10AM] = useState(false);
  
  // Profile Edit State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editPassword, setEditPassword] = useState(currentUser.password || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await ApiService.updateUserProfile(currentUser.id, {
        name: editName,
        password: editPassword,
      });
      alert('আপনার নাম ও পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!');
      setShowProfileModal(false);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setSavingProfile(false);
    }
  };

  const todayStr = getBangladeshDateStr();
  const userRates = currentUser.userType === 'PERMANENT' ? rates.permanent : rates.guest;

  const todayEmergency = emergencies.find(e => todayStr >= e.date && todayStr <= (e.endDate || e.date));

  // todayDec defaults: if emergency, all OFF; otherwise use wallet-safe defaults using correct user rates
  const todayDec = declarations.find(d => d.date === todayStr) || {
    id: 'temp',
    userId: currentUser.id,
    date: todayStr,
    breakfast: !todayEmergency && currentUser.walletBalance >= userRates.breakfast,
    lunch:     !todayEmergency && currentUser.walletBalance >= userRates.lunch,
    dinner:    !todayEmergency && currentUser.walletBalance >= userRates.dinner,
    isAutoCopied: false,
    updatedAt: new Date().toISOString(),
  };

  // Dynamic Cutoff Deadline Calculator in Bangladesh Standard Time (UTC+6)
  useEffect(() => {
    const updateCountdown = () => {
      const cutoffStr = rates.cutoffTime || '10:00';
      const [cutoffHour, cutoffMinute] = cutoffStr.split(':').map(Number);

      const now = getBangladeshNow();
      const cutoff = getBangladeshNow();
      cutoff.setHours(cutoffHour, cutoffMinute, 0, 0);

      if (now > cutoff) {
        setIsPassed10AM(true);
        setTimeLeft(`আজকের ${cutoffStr} ডেডলাইন শেষ`);
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
  }, [rates.cutoffTime]);

  const handleToggleTodayMeal = async (meal: 'breakfast' | 'lunch' | 'dinner') => {
    // Block if emergency is active for today
    if (todayEmergency) {
      alert('জরুরি নোটিশ সক্রিয়! আজকের মিল বন্ধ রাখা হয়েছে। এডমিন কর্তৃক জরুরি বন্ধ চলাকালীন মিল পরিবর্তন করা সম্ভব নয়।');
      return;
    }
    if (isPassed10AM) {
      alert(BN.deadlinePassedWarning);
      return;
    }
    // Block if globally off
    if (
      (meal === 'breakfast' && rates.globalMealStatus?.breakfast === false) ||
      (meal === 'lunch' && rates.globalMealStatus?.lunch === false) ||
      (meal === 'dinner' && rates.globalMealStatus?.dinner === false)
    ) {
      alert('এই মিলটি এডমিন কর্তৃক বিশ্বব্যাপী বন্ধ (Global OFF) রাখা হয়েছে।');
      return;
    }
    // Block if indefinitely paused
    if (currentUser.isIndefinitelyPaused) {
      alert('আপনার মিল সুবিধা অনির্দিষ্টকালের জন্য স্থগিত। মিল প্ল্যান ট্যাবে গিয়ে চালু করুন।');
      return;
    }
    const newMeals = {
      breakfast: todayDec.breakfast,
      lunch: todayDec.lunch,
      dinner: todayDec.dinner,
      [meal]: !todayDec[meal],
    };
    // Wallet balance check: prevent turning ON if total cost exceeds balance
    if (!todayDec[meal]) {
      // User is trying to turn meal ON — check if affordable
      const totalCost =
        (newMeals.breakfast ? userRates.breakfast : 0) +
        (newMeals.lunch ? userRates.lunch : 0) +
        (newMeals.dinner ? userRates.dinner : 0);
      if (totalCost > currentUser.walletBalance) {
        alert(`আপনার ওয়ালেট ব্যালেন্স (৳${currentUser.walletBalance}) দিয়ে এই মিলটি চালু রাখা সম্ভব নয় (প্রয়োজন ৳${totalCost})। মেস এডমিন থেকে রিচার্জ করুন।`);
        return;
      }
    }
    await ApiService.updateDeclaration(currentUser.id, todayStr, newMeals);
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
              ফোন: <span className="font-mono text-cyan-300">{currentUser.phone}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfileModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4 text-cyan-400" />
              <span>প্রোফাইল ও পাসওয়ার্ড আপডেট</span>
            </button>

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

      {/* Low-Balance Warning Banner */}
      {!currentUser.isIndefinitelyPaused && (() => {
        const minMealRate = Math.min(userRates.breakfast, userRates.lunch, userRates.dinner);
        const warningThreshold = minMealRate * 2;
        const isLowBalance = currentUser.walletBalance < warningThreshold;
        if (!isLowBalance) return null;

        const canAffordAny = currentUser.walletBalance >= minMealRate;
        return (
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-500/50 shadow-xl shadow-rose-950/30 animate-slide-up">
            {/* Glow blob */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-sm font-display text-rose-300 mb-1">
                  ⚠️ ওয়ালেট ব্যালেন্স সংকটজনক!
                </h4>
                <p className="text-xs text-rose-200/80 leading-relaxed font-sans">
                  আপনার বর্তমান ব্যালেন্স{' '}
                  <span className="font-bold text-rose-300 font-mono">৳{currentUser.walletBalance}</span>।{' '}
                  {canAffordAny
                    ? `মাত্র ${Math.floor(currentUser.walletBalance / minMealRate)} টি মিল বাকি। শীঘ্রই সিস্টেম স্বয়ংক্রিয়ভাবে মিল বন্ধ করে দিতে পারে।`
                    : 'ব্যালেন্স শেষ! সিস্টেম ইতিমধ্যে নতুন মিল বরাদ্দ বন্ধ করেছে।'}
                </p>
                <p className="text-[11px] text-rose-300/70 mt-1.5 font-sans">
                  মিল চালু রাখতে মেস এডমিনকে রিচার্জের অনুরোধ করুন।
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('wallet')}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30 text-[11px] font-bold transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Wallet className="w-3.5 h-3.5" />
                ওয়ালেট দেখুন
              </button>
            </div>
          </div>
        );
      })()}

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
                <p className="text-[11px] text-slate-400 font-sans">প্রতিদিন {rates.cutoffTime || '10:00'} এর পূর্বে</p>
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
          
          {/* Helper: Is a specific meal currently locked? */}
          {(() => {
            const isLocked = (meal: 'breakfast' | 'lunch' | 'dinner') =>
              !!todayEmergency ||
              currentUser.isIndefinitelyPaused ||
              isPassed10AM ||
              rates.globalMealStatus?.[meal] === false;

            const specB = specialMeals.find((s) => s.date === todayStr && s.mealType === 'breakfast');
            const specL = specialMeals.find((s) => s.date === todayStr && s.mealType === 'lunch');
            const specD = specialMeals.find((s) => s.date === todayStr && s.mealType === 'dinner');

            const cardClass = (meal: 'breakfast' | 'lunch' | 'dinner', isOn: boolean, isSpec: boolean) => {
              if (isLocked(meal))
                return 'p-5 rounded-2xl border cursor-not-allowed transition-all flex items-center justify-between opacity-60 bg-rose-950/30 border-rose-500/30 text-rose-400';
              if (isOn) {
                return isSpec
                  ? 'p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-900 border-amber-500/60 shadow-xl shadow-amber-950/40 text-amber-300'
                  : 'p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-950/20';
              }
              return 'p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700';
            };

            const IconFor = ({ meal, isOn, isSpec }: { meal: 'breakfast' | 'lunch' | 'dinner'; isOn: boolean; isSpec: boolean }) => {
              if (isLocked(meal)) return <Lock className="w-8 h-8 text-rose-500" />;
              if (isOn) {
                return isSpec
                  ? <Sparkles className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform" />
                  : <CheckCircle2 className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />;
              }
              return <XCircle className="w-8 h-8 text-slate-600 group-hover:scale-110 transition-transform" />;
            };

            return (
              <>
                {/* Breakfast */}
                <div onClick={() => handleToggleTodayMeal('breakfast')} className={cardClass('breakfast', todayDec.breakfast, !!specB)}>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      {specB ? `✨ ${specB.title}` : BN.breakfast}
                      {specB && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">স্পেশাল</span>}
                    </p>
                    <p className={`text-xl font-bold mt-1 font-display ${specB && todayDec.breakfast && !isLocked('breakfast') ? 'text-amber-400' : ''}`}>
                      {todayEmergency ? '🚨 জরুরি বন্ধ' : isLocked('breakfast') ? 'বন্ধ (লক)' : todayDec.breakfast ? BN.mealOn : BN.mealOff}
                    </p>
                    <p className="text-xs font-mono opacity-80 mt-1">
                      {isLocked('breakfast') ? '৳0 (এডমিন বন্ধ)' : specB ? `৳${specB.customRate} (স্পেশাল)` : `৳${userRates.breakfast}`}
                    </p>
                  </div>
                  <IconFor meal="breakfast" isOn={todayDec.breakfast} isSpec={!!specB} />
                </div>

                {/* Lunch */}
                <div onClick={() => handleToggleTodayMeal('lunch')} className={cardClass('lunch', todayDec.lunch, !!specL)}>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      {specL ? `✨ ${specL.title}` : BN.lunch}
                      {specL && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">স্পেশাল</span>}
                    </p>
                    <p className={`text-xl font-bold mt-1 font-display ${specL && todayDec.lunch && !isLocked('lunch') ? 'text-amber-400' : ''}`}>
                      {todayEmergency ? '🚨 জরুরি বন্ধ' : isLocked('lunch') ? 'বন্ধ (লক)' : todayDec.lunch ? BN.mealOn : BN.mealOff}
                    </p>
                    <p className="text-xs font-mono opacity-80 mt-1">
                      {isLocked('lunch') ? '৳0 (এডমিন বন্ধ)' : specL ? `৳${specL.customRate} (স্পেশাল)` : `৳${userRates.lunch}`}
                    </p>
                  </div>
                  <IconFor meal="lunch" isOn={todayDec.lunch} isSpec={!!specL} />
                </div>

                {/* Dinner */}
                <div onClick={() => handleToggleTodayMeal('dinner')} className={cardClass('dinner', todayDec.dinner, !!specD)}>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      {specD ? `✨ ${specD.title}` : BN.dinner}
                      {specD && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">স্পেশাল</span>}
                    </p>
                    <p className={`text-xl font-bold mt-1 font-display ${specD && todayDec.dinner && !isLocked('dinner') ? 'text-amber-400' : ''}`}>
                      {todayEmergency ? '🚨 জরুরি বন্ধ' : isLocked('dinner') ? 'বন্ধ (লক)' : todayDec.dinner ? BN.mealOn : BN.mealOff}
                    </p>
                    <p className="text-xs font-mono opacity-80 mt-1">
                      {isLocked('dinner') ? '৳0 (এডমিন বন্ধ)' : specD ? `৳${specD.customRate} (স্পেশাল)` : `৳${userRates.dinner}`}
                    </p>
                  </div>
                  <IconFor meal="dinner" isOn={todayDec.dinner} isSpec={!!specD} />
                </div>
              </>
            );
          })()}

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
            {transactions.slice(0, 3).map((tx) => {
              const isCredit = ['RECHARGE', 'CREDIT', 'ADMIN_TOPUP', 'REFUND'].includes(tx.type);
              return (
                <div key={tx.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-xl ${
                      isCredit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {isCredit ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200 font-sans">{tx.description}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{tx.date}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${
                      isCredit ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isCredit ? '+' : '-'} ৳{tx.amount}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      অবশিষ্ট: ৳{tx.balanceAfter}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Profile & Password Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 max-w-md w-full shadow-2xl space-y-5 animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">
                    👤 প্রোফাইল ও পাসওয়ার্ড সংশোধন
                  </h3>
                  <p className="text-xs text-slate-400">নাম ও পাসওয়ার্ড পরিবর্তন করতে পারেন</p>
                </div>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="p-2 rounded-2xl bg-slate-900 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 font-sans">পূর্ণ নাম (Full Name)</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-slate-100 font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 font-sans flex items-center justify-between">
                  <span>মোবাইল নম্বর (Phone Number)</span>
                  <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                    <Lock className="w-3 h-3" /> অপরিবর্তনযোগ্য
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentUser.phone}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-400 font-mono font-bold cursor-not-allowed opacity-75"
                />
                <p className="text-[10px] text-slate-500 mt-1">সিকিউরিটির জন্য মোবাইল নম্বর পরিবর্তন করতে মেস এডমিনের সাথে যোগাযোগ করুন।</p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 font-sans">নতুন পাসওয়ার্ড (New Password)</label>
                <input
                  type="password"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-slate-100 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-xs transition-all shadow-xl shadow-cyan-500/25 active:scale-95 disabled:opacity-50 font-display"
              >
                {savingProfile ? 'সংরক্ষণ হচ্ছে...' : 'পাসওয়ার্ড ও প্রোফাইল আপডেট করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock, Copy, ShieldAlert, Zap, Layers, Sparkles, Power } from 'lucide-react';
import { User, MealRateConfig, MealDeclaration as MealDeclarationType, EmergencyClosure, SpecialMeal } from '../../types';
import { BN } from '../../constants/banglaText';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { ApiService } from '../../services/apiService';
import { getBangladeshDateStr, getBangladeshNow, parseDateStr, getDayOfWeekFromDateStr } from '../../utils/dateUtils';

interface MealDeclarationProps {
  currentUser: User;
  rates: MealRateConfig;
  declarations: MealDeclarationType[];
  emergencies: EmergencyClosure[];
  specialMeals?: SpecialMeal[];
  onRefreshData: () => void;
}

export const MealDeclaration: React.FC<MealDeclarationProps> = ({
  currentUser,
  rates,
  declarations,
  emergencies,
  specialMeals = [],
  onRefreshData,
}) => {
  // Parse cutoff time from config (e.g. "10:00")
  const [cutoffHour, cutoffMinute] = (rates.cutoffTime || '10:00').split(':').map(Number);

  const [isPassed10AM, setIsPassed10AM] = useState(() => {
    const now = getBangladeshNow();
    return now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() >= cutoffMinute);
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = getBangladeshNow();
    const passed = now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() >= cutoffMinute);
    if (passed) {
      const tomorrow = getBangladeshNow();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return getBangladeshDateStr(tomorrow);
    }
    return getBangladeshDateStr(now);
  });
  const [togglingPause, setTogglingPause] = useState(false);
  const [breakfast, setBreakfast] = useState(false);
  const [lunch, setLunch] = useState(false);
  const [dinner, setDinner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [balanceAlertMsg, setBalanceAlertMsg] = useState<string | null>(null);

  const userRates = currentUser.userType === 'PERMANENT' ? rates.permanent : rates.guest;

  const handleToggleIndefinitePause = async () => {
    setTogglingPause(true);
    try {
      const updated = await ApiService.toggleIndefinitePause(currentUser.id);
      if (updated.isIndefinitelyPaused) {
        setBreakfast(false);
        setLunch(false);
        setDinner(false);
      }
      onRefreshData();
    } finally {
      setTogglingPause(false);
    }
  };

  // Generate 7 days list. If deadline has passed for today, hide today and start directly from tomorrow
  const dayOffset = isPassed10AM ? 1 : 0;
  const nextDays = Array.from({ length: 7 }, (_, idx) => {
    const i = idx + dayOffset;
    const d = getBangladeshNow();
    d.setDate(d.getDate() + i);
    const dateStr = getBangladeshDateStr(d);
    const dayOfWeek = d.getDay();
    
    const bnDayName = d.toLocaleDateString('bn-BD', { weekday: 'short' });
    const dayName = i === 0 ? `আজ (${bnDayName})` : i === 1 ? `আগামীকাল (${bnDayName})` : `${bnDayName}`;
    const dayNum = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
    
    const specialObj = specialMeals.find((sm) => {
      if (sm.isActive === false) return false;
      if (sm.date === dateStr) return true;
      if (sm.isRecurring && sm.repeatDayOfWeek === dayOfWeek) return true;
      return false;
    });

    return { 
      dateStr, 
      dayName, 
      dayNum, 
      isToday: i === 0, 
      isTomorrow: i === 1,
      hasSpecial: !!specialObj,
      specialRate: specialObj?.customRate,
      specialTitle: specialObj?.title,
    };
  });

  const getSpecialForMeal = (type: 'breakfast' | 'lunch' | 'dinner') => {
    const dayOfWeek = getDayOfWeekFromDateStr(selectedDate);
    return specialMeals.find((sm) => {
      if (sm.isActive === false) return false;
      if (sm.mealType !== type) return false;
      if (sm.date === selectedDate) return true;
      if (sm.isRecurring && sm.repeatDayOfWeek === dayOfWeek) return true;
      return false;
    });
  };

  const specB = getSpecialForMeal('breakfast');
  const specL = getSpecialForMeal('lunch');
  const specD = getSpecialForMeal('dinner');

  const effectiveBRate = specB ? specB.customRate : userRates.breakfast;
  const effectiveLRate = specL ? specL.customRate : userRates.lunch;
  const effectiveDRate = specD ? specD.customRate : userRates.dinner;

  const specialForDate = specB || specL || specD;

  const minMealRate = Math.min(effectiveBRate, effectiveLRate, effectiveDRate);
  const isInsufficientBalance = currentUser.walletBalance < minMealRate;

  const emergencyForDate = emergencies.find(e => selectedDate >= e.date && selectedDate <= (e.endDate || e.date));
  const isToday = selectedDate === getBangladeshDateStr();

  // Live 10 AM cutoff check
  useEffect(() => {
    const check = () => {
      const now = getBangladeshNow();
      const passed = now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() >= cutoffMinute);
      setIsPassed10AM(passed);
      if (passed && selectedDate === getBangladeshDateStr()) {
        const tomorrow = getBangladeshNow();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSelectedDate(getBangladeshDateStr(tomorrow));
      }
    };
    check();
    const t = setInterval(check, 10000);
    return () => clearInterval(t);
  }, [cutoffHour, cutoffMinute, selectedDate]);

  // Calculate total daily cost estimate
  const estimatedDailyCost =
    (breakfast ? effectiveBRate : 0) +
    (lunch ? effectiveLRate : 0) +
    (dinner ? effectiveDRate : 0);

  // Helper: compute meal defaults for a date
  const computeMealsForDate = useCallback((dateStr: string) => {
    // If this date is under emergency closure — respect per-meal closedMeals
    const em = emergencies.find(e => dateStr >= e.date && dateStr <= (e.endDate || e.date));
    if (em) {
      // Only force OFF the specifically closed meals; leave others as declared/default
      const dec = declarations.find(d => d.date === dateStr && d.userId === currentUser.id);
      const baseB = dec ? dec.breakfast : true;
      const baseL = dec ? dec.lunch : true;
      const baseD = dec ? dec.dinner : true;
      return {
        breakfast: em.closedMeals.includes('breakfast') ? false : baseB,
        lunch: em.closedMeals.includes('lunch') ? false : baseL,
        dinner: em.closedMeals.includes('dinner') ? false : baseD,
      };
    }

    const dec = declarations.find(d => d.date === dateStr && d.userId === currentUser.id);
    // Use parseDateStr to avoid UTC midnight issues
    const dt = parseDateStr(dateStr);
    const dayOfWeek = dt.getDay();
    const sB = specialMeals.find(sm => sm.isActive !== false && sm.mealType === 'breakfast' && (sm.date === dateStr || (sm.isRecurring && sm.repeatDayOfWeek === dayOfWeek)));
    const sL = specialMeals.find(sm => sm.isActive !== false && sm.mealType === 'lunch' && (sm.date === dateStr || (sm.isRecurring && sm.repeatDayOfWeek === dayOfWeek)));
    const sD = specialMeals.find(sm => sm.isActive !== false && sm.mealType === 'dinner' && (sm.date === dateStr || (sm.isRecurring && sm.repeatDayOfWeek === dayOfWeek)));

    const bPrice = sB ? sB.customRate : userRates.breakfast;
    const lPrice = sL ? sL.customRate : userRates.lunch;
    const dPrice = sD ? sD.customRate : userRates.dinner;

    const balance = currentUser.walletBalance;

    // FIX 13: Use cumulative greedy balance check (same logic as service-layer updateDeclaration)
    // so the UI initial state is consistent with what will actually be saved.
    const desiredB = dec ? dec.breakfast : true;
    const desiredL = dec ? dec.lunch : true;
    const desiredD = dec ? dec.dinner : true;

    let sum = 0;
    const safeB = desiredB && (sum + bPrice <= balance) ? (sum += bPrice, true) : false;
    const safeL = desiredL && (sum + lPrice <= balance) ? (sum += lPrice, true) : false;
    const safeD = desiredD && (sum + dPrice <= balance) ? (sum += dPrice, true) : false;

    return {
      breakfast: safeB,
      lunch: safeL,
      dinner: safeD,
    };
  }, [declarations, specialMeals, emergencies, userRates, currentUser.walletBalance, currentUser.id]);

  // Sync state when date, declarations, specialMeals, or emergencies change
  useEffect(() => {
    const meals = computeMealsForDate(selectedDate);
    setBreakfast(meals.breakfast);
    setLunch(meals.lunch);
    setDinner(meals.dinner);
  }, [selectedDate, computeMealsForDate]);

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setBalanceAlertMsg(null);
  };

  const handleToggleMeal = (type: 'breakfast' | 'lunch' | 'dinner') => {
    setBalanceAlertMsg(null);

    if (currentUser.isIndefinitelyPaused) {
      setBalanceAlertMsg('আপনার মিল সুবিধা অনির্দিষ্টকালের জন্য স্থগিত। প্রথমে "মিল চালু করুন" বাটনে ক্লিক করুন।');
      return;
    }

    if (emergencyForDate) {
      if (emergencyForDate.closedMeals.includes(type)) {
        setBalanceAlertMsg('জরুরি মিল বন্ধের কারণে এই মিলটি পরিবর্তন করা সম্ভব নয়।');
        return;
      }
    }

    const isGlobalOff =
      (type === 'breakfast' && rates.globalMealStatus?.breakfast === false) ||
      (type === 'lunch' && rates.globalMealStatus?.lunch === false) ||
      (type === 'dinner' && rates.globalMealStatus?.dinner === false);

    if (isGlobalOff) {
      const mealName = type === 'breakfast' ? 'সকালের নাস্তা' : type === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার';
      setBalanceAlertMsg(`${mealName} এডমিন কর্তৃক সিস্টেম সেটিংসে বিশ্বব্যাপী বন্ধ (Global OFF) রাখা হয়েছে।`);
      return;
    }

    if (isToday && isPassed10AM) {
      setBalanceAlertMsg(`আজকের মিল পরিবর্তনের নির্ধারিত সময় (${rates.cutoffTime || '10:00'} AM) পার হয়ে গেছে।`);
      return;
    }

    const nextB = type === 'breakfast' ? !breakfast : breakfast;
    const nextL = type === 'lunch' ? !lunch : lunch;
    const nextD = type === 'dinner' ? !dinner : dinner;

    const reqBalance =
      (nextB ? effectiveBRate : 0) +
      (nextL ? effectiveLRate : 0) +
      (nextD ? effectiveDRate : 0);

    if (reqBalance > currentUser.walletBalance) {
      setBalanceAlertMsg(
        `আপনার ওয়ালেট ব্যালেন্স (৳${currentUser.walletBalance}) দিয়ে ২ বা ৩টি মিল এক সাথে অন রাখা সম্ভব নয় (মোট প্রয়োজন ৳${reqBalance})। ওয়ালেট ব্যালেন্স বাড়াতে মেস এডমিন থেকে রিচার্জ করুন।`
      );
      return;
    }

    setBreakfast(nextB);
    setLunch(nextL);
    setDinner(nextD);
  };

  const handleSave = async () => {
    if (currentUser.isIndefinitelyPaused) {
      setBalanceAlertMsg('আপনার মিল সুবিধা অনির্দিষ্টকালের জন্য স্থগিত। প্রথমে "মিল চালু করুন" বাটনে ক্লিক করুন।');
      return;
    }
    if (isToday && isPassed10AM) {
      setBalanceAlertMsg(`আজকের মিল পরিবর্তনের নির্ধারিত সময় (${rates.cutoffTime || '10:00'} AM) পার হয়ে গেছে।`);
      return;
    }
    setSaving(true);
    try {
      await ApiService.updateDeclaration(currentUser.id, selectedDate, { breakfast, lunch, dinner });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
      onRefreshData();
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPrev = async () => {
    if (currentUser.isIndefinitelyPaused) {
      setBalanceAlertMsg('আপনার মিল সুবিধা অনির্দিষ্টকালের জন্য স্থগিত।');
      return;
    }
    if (isToday && isPassed10AM) {
      setBalanceAlertMsg(`আজকের মিল পরিবর্তনের নির্ধারিত সময় পার হয়ে গেছে।`);
      return;
    }
    if (isInsufficientBalance) {
      setBalanceAlertMsg(`আপনার ওয়ালেট ব্যালেন্স পর্যাপ্ত না থাকায় গতকালের মিল কপি করা সম্ভব নয়। এডমিন থেকে ওয়ালেট রিচার্জ করুন।`);
      return;
    }
    setSaving(true);
    try {
      const cloned = await ApiService.copyPreviousDayDeclaration(currentUser.id, selectedDate);
      setBreakfast(cloned.breakfast);
      setLunch(cloned.lunch);
      setDinner(cloned.dinner);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
      onRefreshData();
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = (b: boolean, l: boolean, d: boolean) => {
    setBalanceAlertMsg(null);

    if (currentUser.isIndefinitelyPaused && (b || l || d)) {
      setBalanceAlertMsg('আপনার মিল সুবিধা অনির্দিষ্টকালের জন্য স্থগিত। প্রথমে মিল চালু করুন।');
      return;
    }

    if (isToday && isPassed10AM && (b || l || d)) {
      setBalanceAlertMsg(`আজকের মিল পরিবর্তনের নির্ধারিত সময় (${rates.cutoffTime || '10:00'} AM) পার হয়ে গেছে।`);
      return;
    }

    if (rates.globalMealStatus?.breakfast === false) b = false;
    if (rates.globalMealStatus?.lunch === false) l = false;
    if (rates.globalMealStatus?.dinner === false) d = false;

    if (emergencyForDate) {
      if (emergencyForDate.closedMeals.includes('breakfast')) b = false;
      if (emergencyForDate.closedMeals.includes('lunch')) l = false;
      if (emergencyForDate.closedMeals.includes('dinner')) d = false;
    }

    const reqBalance =
      (b ? effectiveBRate : 0) +
      (l ? effectiveLRate : 0) +
      (d ? effectiveDRate : 0);

    if (reqBalance > currentUser.walletBalance) {
      setBalanceAlertMsg(
        `আপনার ওয়ালেট ব্যালেন্স (৳${currentUser.walletBalance}) দিয়ে পছন্দকৃত মিলগুলো একত্রে চালু রাখা যাচ্ছে না (প্রয়োজন ৳${reqBalance})। ব্যালেন্স রিচার্জ করুন।`
      );
      return;
    }
    setBreakfast(b);
    setLunch(l);
    setDinner(d);
  };

  const handleBulkWeekAllMealsOn = async () => {
    if (currentUser.isIndefinitelyPaused) {
      setBalanceAlertMsg('আপনার মিল সুবিধা অনির্দিষ্টকালের জন্য স্থগিত। প্রথমে "মিল চালু করুন" বাটনে ক্লিক করুন।');
      return;
    }
    if (isInsufficientBalance) {
      setBalanceAlertMsg(`আপনার ওয়ালেট ব্যালেন্স পর্যাপ্ত না থাকায় সারা সপ্তাহের মিল অন করা সম্ভব নয়।`);
      return;
    }
    setSaving(true);
    const todayDateStr = getBangladeshDateStr();
    try {
      for (const day of nextDays) {
        if (day.dateStr === todayDateStr && isPassed10AM) continue;
        const dayEmergency = emergencies.find(e => day.dateStr >= e.date && day.dateStr <= (e.endDate || e.date));
        const dayMeals = {
          breakfast: dayEmergency?.closedMeals.includes('breakfast') ? false : rates.globalMealStatus?.breakfast !== false,
          lunch: dayEmergency?.closedMeals.includes('lunch') ? false : rates.globalMealStatus?.lunch !== false,
          dinner: dayEmergency?.closedMeals.includes('dinner') ? false : rates.globalMealStatus?.dinner !== false,
        };
        await ApiService.updateDeclaration(currentUser.id, day.dateStr, dayMeals);
      }
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
      onRefreshData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto animate-scale-in">
      
      {/* Indefinite Vacation / Pause Active Alert Banner */}
      {currentUser.isIndefinitelyPaused && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-amber-300 font-display">আপনার মিল অনির্দিষ্টকালের জন্য স্থগিত (PAUSED) আছে!</h4>
              <p className="text-xs text-amber-200/80 mt-0.5 font-sans">
                স্বয়ংক্রিয়ভাবে আপনার সমস্ত মিল বন্ধ রয়েছে। মেসে মিল খাওয়া আবার শুরু করতে নিচে "পুনরায় মিল চালু করুন" ক্লিক করুন।
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleIndefinitePause}
            disabled={togglingPause}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 shrink-0 font-display"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>পুনরায় মিল চালু করুন (Resume Meals)</span>
          </button>
        </div>
      )}

      {/* Header Panel */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xl">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Calendar className="w-5 h-5 text-cyan-400" />
            </div>
            {BN.mealDeclaration}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            আগামী ৭ দিনের যেকোনো দিনের খাবারের তালিকা পরিবর্তন অথবা বন্ধ করুন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleToggleIndefinitePause}
            disabled={togglingPause}
            className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm ${
              currentUser.isIndefinitelyPaused
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <Power className="w-4 h-4 text-amber-400" />
            <span>{currentUser.isIndefinitelyPaused ? 'মিল চালু করুন' : 'অনির্দিষ্টকালের জন্য অফ'}</span>
          </button>

          <button
            onClick={handleCopyPrev}
            disabled={saving}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700/80 text-slate-200 hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <Copy className="w-4 h-4 text-cyan-400" />
            <span>গতকালের প্ল্যান কপি</span>
          </button>
          
          <button
            onClick={handleBulkWeekAllMealsOn}
            disabled={saving}
            className="px-4 py-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>সারা সপ্তাহ সব অন</span>
          </button>
        </div>
      </div>

      {/* Quick Preset Patterns */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3 overflow-x-auto shadow-md">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0 font-display">
          <Zap className="w-4 h-4 text-amber-400" />
          দ্রুত প্যাটার্ন:
        </span>
        <div className="flex items-center gap-2 shrink-0 text-xs">
          <button
            onClick={() => handleApplyPreset(true, true, true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold hover:bg-emerald-500/20 transition-all active:scale-95"
          >
            ৩ বেলা অন
          </button>
          <button
            onClick={() => handleApplyPreset(false, true, true)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold hover:bg-cyan-500/20 transition-all active:scale-95"
          >
            দুপুর + রাত
          </button>
          <button
            onClick={() => handleApplyPreset(false, false, true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold hover:bg-amber-500/20 transition-all active:scale-95"
          >
            শুধু রাত
          </button>
          <button
            onClick={() => handleApplyPreset(false, false, false)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold hover:bg-rose-500/20 transition-all active:scale-95"
          >
            সব মিল অফ
          </button>
        </div>
      </div>

      {/* Special Meal Banner */}
      {specialForDate && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-900 border border-amber-500/50 text-amber-200 flex items-center justify-between gap-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-base text-amber-300 font-display">{specialForDate.title}</h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-extrabold font-mono">
                  ৳{specialForDate.customRate}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-1 font-sans">
                {specialForDate.description || 'আজকের বিশেষ খাবারের জন্য কাস্টম চার্জ প্রযোজ্য। খাবার না খেতে চাইলে অফ করে দিতে পারেন।'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Date Carousel Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
        {nextDays.map((item) => (
          <button
            key={item.dateStr}
            onClick={() => handleSelectDate(item.dateStr)}
            className={`p-3 rounded-2xl border text-center transition-all active:scale-95 relative overflow-hidden flex flex-col items-center justify-between min-h-[76px] ${
              selectedDate === item.dateStr
                ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 border-cyan-400 text-cyan-300 font-bold shadow-lg shadow-cyan-500/15'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <p className="text-[10px] font-bold tracking-tight">{item.dayName}</p>
            <p className="text-xs sm:text-sm font-extrabold font-mono my-0.5">{item.dayNum}</p>
            {item.hasSpecial ? (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold flex items-center gap-0.5 font-mono">
                ✨ ৳{item.specialRate}
              </span>
            ) : (
              <span className="text-[9px] text-slate-500">নিয়মিত</span>
            )}
          </button>
        ))}
      </div>

      {/* Estimated Daily Cost Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300">নির্বাচিত দিনের আনুমানিক খরচ:</span>
        </div>
        <div className="text-sm font-extrabold text-cyan-300 font-mono">
          <AnimatedNumber value={estimatedDailyCost} prefix={BN.tkSymbol} decimals={0} />
        </div>
      </div>

      {/* Balance Warning Notification */}
      {balanceAlertMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-center gap-3 shadow-lg animate-pulse">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
          <div>
            <h4 className="font-bold text-sm font-display text-rose-300">ওয়ালেট অ্যালার্ট!</h4>
            <p className="text-xs text-rose-200/90 mt-0.5">{balanceAlertMsg}</p>
          </div>
        </div>
      )}

      {/* Emergency Off Alert */}
      {emergencyForDate && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
          <div>
            <h4 className="font-bold text-sm font-display text-rose-300">
              জরুরি নোটিশ:{' '}
              {emergencyForDate.closedMeals.length === 3
                ? 'এই দিনে সমস্ত মিল বন্ধ!'
                : `এই দিনে ${emergencyForDate.closedMeals.map(m => m === 'breakfast' ? 'সকালের নাস্তা' : m === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার').join(', ')} বন্ধ!`}
            </h4>
            <p className="text-xs text-rose-200/80">{emergencyForDate.reason}</p>
          </div>
        </div>
      )}

      {/* 10 AM Cutoff Alert — only show if deadline has passed */}
      {isToday && isPassed10AM && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-3 text-xs font-medium">
          <Clock className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{BN.deadlinePassedWarning}</span>
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-sm flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>মিল ডিক্লারেশন সফলভাবে সংরক্ষিত হয়েছে!</span>
        </div>
      )}

      {/* 3 Meal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Breakfast Card */}
        {(() => {
          const bEmergencyBlocked = !!emergencyForDate && emergencyForDate.closedMeals.includes('breakfast');
          const bGlobalOff = rates.globalMealStatus?.breakfast === false;
          const bBlocked = bEmergencyBlocked || bGlobalOff;
          return (
        <div
          onClick={() => handleToggleMeal('breakfast')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[170px] group ${
            bBlocked
              ? 'bg-slate-950/80 border-slate-800 opacity-60 cursor-not-allowed'
              : breakfast
              ? (specB
                ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-900 border-amber-500/60 shadow-xl shadow-amber-950/40'
                : 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/50 shadow-xl shadow-emerald-950/30')
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-slate-100 font-display flex items-center gap-1.5">
              {specB ? `✨ ${specB.title}` : BN.breakfast}
              {specB && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
            </span>
            {bGlobalOff ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">মাস্টার অফ</span>
            ) : bEmergencyBlocked ? (
              <ShieldAlert className="w-7 h-7 text-rose-500 shrink-0" />
            ) : breakfast ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
            ) : (
              <XCircle className="w-7 h-7 text-slate-600 group-hover:scale-110 transition-transform shrink-0" />
            )}
          </div>
          <div>
            <div className={`text-2xl font-extrabold mt-4 font-display ${bGlobalOff ? 'text-rose-400 text-lg' : bEmergencyBlocked ? 'text-rose-400 text-lg' : breakfast ? (specB ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-500'}`}>
              {bGlobalOff ? '⛔ এডমিন কর্তৃক বন্ধ' : bEmergencyBlocked ? '🚨 জরুরি বন্ধ' : breakfast ? BN.mealOn : BN.mealOff}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
              চার্জ: ৳{effectiveBRate}
              {specB && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">স্পেশাল</span>}
            </p>
          </div>
        </div>
          );
        })()}

        {/* Lunch Card */}
        {(() => {
          const lEmergencyBlocked = !!emergencyForDate && emergencyForDate.closedMeals.includes('lunch');
          const lGlobalOff = rates.globalMealStatus?.lunch === false;
          const lBlocked = lEmergencyBlocked || lGlobalOff;
          return (
        <div
          onClick={() => handleToggleMeal('lunch')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[170px] group ${
            lBlocked
              ? 'bg-slate-950/80 border-slate-800 opacity-60 cursor-not-allowed'
              : lunch
              ? (specL
                ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-900 border-amber-500/60 shadow-xl shadow-amber-950/40'
                : 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/50 shadow-xl shadow-emerald-950/30')
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-slate-100 font-display flex items-center gap-1.5">
              {specL ? `✨ ${specL.title}` : BN.lunch}
              {specL && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
            </span>
            {lGlobalOff ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">মাস্টার অফ</span>
            ) : lEmergencyBlocked ? (
              <ShieldAlert className="w-7 h-7 text-rose-500 shrink-0" />
            ) : lunch ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
            ) : (
              <XCircle className="w-7 h-7 text-slate-600 group-hover:scale-110 transition-transform shrink-0" />
            )}
          </div>
          <div>
            <div className={`text-2xl font-extrabold mt-4 font-display ${lGlobalOff ? 'text-rose-400 text-lg' : lEmergencyBlocked ? 'text-rose-400 text-lg' : lunch ? (specL ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-500'}`}>
              {lGlobalOff ? '⛔ এডমিন কর্তৃক বন্ধ' : lEmergencyBlocked ? '🚨 জরুরি বন্ধ' : lunch ? BN.mealOn : BN.mealOff}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
              চার্জ: ৳{effectiveLRate}
              {specL && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">স্পেশাল</span>}
            </p>
          </div>
        </div>
          );
        })()}

        {/* Dinner Card */}
        {(() => {
          const dEmergencyBlocked = !!emergencyForDate && emergencyForDate.closedMeals.includes('dinner');
          const dGlobalOff = rates.globalMealStatus?.dinner === false;
          const dBlocked = dEmergencyBlocked || dGlobalOff;
          return (
        <div
          onClick={() => handleToggleMeal('dinner')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[170px] group ${
            dBlocked
              ? 'bg-slate-950/80 border-slate-800 opacity-60 cursor-not-allowed'
              : dinner
              ? (specD
                ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-900 border-amber-500/60 shadow-xl shadow-amber-950/40'
                : 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/50 shadow-xl shadow-emerald-950/30')
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-slate-100 font-display flex items-center gap-1.5">
              {specD ? `✨ ${specD.title}` : BN.dinner}
              {specD && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
            </span>
            {dGlobalOff ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">মাস্টার অফ</span>
            ) : dEmergencyBlocked ? (
              <ShieldAlert className="w-7 h-7 text-rose-500 shrink-0" />
            ) : dinner ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
            ) : (
              <XCircle className="w-7 h-7 text-slate-600 group-hover:scale-110 transition-transform shrink-0" />
            )}
          </div>
          <div>
            <div className={`text-2xl font-extrabold mt-4 font-display ${dGlobalOff ? 'text-rose-400 text-lg' : dEmergencyBlocked ? 'text-rose-400 text-lg' : dinner ? (specD ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-500'}`}>
              {dGlobalOff ? '⛔ এডমিন কর্তৃক বন্ধ' : dEmergencyBlocked ? '🚨 জরুরি বন্ধ' : dinner ? BN.mealOn : BN.mealOff}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
              চার্জ: ৳{effectiveDRate}
              {specD && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">স্পেশাল</span>}
            </p>
          </div>
        </div>
          );
        })()}

      </div>

      {/* Save Action Button */}
      <button
        onClick={handleSave}
        disabled={saving || currentUser.isIndefinitelyPaused || (isToday && isPassed10AM)}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-base transition-all shadow-xl shadow-cyan-500/25 active:scale-95 disabled:opacity-50 font-display"
      >
        {saving ? 'সংরক্ষণ করা হচ্ছে...' : 'মিল চয়েস পরিবর্তন সংরক্ষণ করুন'}
      </button>

    </div>
  );
};

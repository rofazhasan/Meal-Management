'use client';

import React, { useState, useMemo } from 'react';
import {
  ChefHat,
  Calendar,
  Printer,
  Utensils,
  DollarSign,
  Users,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { User, MealDeclaration, MealRateConfig, SpecialMeal, EmergencyClosure } from '../../types';
import { getBangladeshDateStr, getDayOfWeekFromDateStr } from '../../utils/dateUtils';
import { ApiService } from '../../services/apiService';
import { getUserMealStateForDate } from '../../utils/mealUtils';

interface CookReportProps {
  users: User[];
  declarations: MealDeclaration[];
  rates: MealRateConfig;
  specialMeals?: SpecialMeal[];
  emergencies?: EmergencyClosure[];
}

export const CookReport: React.FC<CookReportProps> = ({
  users,
  declarations,
  rates,
  specialMeals = [],
  emergencies = [],
}) => {
  const [selectedDate, setSelectedDate] = useState(() => getBangladeshDateStr());
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch declarations for selectedDate fresh from API
  const { data: rawDeclarations = [], isFetching } = useQuery({
    queryKey: ['cook_declarations', selectedDate],
    queryFn: () => ApiService.getDeclarationsForDate(selectedDate),
    staleTime: 0,
  });

  // Fetch extra guest meals for selectedDate from API
  const { data: rawGuestMeals = [] } = useQuery({
    queryKey: ['cook_guest_meals', selectedDate],
    queryFn: () => ApiService.getGuestMeals({ date: selectedDate }),
    staleTime: 0,
  });

  // Approved active non-paused users
  const activeUsers = useMemo(
    () => users.filter((u) => u.status === 'APPROVED' && !u.isIndefinitelyPaused),
    [users]
  );

  // Special meal helper with robust case-insensitive and recurring check
  const getSpecialMealForType = (type: 'breakfast' | 'lunch' | 'dinner') => {
    const dayOfWeek = getDayOfWeekFromDateStr(selectedDate);
    const active = specialMeals.filter(
      (sm) => sm.isActive !== false && String(sm.mealType).toLowerCase() === type
    );
    const dateSpecific = active.find((sm) => sm.date === selectedDate);
    if (dateSpecific) return dateSpecific;
    return active.find((sm) => sm.isRecurring && sm.repeatDayOfWeek === dayOfWeek);
  };

  const specB = getSpecialMealForType('breakfast');
  const specL = getSpecialMealForType('lunch');
  const specD = getSpecialMealForType('dinner');
  const specialForDate = specB || specL || specD;

  // Determine if selectedDate is under emergency closure
  const emergencyForDate = useMemo(() => {
    return (emergencies || []).find((em: any) => {
      const start = em.date;
      const end = em.endDate || em.date;
      return selectedDate >= start && selectedDate <= end;
    });
  }, [emergencies, selectedDate]);

  const isBGlobalOff = rates.globalMealStatus?.breakfast === false;
  const isLGlobalOff = rates.globalMealStatus?.lunch === false;
  const isDGlobalOff = rates.globalMealStatus?.dinner === false;

  const isBEmergencyOff = !!emergencyForDate && (emergencyForDate.closedMeals?.includes('breakfast') ?? true);
  const isLEmergencyOff = !!emergencyForDate && (emergencyForDate.closedMeals?.includes('lunch') ?? true);
  const isDEmergencyOff = !!emergencyForDate && (emergencyForDate.closedMeals?.includes('dinner') ?? true);

  const extraGuestStats = useMemo(() => {
    let b = 0, l = 0, d = 0;
    let bCost = 0, lCost = 0, dCost = 0;
    rawGuestMeals.forEach((gm: any) => {
      const numB = isBGlobalOff || isBEmergencyOff ? 0 : (gm.breakfastCount || 0);
      const numL = isLGlobalOff || isLEmergencyOff ? 0 : (gm.lunchCount || 0);
      const numD = isDGlobalOff || isDEmergencyOff ? 0 : (gm.dinnerCount || 0);

      b += numB;
      l += numL;
      d += numD;

      const rateObj = gm.rateTier === 'PERMANENT' ? rates.permanent : rates.guest;
      bCost += numB * (specB ? specB.customRate : rateObj.breakfast);
      lCost += numL * (specL ? specL.customRate : rateObj.lunch);
      dCost += numD * (specD ? specD.customRate : rateObj.dinner);
    });
    return { b, l, d, bCost, lCost, dCost, total: b + l + d, totalCost: bCost + lCost + dCost };
  }, [rawGuestMeals, rates, specB, specL, specD, isBGlobalOff, isBEmergencyOff, isLGlobalOff, isLEmergencyOff, isDGlobalOff, isDEmergencyOff]);

  // Members eating each meal
  const breakfastMembers: User[] = [];
  const lunchMembers: User[] = [];
  const dinnerMembers: User[] = [];

  if (!isFetching) {
    activeUsers.forEach((user) => {
      const userDec = rawDeclarations.find((d) => d.userId === user.id);
      const state = getUserMealStateForDate(user, selectedDate, userDec, rates, emergencyForDate);

      if (state.breakfast) breakfastMembers.push(user);
      if (state.lunch) lunchMembers.push(user);
      if (state.dinner) dinnerMembers.push(user);
    });
  }

  // Calculate meal total costs considering Special Meal Overwrites
  const calculateMealTotalCost = (memberList: User[], mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const specMeal = getSpecialMealForType(mealType);
    return memberList.reduce((sum, u) => {
      const userRates = u.userType === 'PERMANENT' ? rates.permanent : rates.guest;
      const price = specMeal ? specMeal.customRate : userRates[mealType];
      return sum + price;
    }, 0);
  };

  const breakfastCost = isBGlobalOff ? 0 : (calculateMealTotalCost(breakfastMembers, 'breakfast') + extraGuestStats.bCost);
  const lunchCost = isLGlobalOff ? 0 : (calculateMealTotalCost(lunchMembers, 'lunch') + extraGuestStats.lCost);
  const dinnerCost = isDGlobalOff ? 0 : (calculateMealTotalCost(dinnerMembers, 'dinner') + extraGuestStats.dCost);

  const totalMealsCount = (isBGlobalOff ? 0 : (breakfastMembers.length + extraGuestStats.b)) +
                          (isLGlobalOff ? 0 : (lunchMembers.length + extraGuestStats.l)) +
                          (isDGlobalOff ? 0 : (dinnerMembers.length + extraGuestStats.d));
  const totalBazaarBudget = breakfastCost + lunchCost + dinnerCost;
  const activeMealsCount = [!isBGlobalOff, !isLGlobalOff, !isDGlobalOff].filter(Boolean).length;

  // Breakdown of permanent vs guest for each meal
  const getBreakdown = (memberList: User[], extraGuestCount: number) => {
    const perm = memberList.filter((m) => m.userType === 'PERMANENT').length;
    const guest = memberList.filter((m) => m.userType === 'GUEST').length + extraGuestCount;
    return { perm, guest, extraGuest: extraGuestCount };
  };

  const bBreakdown = getBreakdown(breakfastMembers, extraGuestStats.b);
  const lBreakdown = getBreakdown(lunchMembers, extraGuestStats.l);
  const dBreakdown = getBreakdown(dinnerMembers, extraGuestStats.d);

  // Quick Date Shift
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Filter members by search term
  const filterMembers = (list: User[]) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.phone.includes(term) ||
        (m.profile?.roomNumber && m.profile.roomNumber.toLowerCase().includes(term))
    );
  };

  const filteredB = filterMembers(breakfastMembers);
  const filteredL = filterMembers(lunchMembers);
  const filteredD = filterMembers(dinnerMembers);

  // Copy Summary Memo for Cook (WhatsApp/SMS ready)
  const handleCopySummary = () => {
    const todayStr = getBangladeshDateStr();
    const isToday = selectedDate === todayStr;
    const dateLabel = isToday ? `${selectedDate} (আজ)` : selectedDate;

    let text = `👨‍🍳 *বাবুর্চির দৈনিক বাজার ও মিল হিসাব*\n📅 তারিখ: ${dateLabel}\n----------------------------------\n`;

    if (!isBGlobalOff) {
      if (isBEmergencyOff) {
        text += `🌅 নাস্তা: 🚨 (জরুরি বন্ধ)\n`;
      } else if (specB) {
        text += `🌅 নাস্তা (✨${specB.title}): ${breakfastMembers.length} জন (৳${breakfastCost} - ৳${specB.customRate}/জন)\n`;
      } else {
        text += `🌅 নাস্তা: ${breakfastMembers.length} জন (৳${breakfastCost})\n`;
      }
    }

    if (!isLGlobalOff) {
      if (isLEmergencyOff) {
        text += `🍱 দুপুরের খাবার: 🚨 (জরুরি বন্ধ)\n`;
      } else if (specL) {
        text += `🍱 ✨ স্পেশাল মিল (${specL.title}): ${lunchMembers.length} জন (৳${lunchCost} - ৳${specL.customRate}/জন)\n`;
      } else {
        text += `🍱 দুপুরের খাবার: ${lunchMembers.length} জন (৳${lunchCost})\n`;
      }
    }

    if (!isDGlobalOff) {
      if (isDEmergencyOff) {
        text += `🌙 রাতের খাবার: 🚨 (জরুরি বন্ধ)\n`;
      } else if (specD) {
        text += `🌙 রাতের খাবার (✨${specD.title}): ${dinnerMembers.length} জন (৳${dinnerCost} - ৳${specD.customRate}/জন)\n`;
      } else {
        text += `🌙 রাতের খাবার: ${dinnerMembers.length} জন (৳${dinnerCost})\n`;
      }
    }

    text += `----------------------------------\n📊 মোট মিল: ${totalMealsCount} টি\n💰 সর্বমোট বাজার বাজেট: ৳${totalBazaarBudget}\n`;

    if (emergencyForDate) {
      text += `\n🚨 *জরুরি নোটিশ:* ${emergencyForDate.reason || 'Emergency Closure'}`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto animate-scale-in">
      {/* Top Controls & Header */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-2xl print:hidden">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <ChefHat className="w-6 h-6" />
            </div>
            বাবুর্চির দৈনিক বাজার ও মিল হিসাব (Cook Report)
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            দৈনিক বাবুর্চির জন্য নিখুঁত মিল সংখ্যা, স্পেশাল মেনু বাজেট এবং রুমভিত্তিক মেম্বারদের তালিকা
          </p>
        </div>

        {/* Date Selector & Quick Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Date Shift Buttons */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-1">
            <button
              onClick={() => shiftDate(-1)}
              title="গতকাল"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSelectedDate(getBangladeshDateStr())}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
                selectedDate === getBangladeshDateStr()
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              আজ
            </button>

            <button
              onClick={() => shiftDate(1)}
              title="আগামীকাল"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5">
            <Calendar className="w-4 h-4 text-cyan-400 ml-2" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-cyan-300 font-mono font-bold focus:outline-none pr-2"
            />
          </div>

          {/* Copy Summary Text Button */}
          <button
            onClick={handleCopySummary}
            className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all border active:scale-95 ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
            <span>{copied ? 'কপি হয়েছে!' : 'বাবুর্চি মেসেজ কপি'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/25 active:scale-95 font-display"
          >
            <Printer className="w-4 h-4" />
            <span>বাবুর্চি মেমো প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* EMERGENCY ALERT BANNER (If Emergency Closure Active) */}
      {emergencyForDate && (
        <div className="p-5 rounded-3xl bg-rose-950/40 border border-rose-500/50 text-rose-200 flex items-start gap-4 shadow-2xl animate-fade-in print:border-rose-400">
          <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-rose-300 text-base font-display flex items-center gap-2">
              🚨 জরুরি বন্ধ সতর্কতা (Emergency Closure Alert)
            </h3>
            <p className="text-xs text-rose-200/90 leading-relaxed font-sans">
              তারিখ: <span className="font-bold font-mono">{selectedDate}</span> —{' '}
              <span className="font-bold text-white font-sans">
                {emergencyForDate.reason || 'জরুরি প্রয়োজনে ডাইনিং বন্ধ ঘোষণা করা হয়েছে।'}
              </span>
            </p>
            <p className="text-[11px] text-rose-300/80 font-mono">
              বন্ধকৃত মিল: {isBEmergencyOff ? 'সকালের নাস্তা, ' : ''}
              {isLEmergencyOff ? 'দুপুরের খাবার, ' : ''}
              {isDEmergencyOff ? 'রাতের খাবার' : ''}
            </p>
          </div>
        </div>
      )}

      {/* SPECIAL MEAL BANNER (If Special Meal Scheduled) */}
      {specialForDate && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-4 shadow-xl print:border-amber-400">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-amber-300 text-sm font-display flex items-center gap-2">
                ✨ আজকের বিশেষ আকর্ষণ: {specialForDate.title}
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5 font-sans">
                {specialForDate.description || 'আজকে বাবুর্চি বিশেষ মিল প্রস্তুত করবেন।'}
              </p>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold shrink-0">
            রেট: ৳{specialForDate.customRate}/জন
          </div>
        </div>
      )}

      {/* KPI Cards for Cook */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          activeMealsCount === 3 ? 'lg:grid-cols-4' : activeMealsCount === 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        } gap-4 print:hidden relative transition-opacity duration-300 ${
          isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}
      >
        {isFetching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-slate-950/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 bg-slate-900 border border-cyan-500/40 rounded-2xl px-4 py-2.5 shadow-xl">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-cyan-300 font-sans">ডেটা লোড হচ্ছে…</span>
            </div>
          </div>
        )}

        {/* Breakfast Card */}
        {!isBGlobalOff && (
          <div
            className={`glass-panel p-5 rounded-3xl border flex flex-col justify-between shadow-xl transition-all ${
              isBEmergencyOff
                ? 'border-rose-500/40 bg-rose-950/10'
                : specB
                ? 'border-amber-500/50 bg-amber-950/20'
                : 'border-emerald-500/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 font-sans flex items-center gap-1.5">
                  {specB ? <Sparkles className="w-3.5 h-3.5 text-amber-400" /> : null}
                  {specB ? `✨ ${specB.title} (স্পেশাল)` : 'সকালের নাস্তা'}
                </span>

                {isBEmergencyOff ? (
                  <div className="text-lg font-bold text-rose-400 font-display mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> 🚨 জরুরি বন্ধ
                  </div>
                ) : (
                  <div className="text-2xl font-extrabold text-emerald-400 font-display mt-1">
                    {breakfastMembers.length} <span className="text-xs text-slate-400 font-normal">টি মিল</span>
                  </div>
                )}
              </div>

              <div
                className={`p-3 rounded-2xl border ${
                  isBEmergencyOff
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                    : specB
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}
              >
                <Utensils className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                বাজেট: <span className="text-emerald-300 font-bold">৳{breakfastCost}</span>
              </span>
              <span className="text-slate-500 text-[11px]">
                (স্থায়ী: {bBreakdown.perm} | অতিথি: {bBreakdown.guest})
              </span>
            </div>
          </div>
        )}

        {/* Lunch Card — SPECIAL OVERWRITE DYNAMIC LABEL */}
        {!isLGlobalOff && (
          <div
            className={`glass-panel p-5 rounded-3xl border flex flex-col justify-between shadow-xl transition-all ${
              isLEmergencyOff
                ? 'border-rose-500/40 bg-rose-950/10'
                : specL
                ? 'border-amber-500/60 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 shadow-amber-500/10'
                : 'border-cyan-500/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 font-sans flex items-center gap-1.5">
                  {specL ? (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
                      <span className="text-amber-300 font-extrabold">✨ স্পেশাল মিল (Special Meal)</span>
                    </>
                  ) : (
                    'দুপুরের খাবার'
                  )}
                </span>

                {isLEmergencyOff ? (
                  <div className="text-lg font-bold text-rose-400 font-display mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> 🚨 জরুরি বন্ধ
                  </div>
                ) : (
                  <div className="text-2xl font-extrabold text-cyan-400 font-display mt-1 flex items-baseline gap-2">
                    <span>{lunchMembers.length}</span>
                    <span className="text-xs text-slate-400 font-normal">টি মিল</span>
                    {specL && (
                      <span className="text-[11px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                        ৳{specL.customRate}/জন
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div
                className={`p-3 rounded-2xl border ${
                  isLEmergencyOff
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                    : specL
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                }`}
              >
                <Utensils className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                বাজেট: <span className="text-cyan-300 font-bold">৳{lunchCost}</span>
              </span>
              <span className="text-slate-500 text-[11px]">
                (স্থায়ী: {lBreakdown.perm} | অতিথি: {lBreakdown.guest})
              </span>
            </div>
          </div>
        )}

        {/* Dinner Card */}
        {!isDGlobalOff && (
          <div
            className={`glass-panel p-5 rounded-3xl border flex flex-col justify-between shadow-xl transition-all ${
              isDEmergencyOff
                ? 'border-rose-500/40 bg-rose-950/10'
                : specD
                ? 'border-amber-500/50 bg-amber-950/20'
                : 'border-indigo-500/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 font-sans flex items-center gap-1.5">
                  {specD ? <Sparkles className="w-3.5 h-3.5 text-amber-400" /> : null}
                  {specD ? `✨ ${specD.title} (স্পেশাল)` : 'রাতের খাবার'}
                </span>

                {isDEmergencyOff ? (
                  <div className="text-lg font-bold text-rose-400 font-display mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> 🚨 জরুরি বন্ধ
                  </div>
                ) : (
                  <div className="text-2xl font-extrabold text-indigo-400 font-display mt-1">
                    {dinnerMembers.length} <span className="text-xs text-slate-400 font-normal">টি মিল</span>
                  </div>
                )}
              </div>

              <div
                className={`p-3 rounded-2xl border ${
                  isDEmergencyOff
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                    : specD
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}
              >
                <Utensils className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                বাজেট: <span className="text-indigo-300 font-bold">৳{dinnerCost}</span>
              </span>
              <span className="text-slate-500 text-[11px]">
                (স্থায়ী: {dBreakdown.perm} | অতিথি: {dBreakdown.guest})
              </span>
            </div>
          </div>
        )}

        {/* Grand Total Summary Card */}
        <div className="glass-panel p-5 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 flex flex-col justify-between shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-extrabold text-amber-300 font-sans">সর্বমোট বাজার বাজেট</span>
              <div className="text-2xl font-extrabold text-amber-400 font-display mt-1">
                ৳{totalBazaarBudget}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs font-mono text-amber-200/90 font-bold">
            <span>মোট মিল: {totalMealsCount} টি</span>
            <span className="text-[11px] font-normal text-amber-300/70">
              (সক্রিয় মেম্বার: {activeUsers.length} জন)
            </span>
          </div>
        </div>
      </div>

      {/* Live Member Search Bar (Print Hidden) */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center gap-3 print:hidden">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="মেম্বারের নাম, রুম বা ফোন নম্বর দিয়ে ফিল্টার করুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-xs text-white placeholder-slate-500 font-sans focus:outline-none w-full"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-white px-2 py-0.5 bg-slate-800 rounded-lg"
          >
            ক্লিয়ার
          </button>
        )}
      </div>

      {/* Printable Cook Memo Sheet View */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 space-y-6 shadow-2xl print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
        
        {/* World Class Printable Header (Visible ONLY on print) */}
        <div className="hidden print:block border-b-2 border-black pb-4 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <ChefHat className="w-7 h-7 text-black stroke-[2.5]" />
                <h1 className="text-2xl font-black text-black font-display tracking-tight uppercase">
                  মেস ডাইনিং — বাবুর্চির দৈনিক বাজার ও মিল মেমো
                </h1>
              </div>
              <p className="text-xs font-semibold text-gray-800 mt-1 font-sans">
                অফিসিয়াল ডেইলি ডাইনিং বুকি ও রান্নার নির্দেশিকা বিবরণী
              </p>
              <div className="flex items-center gap-4 text-xs font-mono font-bold mt-2 text-black">
                <span>তারিখ: {selectedDate}</span>
                <span>|</span>
                <span>বার: {getDayOfWeekFromDateStr(selectedDate)}</span>
              </div>
            </div>

            <div className="text-right border-2 border-black p-3 bg-gray-50 rounded">
              <div className="text-xs uppercase font-bold text-gray-700">সর্বমোট দৈনিক বাজার বাজেট</div>
              <div className="text-2xl font-black text-black font-mono">৳{totalBazaarBudget}</div>
              <div className="text-xs font-bold text-black border-t border-black mt-1 pt-0.5">
                মোট বুকিং মিল: {totalMealsCount} টি
              </div>
            </div>
          </div>

          {emergencyForDate && (
            <div className="mt-3 p-2.5 border-2 border-black bg-gray-100 text-black text-xs font-bold uppercase tracking-wider">
              🚨 জরুরি বন্ধ নির্দেশিকা: {emergencyForDate.reason || 'Emergency Closure Active'}
            </div>
          )}
        </div>

        {/* Executive Summary Table (Visible ONLY on print) */}
        <div className="hidden print:block mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-1 text-black border-b border-black pb-1">
            ১. দৈনিক মিল ও বাজার বাজেট সারসংক্ষেপ (Executive Summary)
          </h3>
          <table className="w-full text-xs border border-black border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-black">
                <th className="border border-black p-1.5 text-left font-bold">মিল সেশন</th>
                <th className="border border-black p-1.5 text-center font-bold">নির্ধারিত মিল রেট (৳)</th>
                <th className="border border-black p-1.5 text-center font-bold">স্থায়ী মেম্বার</th>
                <th className="border border-black p-1.5 text-center font-bold">অতিথি মেম্বার</th>
                <th className="border border-black p-1.5 text-center font-bold">মোট মিল</th>
                <th className="border border-black p-1.5 text-right font-bold">বরাদ্দকৃত বাজেট (৳)</th>
              </tr>
            </thead>
            <tbody>
              {!isBGlobalOff && (
                <tr>
                  <td className="border border-black p-1.5 font-bold">
                    সকালের নাস্তা {specB ? `(✨${specB.title})` : ''}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {specB ? `৳${specB.customRate} (স্পেশাল)` : `৳${rates.permanent.breakfast} (স্থায়ী) / ৳${rates.guest.breakfast} (অতিথি)`}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono">{bBreakdown.perm} জন</td>
                  <td className="border border-black p-1.5 text-center font-mono">{bBreakdown.guest} জন</td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {isBEmergencyOff ? 'জরুরি বন্ধ (০)' : `${breakfastMembers.length + extraGuestStats.b} টি`}
                  </td>
                  <td className="border border-black p-1.5 text-right font-mono font-bold">৳{breakfastCost}</td>
                </tr>
              )}
              {!isLGlobalOff && (
                <tr>
                  <td className="border border-black p-1.5 font-bold">
                    দুপুরের খাবার {specL ? `(✨${specL.title})` : ''}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {specL ? `৳${specL.customRate} (স্পেশাল)` : `৳${rates.permanent.lunch} (স্থায়ী) / ৳${rates.guest.lunch} (অতিথি)`}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono">{lBreakdown.perm} জন</td>
                  <td className="border border-black p-1.5 text-center font-mono">{lBreakdown.guest} জন</td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {isLEmergencyOff ? 'জরুরি বন্ধ (০)' : `${lunchMembers.length + extraGuestStats.l} টি`}
                  </td>
                  <td className="border border-black p-1.5 text-right font-mono font-bold">৳{lunchCost}</td>
                </tr>
              )}
              {!isDGlobalOff && (
                <tr>
                  <td className="border border-black p-1.5 font-bold">
                    রাতের খাবার {specD ? `(✨${specD.title})` : ''}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {specD ? `৳${specD.customRate} (স্পেশাল)` : `৳${rates.permanent.dinner} (স্থায়ী) / ৳${rates.guest.dinner} (অতিথি)`}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono">{dBreakdown.perm} জন</td>
                  <td className="border border-black p-1.5 text-center font-mono">{dBreakdown.guest} জন</td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {isDEmergencyOff ? 'জরুরি বন্ধ (০)' : `${dinnerMembers.length + extraGuestStats.d} টি`}
                  </td>
                  <td className="border border-black p-1.5 text-right font-mono font-bold">৳{dinnerCost}</td>
                </tr>
              )}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black p-1.5 text-left font-bold" colSpan={4}>
                  সর্বমোট সমষ্টি (Total Summary)
                </td>
                <td className="border border-black p-1.5 text-center font-mono text-sm font-black">
                  {totalMealsCount} টি
                </td>
                <td className="border border-black p-1.5 text-right font-mono text-sm font-black">
                  ৳{totalBazaarBudget}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section Title for Detailed Lists */}
        <h3 className="hidden print:block text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-1 mb-3">
          ২. মেম্বারভিত্তিক বিস্তারিত খাবার তালিকা (Meal Members Breakdown)
        </h3>

        {/* Detailed Member Tables */}
        <div className={`grid grid-cols-1 ${
          activeMealsCount === 3 ? 'md:grid-cols-3 print:grid-cols-3' : activeMealsCount === 2 ? 'md:grid-cols-2 print:grid-cols-2' : 'md:grid-cols-1 print:grid-cols-1'
        } gap-6 print:gap-4`}>
          {/* Breakfast List */}
          {!isBGlobalOff && (
            <div className="rounded-2xl border border-slate-800/80 p-4 bg-slate-950/40 print:border-black print:bg-white print:p-2.5 print:rounded-none flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 print:border-black print:pb-1.5 print:mb-2">
                  <h3 className="font-bold text-emerald-400 text-sm font-display flex items-center gap-2 print:text-black print:text-xs">
                    <Utensils className="w-4 h-4 print:hidden" />
                    {specB ? `✨ ${specB.title} (৳${specB.customRate})` : `সকালের নাস্তা (৳${rates.permanent.breakfast})`} ({breakfastMembers.length} জন)
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-300 print:text-black">৳{breakfastCost}</span>
                </div>

                {isBEmergencyOff ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs italic text-center print:border-black print:text-black">
                    🚨 জরুরি বন্ধ থাকায় নাস্তা বাতিল
                  </div>
                ) : filteredB.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 print:text-black">কেউ নাস্তা খাবেন না</p>
                ) : (
                  <ul className="space-y-2 text-xs divide-y divide-slate-800/50 print:divide-gray-300 print:space-y-1">
                    {filteredB.map((m, idx) => (
                      <li key={m.id} className="pt-2 flex justify-between items-center text-slate-200 print:text-black print:pt-1">
                        <span className="font-medium print:text-[10pt]">
                          {idx + 1}. {m.name}{' '}
                          {m.profile?.roomNumber && (
                            <span className="text-[10px] text-slate-400 font-mono font-normal print:text-black print:font-bold">
                              (রুম {m.profile.roomNumber})
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-emerald-300 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 print:bg-white print:text-black print:border-black text-[11px] print:text-[9pt]">
                          {m.userType === 'PERMANENT' ? `স্থায়ী (৳${rates.permanent.breakfast})` : `অতিথি (৳${rates.guest.breakfast})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800/50 text-[11px] text-slate-400 font-mono flex justify-between print:border-black print:text-black print:font-bold">
                <span>স্থায়ী: {bBreakdown.perm}</span>
                <span>অতিথি: {bBreakdown.guest}</span>
              </div>
            </div>
          )}

          {/* Lunch List */}
          {!isLGlobalOff && (
            <div
              className={`rounded-2xl border p-4 flex flex-col justify-between transition-all print:p-2.5 print:rounded-none ${
                specL
                  ? 'border-amber-500/40 bg-amber-950/10 print:border-black print:bg-white'
                  : 'border-slate-800/80 bg-slate-950/40 print:border-black print:bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 print:border-black print:pb-1.5 print:mb-2">
                  <h3 className="font-bold text-cyan-400 text-sm font-display flex items-center gap-2 print:text-black print:text-xs">
                    <Utensils className="w-4 h-4 print:hidden" />
                    {specL ? (
                      <span className="text-amber-300 font-extrabold flex items-center gap-1 print:text-black">
                        ✨ স্পেশাল মিল ({specL.title} - ৳{specL.customRate}) ({lunchMembers.length} জন)
                      </span>
                    ) : (
                      `দুপুরের খাবার (৳${rates.permanent.lunch}) (${lunchMembers.length} জন)`
                    )}
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-300 print:text-black">৳{lunchCost}</span>
                </div>

                {isLEmergencyOff ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs italic text-center print:border-black print:text-black">
                    🚨 জরুরি বন্ধ থাকায় দুপুরের খাবার বাতিল
                  </div>
                ) : filteredL.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 print:text-black">কেউ দুপুরে খাবেন না</p>
                ) : (
                  <ul className="space-y-2 text-xs divide-y divide-slate-800/50 print:divide-gray-300 print:space-y-1">
                    {filteredL.map((m, idx) => (
                      <li key={m.id} className="pt-2 flex justify-between items-center text-slate-200 print:text-black print:pt-1">
                        <span className="font-medium print:text-[10pt]">
                          {idx + 1}. {m.name}{' '}
                          {m.profile?.roomNumber && (
                            <span className="text-[10px] text-slate-400 font-mono font-normal print:text-black print:font-bold">
                              (রুম {m.profile.roomNumber})
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-cyan-300 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 print:bg-white print:text-black print:border-black text-[11px] print:text-[9pt]">
                          {m.userType === 'PERMANENT' ? `স্থায়ী (৳${specL ? specL.customRate : rates.permanent.lunch})` : `অতিথি (৳${specL ? specL.customRate : rates.guest.lunch})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800/50 text-[11px] text-slate-400 font-mono flex justify-between print:border-black print:text-black print:font-bold">
                <span>স্থায়ী: {lBreakdown.perm}</span>
                <span>অতিথি: {lBreakdown.guest}</span>
              </div>
            </div>
          )}

          {/* Dinner List */}
          {!isDGlobalOff && (
            <div className="rounded-2xl border border-slate-800/80 p-4 bg-slate-950/40 print:border-black print:bg-white print:p-2.5 print:rounded-none flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 print:border-black print:pb-1.5 print:mb-2">
                  <h3 className="font-bold text-indigo-400 text-sm font-display flex items-center gap-2 print:text-black print:text-xs">
                    <Utensils className="w-4 h-4 print:hidden" />
                    {specD ? `✨ ${specD.title} (৳${specD.customRate})` : `রাতের খাবার (৳${rates.permanent.dinner})`} ({dinnerMembers.length} জন)
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-300 print:text-black">৳{dinnerCost}</span>
                </div>

                {isDEmergencyOff ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs italic text-center print:border-black print:text-black">
                    🚨 জরুরি বন্ধ থাকায় রাতের খাবার বাতিল
                  </div>
                ) : filteredD.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 print:text-black">কেউ রাতে খাবেন না</p>
                ) : (
                  <ul className="space-y-2 text-xs divide-y divide-slate-800/50 print:divide-gray-300 print:space-y-1">
                    {filteredD.map((m, idx) => (
                      <li key={m.id} className="pt-2 flex justify-between items-center text-slate-200 print:text-black print:pt-1">
                        <span className="font-medium print:text-[10pt]">
                          {idx + 1}. {m.name}{' '}
                          {m.profile?.roomNumber && (
                            <span className="text-[10px] text-slate-400 font-mono font-normal print:text-black print:font-bold">
                              (রুম {m.profile.roomNumber})
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-cyan-300 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 print:bg-white print:text-black print:border-black text-[11px] print:text-[9pt]">
                          {m.userType === 'PERMANENT' ? `স্থায়ী (৳${specD ? specD.customRate : rates.permanent.dinner})` : `অতিথি (৳${specD ? specD.customRate : rates.guest.dinner})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800/50 text-[11px] text-slate-400 font-mono flex justify-between print:border-black print:text-black print:font-bold">
                <span>স্থায়ী: {dBreakdown.perm}</span>
                <span>অতিথি: {dBreakdown.guest}</span>
              </div>
            </div>
          )}
        </div>

        {/* Clean Footer Timestamp Note (No Signature Needed for Cook Memo) */}
        <div className="hidden print:block text-center text-[8pt] text-black border-t border-black pt-2 font-mono mt-6">
          মেস ডাইনিং ম্যানেজমেন্ট সিস্টেম | বাবুর্চির দৈনিক বাজার ও রান্নার নির্দেশিকা মেমো | প্রিন্ট সময়: {new Date().toLocaleString('bn-BD')}
        </div>
      </div>
    </div>
  );
};

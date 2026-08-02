import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Calendar, Search, Filter, Sparkles, CheckCircle2, XCircle, Check, X, Users, RefreshCw, ShieldAlert, AlertOctagon, PauseCircle, PlayCircle, CheckSquare, Square } from 'lucide-react';
import { User, MealDeclaration, SpecialMeal, MealRateConfig, EmergencyClosure } from '../../types';
import { MockService } from '../../services/mockStorage';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { getBangladeshDateStr, getBangladeshTomorrowStr } from '../../utils/dateUtils';

interface BulkMealControlProps {
  users: User[];
  declarations: MealDeclaration[];
  rates?: MealRateConfig;
  specialMeals?: SpecialMeal[];
  emergencies?: EmergencyClosure[];
  onRefreshData: () => void;
}

export const BulkMealControl: React.FC<BulkMealControlProps> = ({
  users,
  declarations,
  rates,
  specialMeals = [],
  emergencies = [],
  onRefreshData,
}) => {
  const approvedUsers = users.filter((u) => u.status === 'APPROVED');
  const todayStr = getBangladeshDateStr();
  const tomorrowStr = getBangladeshTomorrowStr();

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'ALL' | 'PERMANENT' | 'GUEST'>('ALL');
  const [pauseFilter, setPauseFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Selected users checkboxes state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Local state map for member declarations on the selected date
  // Key: userId, Value: { breakfast: boolean, lunch: boolean, dinner: boolean }
  const [mealMap, setMealMap] = useState<Record<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>>({});

  // Determine if selectedDate falls in an emergency closure
  const emergencyForDate = emergencies.find((em) => {
    const start = em.date;
    const end = em.endDate || em.date;
    return selectedDate >= start && selectedDate <= end;
  });

  const isBEmergencyOff = !!emergencyForDate && emergencyForDate.closedMeals.includes('breakfast');
  const isLEmergencyOff = !!emergencyForDate && emergencyForDate.closedMeals.includes('lunch');
  const isDEmergencyOff = !!emergencyForDate && emergencyForDate.closedMeals.includes('dinner');

  // Sync state whenever selectedDate, approvedUsers, declarations, or emergencies update
  useEffect(() => {
    const newMap: Record<string, { breakfast: boolean; lunch: boolean; dinner: boolean }> = {};

    approvedUsers.forEach((u) => {
      const dec = declarations.find((d) => d.userId === u.id && d.date === selectedDate);
      if (dec) {
        newMap[u.id] = {
          breakfast: isBEmergencyOff ? false : dec.breakfast,
          lunch: isLEmergencyOff ? false : dec.lunch,
          dinner: isDEmergencyOff ? false : dec.dinner,
        };
      } else {
        newMap[u.id] = {
          breakfast: isBEmergencyOff ? false : true,
          lunch: isLEmergencyOff ? false : true,
          dinner: isDEmergencyOff ? false : true,
        };
      }
    });

    setMealMap(newMap);
  }, [selectedDate, declarations, users, emergencies, isBEmergencyOff, isLEmergencyOff, isDEmergencyOff]);

  // Special meal info for selected date
  const specialObj = specialMeals.find(
    (sm) => sm.isActive !== false && (sm.date === selectedDate || sm.isRecurring)
  );

  // Filtered members list
  const filteredUsers = approvedUsers.filter((u) => {
    if (userTypeFilter !== 'ALL' && u.userType !== userTypeFilter) return false;
    if (pauseFilter === 'ACTIVE' && u.isIndefinitelyPaused) return false;
    if (pauseFilter === 'PAUSED' && !u.isIndefinitelyPaused) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = u.name.toLowerCase().includes(term);
      const matchPhone = u.phone.includes(term);
      return matchName || matchPhone;
    }
    return true;
  });

  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.has(u.id));

  // Toggle select all users in filtered list
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds(new Set());
    } else {
      const next = new Set(selectedUserIds);
      filteredUsers.forEach((u) => next.add(u.id));
      setSelectedUserIds(next);
    }
  };

  // Toggle selection for a single user
  const handleToggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Target users for bulk actions (if none selected, apply to all filtered users)
  const getTargetUsers = () => {
    if (selectedUserIds.size > 0) {
      return filteredUsers.filter((u) => selectedUserIds.has(u.id));
    }
    return filteredUsers;
  };

  // Calculate counters
  const totalB = Object.values(mealMap).filter((m) => m.breakfast).length;
  const totalL = Object.values(mealMap).filter((m) => m.lunch).length;
  const totalD = Object.values(mealMap).filter((m) => m.dinner).length;

  const handleToggleSingleMeal = (userId: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
    setAlertMsg(null);

    // Emergency restriction check
    if (
      (meal === 'breakfast' && isBEmergencyOff) ||
      (meal === 'lunch' && isLEmergencyOff) ||
      (meal === 'dinner' && isDEmergencyOff)
    ) {
      const mealTitle = meal === 'breakfast' ? 'সকালের নাস্তা' : meal === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার';
      setAlertMsg(`🚨 ${selectedDate} তারিখে ${mealTitle} জরুরি নোটিশের কারণে বন্ধ রয়েছে। জরুরি অবস্থায় এই মিল অন করা সম্ভব নয়।`);
      return;
    }

    setMealMap((prev) => {
      const current = prev[userId] || { breakfast: true, lunch: true, dinner: true };
      return {
        ...prev,
        [userId]: {
          ...current,
          [meal]: !current[meal],
        },
      };
    });
  };

  const handleMasterToggleMeal = (meal: 'breakfast' | 'lunch' | 'dinner', state: boolean) => {
    setAlertMsg(null);

    // Emergency restriction check
    if (
      state &&
      ((meal === 'breakfast' && isBEmergencyOff) ||
        (meal === 'lunch' && isLEmergencyOff) ||
        (meal === 'dinner' && isDEmergencyOff))
    ) {
      const mealTitle = meal === 'breakfast' ? 'সকালের নাস্তা' : meal === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার';
      setAlertMsg(`🚨 ${selectedDate} তারিখে ${mealTitle} জরুরি বন্ধ রাখা হয়েছে। জরুরি অবস্থায় এডমিনও মিল অন করতে পারবেন না।`);
      return;
    }

    const targetUsers = getTargetUsers();

    setMealMap((prev) => {
      const next = { ...prev };
      targetUsers.forEach((u) => {
        const current = next[u.id] || { breakfast: true, lunch: true, dinner: true };
        next[u.id] = {
          ...current,
          [meal]: state,
        };
      });
      return next;
    });
  };

  const handleMasterToggleAllMeals = (state: boolean) => {
    setAlertMsg(null);
    const targetUsers = getTargetUsers();

    if (state && (isBEmergencyOff || isLEmergencyOff || isDEmergencyOff)) {
      setAlertMsg(`🚨 জরুরি বন্ধের আওতাভুক্ত মিলসমূহ বন্ধ রেখে বাকি মিলগুলো অন করা হয়েছে।`);
    }

    setMealMap((prev) => {
      const next = { ...prev };
      targetUsers.forEach((u) => {
        next[u.id] = {
          breakfast: isBEmergencyOff ? false : state,
          lunch: isLEmergencyOff ? false : state,
          dinner: isDEmergencyOff ? false : state,
        };
      });
      return next;
    });
  };

  // Toggle single user indefinite pause (অনির্দিষ্টকালের জন্য অফ)
  const handleToggleSingleUserPause = async (user: User) => {
    setAlertMsg(null);
    try {
      const nextPause = !user.isIndefinitelyPaused;
      await MockService.setUserIndefinitePause(user.id, nextPause);
      setAlertMsg(
        nextPause
          ? `⏸️ ${user.name}-এর মিল সুবিধা অনির্দিষ্টকালের জন্য স্থগিত করা হয়েছে।`
          : `▶️ ${user.name}-এর অনির্দিষ্টকালের স্থগিতা প্রত্যাহার করে মিল চালূ করা হয়েছে।`
      );
      onRefreshData();
    } catch (err: any) {
      setAlertMsg(`ত্রুটি: ${err.message}`);
    }
  };

  // Bulk indefinite pause (অনির্দিষ্টকালের জন্য অফ) for selected users
  const handleBulkIndefinitePause = async (isPaused: boolean) => {
    setAlertMsg(null);
    const targetUsers = getTargetUsers();
    if (targetUsers.length === 0) return;

    setSaving(true);
    try {
      for (const u of targetUsers) {
        await MockService.setUserIndefinitePause(u.id, isPaused);
      }
      setAlertMsg(
        isPaused
          ? `⏸️ মোট ${targetUsers.length} জন মেম্বারের মিল অনির্দিষ্টকালের জন্য অফ করা হয়েছে।`
          : `▶️ মোট ${targetUsers.length} জন মেম্বারের অনির্দিষ্টকালের অফ বাতিল করে মিল পুনরায় চালু করা হয়েছে।`
      );
      onRefreshData();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBulkDeclarations = async () => {
    setSaving(true);
    setSuccessBanner(false);
    setAlertMsg(null);
    try {
      // Save all declarations for all approved users
      for (const u of approvedUsers) {
        const meals = mealMap[u.id] || { breakfast: true, lunch: true, dinner: true };
        // Enforce emergency closure
        const safeMeals = {
          breakfast: isBEmergencyOff ? false : meals.breakfast,
          lunch: isLEmergencyOff ? false : meals.lunch,
          dinner: isDEmergencyOff ? false : meals.dinner,
        };
        await MockService.updateDeclaration(u.id, selectedDate, safeMeals);
      }
      setSuccessBanner(true);
      onRefreshData();
      setTimeout(() => setSuccessBanner(false), 5000);
    } catch (err: any) {
      setAlertMsg(`ডিক্লারেশন সংরক্ষণে সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto animate-scale-in">
      
      {/* Top Banner Header */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-amber-500/30 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-white font-display">
                এডমিন বাল্ক মিল কন্ট্রোল ও ওভাররাইড হাব
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              একসাথে সব মেম্বারের সকালের নাস্তা, দুপুরের খাবার ও রাতের খাবার অন/অফ পরিচালনা করুন (সকাল ১০:০০ কাট-অফ বাইপাসসহ)।
            </p>
          </div>

          {/* Target Date Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedDate === todayStr
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-lg shadow-amber-500/25'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-amber-500/50'
              }`}
            >
              আজ
            </button>

            <button
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedDate === tomorrowStr
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-lg shadow-amber-500/25'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-amber-500/50'
              }`}
            >
              আগামীকাল
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-cyan-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Emergency Closure Restriction Alert */}
        {emergencyForDate && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-start gap-3 shadow-lg animate-pulse">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-rose-300 font-display">
                🚨 {selectedDate} তারিখে এডমিন কর্তৃক জরুরি বন্ধ কার্যকর রয়েছে ({emergencyForDate.reason})
              </p>
              <p className="text-[11px] text-rose-200/90 font-sans mt-0.5">
                বন্ধ থাকা মিলসমূহ: <span className="underline font-mono">{emergencyForDate.closedMeals.map(m => m === 'breakfast' ? 'সকালের নাস্তা' : m === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার').join(', ')}</span>। জরুরি বন্ধের সময় এডমিনও উক্ত মিলসমূহ অন করতে পারবেন না।
              </p>
            </div>
          </div>
        )}

        {/* Master Global Meal Switch Indicator */}
        {rates?.globalMealStatus && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              সিস্টেম মাস্টার গ্লোবাল সুইচ স্ট্যাটাস:
            </span>
            <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${rates.globalMealStatus.breakfast ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'}`}>
              সকাল: {rates.globalMealStatus.breakfast ? 'অন' : '⛔ সিস্টেম বন্ধ (Off)'}
            </span>
            <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${rates.globalMealStatus.lunch ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'}`}>
              দুপুর: {rates.globalMealStatus.lunch ? 'অন' : '⛔ সিস্টেম বন্ধ (Off)'}
            </span>
            <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${rates.globalMealStatus.dinner ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'}`}>
              রাত: {rates.globalMealStatus.dinner ? 'অন' : '⛔ সিস্টেম বন্ধ (Off)'}
            </span>
          </div>
        )}

        {specialObj && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>স্পেশাল মিল ইভেন্ট সক্রিয়:</strong> {specialObj.title} (৳{specialObj.customRate})
            </span>
          </div>
        )}
      </div>

      {/* Alert Notification Toast */}
      {alertMsg && (
        <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 flex items-center justify-between shadow-xl animate-slide-down">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-xs font-bold text-amber-200 font-sans">{alertMsg}</p>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-amber-400 hover:text-amber-200 text-xs font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Alert Banner */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-center justify-between shadow-xl animate-slide-down">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm font-display text-emerald-300">বাল্ক আপডেট সফল হয়েছে!</h4>
              <p className="text-xs text-emerald-200/80">
                {selectedDate} তারিখের সকল মেম্বারের মিল ডিক্লারেশন এডমিন ওভাররাইডসহ সংরক্ষিত হয়েছে।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Live Counters & Save Master Button */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-sans">সকালের নাস্তা মোট</p>
            <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">{totalB} জন</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-sans">দুপুরের খাবার মোট</p>
            <p className="text-2xl font-extrabold text-sky-400 font-mono mt-0.5">{totalL} জন</p>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-sans">রাতের খাবার মোট</p>
            <p className="text-2xl font-extrabold text-purple-400 font-mono mt-0.5">{totalD} জন</p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
        </div>

        <button
          onClick={handleSaveBulkDeclarations}
          disabled={saving}
          className="py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-2 font-display"
        >
          <Sparkles className="w-5 h-5" />
          <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'এক ক্লিকে সমস্ত মিল সেভ করুন'}</span>
        </button>
      </div>

      {/* Master Toggle Controls & Selection Hub */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
        
        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="মেম্বারের নাম বা ফোন দিয়ে খুঁজুন..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter by User Type */}
            <div className="flex flex-wrap items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs w-full sm:w-auto">
              <button
                onClick={() => setUserTypeFilter('ALL')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all ${
                  userTypeFilter === 'ALL'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                সবাই ({approvedUsers.length})
              </button>
              <button
                onClick={() => setUserTypeFilter('PERMANENT')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all ${
                  userTypeFilter === 'PERMANENT'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                স্থায়ী ({approvedUsers.filter((u) => u.userType === 'PERMANENT').length})
              </button>
              <button
                onClick={() => setUserTypeFilter('GUEST')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all ${
                  userTypeFilter === 'GUEST'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                অতিথি ({approvedUsers.filter((u) => u.userType === 'GUEST').length})
              </button>
            </div>

            {/* Filter by Pause Status */}
            <div className="flex flex-wrap items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs w-full sm:w-auto">
              <button
                onClick={() => setPauseFilter('ALL')}
                className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                  pauseFilter === 'ALL'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                সব পজ
              </button>
              <button
                onClick={() => setPauseFilter('ACTIVE')}
                className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                  pauseFilter === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ▶️ অন ({approvedUsers.filter((u) => !u.isIndefinitelyPaused).length})
              </button>
              <button
                onClick={() => setPauseFilter('PAUSED')}
                className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                  pauseFilter === 'PAUSED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⏸️ অফ ({approvedUsers.filter((u) => u.isIndefinitelyPaused).length})
              </button>
            </div>
          </div>
        </div>

        {/* Master Quick Toggle Buttons Bar with Selection Options */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-2 font-bold text-slate-200">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 transition-all font-mono"
              >
                {isAllSelected ? <CheckSquare className="w-4 h-4 text-cyan-400" /> : <Square className="w-4 h-4 text-slate-400" />}
                <span>{isAllSelected ? 'সব সিলেক্টড উঠান' : 'সবাইকে সিলেক্ট (Select All)'}</span>
              </button>
              
              <span className="text-slate-400 font-sans">
                {selectedUserIds.size > 0 ? (
                  <span className="text-cyan-300 font-bold">
                    🎯 সিলেক্টড: <span className="text-amber-400 font-mono text-sm">{selectedUserIds.size}</span> জন
                  </span>
                ) : (
                  <span className="text-slate-400 text-[11px]">
                    (সকল <span className="text-amber-400 font-mono">{filteredUsers.length}</span> জনের জন্য প্রযোজ্য)
                  </span>
                )}
              </span>
            </div>

            {/* Indefinite Pause Bulk Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleBulkIndefinitePause(true)}
                disabled={saving}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-extrabold flex items-center justify-center gap-1.5 transition-all text-[11px] active:scale-95"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>{selectedUserIds.size > 0 ? `সিলেক্টড (${selectedUserIds.size}) অনির্দিষ্ট অফ` : 'সবার অনির্দিষ্ট অফ'}</span>
              </button>

              <button
                onClick={() => handleBulkIndefinitePause(false)}
                disabled={saving}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-extrabold flex items-center justify-center gap-1.5 transition-all text-[11px] active:scale-95"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>{selectedUserIds.size > 0 ? `সিলেক্টড (${selectedUserIds.size}) অফ বাতিল` : 'সবার অফ বাতিল (Resume)'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 font-display">
              ⚡ বাল্ক মিল অন/অফ কন্ট্রোল:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {/* Breakfast All */}
              <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
                <button
                  onClick={() => handleMasterToggleMeal('breakfast', true)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                    isBEmergencyOff
                      ? 'bg-rose-500/10 text-rose-400 opacity-50 cursor-not-allowed'
                      : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                  }`}
                >
                  {isBEmergencyOff ? '🚨 সকাল বন্ধ' : 'সকাল ALL ON'}
                </button>
                <button
                  onClick={() => handleMasterToggleMeal('breakfast', false)}
                  className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-400 text-[11px]"
                >
                  OFF
                </button>
              </div>

              {/* Lunch All */}
              <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
                <button
                  onClick={() => handleMasterToggleMeal('lunch', true)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                    isLEmergencyOff
                      ? 'bg-rose-500/10 text-rose-400 opacity-50 cursor-not-allowed'
                      : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                  }`}
                >
                  {isLEmergencyOff ? '🚨 দুপুর বন্ধ' : 'দুপুর ALL ON'}
                </button>
                <button
                  onClick={() => handleMasterToggleMeal('lunch', false)}
                  className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-400 text-[11px]"
                >
                  OFF
                </button>
              </div>

              {/* Dinner All */}
              <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
                <button
                  onClick={() => handleMasterToggleMeal('dinner', true)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                    isDEmergencyOff
                      ? 'bg-rose-500/10 text-rose-400 opacity-50 cursor-not-allowed'
                      : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                  }`}
                >
                  {isDEmergencyOff ? '🚨 রাত বন্ধ' : 'রাত ALL ON'}
                </button>
                <button
                  onClick={() => handleMasterToggleMeal('dinner', false)}
                  className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-400 text-[11px]"
                >
                  OFF
                </button>
              </div>

              {/* All Meals Master Switch */}
              <div className="flex items-center rounded-xl bg-amber-500/10 border border-amber-500/30 p-1">
                <button
                  onClick={() => handleMasterToggleAllMeals(true)}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold hover:bg-amber-500/30 text-[11px]"
                >
                  ৩ বেলা ALL ON
                </button>
                <button
                  onClick={() => handleMasterToggleAllMeals(false)}
                  className="px-3 py-1 rounded-lg text-rose-300 hover:bg-rose-500/20 font-extrabold text-[11px]"
                >
                  সব OFF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Member Meals Table */}
      <div className="glass-panel rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl relative">
        <div className="sm:hidden px-4 py-2 bg-slate-900/90 text-amber-400 border-b border-slate-800 text-[11px] font-bold flex items-center justify-between">
          <span>📱 মোবাইল স্ক্রোল গাইড</span>
          <span className="font-mono text-[10px] text-slate-400">ডানে স্ক্রোল করে সব মিল দেখুন ➔</span>
        </div>
        <div className="overflow-x-auto touch-pan-x no-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-800 uppercase tracking-wider font-sans font-bold">
                <th className="p-4 w-10 text-center sticky left-0 bg-slate-900 z-20">
                  <button onClick={handleToggleSelectAll} className="focus:outline-none">
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400 mx-auto" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 hover:text-slate-300 mx-auto" />
                    )}
                  </button>
                </th>
                <th className="p-4 sticky left-10 bg-slate-900 z-20 min-w-[170px]">সদস্যের বিবরণ</th>
                <th className="p-4 text-center">অনির্দিষ্টকালের জন্য অফ</th>
                <th className="p-4 text-center">সকালের নাস্তা</th>
                <th className="p-4 text-center">দুপুরের খাবার</th>
                <th className="p-4 text-center">রাতের খাবার</th>
                <th className="p-4 text-center">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredUsers.map((u) => {
                const meals = mealMap[u.id] || { breakfast: true, lunch: true, dinner: true };
                const totalActiveCount = (meals.breakfast ? 1 : 0) + (meals.lunch ? 1 : 0) + (meals.dinner ? 1 : 0);
                const isSelected = selectedUserIds.has(u.id);

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-cyan-500/10 hover:bg-cyan-500/15' : 'hover:bg-slate-900/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className={`p-4 text-center sticky left-0 z-10 ${isSelected ? 'bg-cyan-950/90' : 'bg-slate-950/95'}`}>
                      <button onClick={() => handleToggleSelectUser(u.id)} className="focus:outline-none">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400 mx-auto" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 hover:text-slate-400 mx-auto" />
                        )}
                      </button>
                    </td>

                    {/* User Info - Sticky on Left for Mobile */}
                    <td className={`p-4 sticky left-10 z-10 border-r border-slate-800/60 shadow-md ${isSelected ? 'bg-cyan-950/90' : 'bg-slate-950/95'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-xs font-display shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-slate-100 text-xs sm:text-sm whitespace-nowrap">{u.name}</h4>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-bold shrink-0 ${
                                u.userType === 'PERMANENT'
                                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {u.userType === 'PERMANENT' ? 'স্থায়ী' : 'অতিথি'}
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                            {u.phone} &nbsp;|&nbsp; ৳{u.walletBalance}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Indefinite Pause Control */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleSingleUserPause(u)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border shadow-sm active:scale-95 flex items-center justify-center gap-1 mx-auto whitespace-nowrap ${
                          u.isIndefinitelyPaused
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.isIndefinitelyPaused ? (
                          <>
                            <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>⏸️ বন্ধ (Paused)</span>
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>▶️ সক্রিয় (Active)</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Breakfast Toggle */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleSingleMeal(u.id, 'breakfast')}
                        disabled={isBEmergencyOff}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border shadow-sm active:scale-95 whitespace-nowrap ${
                          isBEmergencyOff
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 opacity-60 cursor-not-allowed'
                            : meals.breakfast
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {isBEmergencyOff ? '🚨 জরুরি বন্ধ' : meals.breakfast ? '✅ অন' : '❌ অফ'}
                      </button>
                    </td>

                    {/* Lunch Toggle */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleSingleMeal(u.id, 'lunch')}
                        disabled={isLEmergencyOff}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border shadow-sm active:scale-95 whitespace-nowrap ${
                          isLEmergencyOff
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 opacity-60 cursor-not-allowed'
                            : meals.lunch
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {isLEmergencyOff ? '🚨 জরুরি বন্ধ' : meals.lunch ? '✅ অন' : '❌ অফ'}
                      </button>
                    </td>

                    {/* Dinner Toggle */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleSingleMeal(u.id, 'dinner')}
                        disabled={isDEmergencyOff}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border shadow-sm active:scale-95 whitespace-nowrap ${
                          isDEmergencyOff
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 opacity-60 cursor-not-allowed'
                            : meals.dinner
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {isDEmergencyOff ? '🚨 জরুরি বন্ধ' : meals.dinner ? '✅ অন' : '❌ অফ'}
                      </button>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono border whitespace-nowrap ${
                          u.isIndefinitelyPaused
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : totalActiveCount === 3
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : totalActiveCount > 0
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {u.isIndefinitelyPaused
                          ? '⏸️ অনির্দিষ্ট বন্ধ'
                          : totalActiveCount === 3
                          ? 'সকল মিল অন'
                          : totalActiveCount === 0
                          ? 'সব অফ'
                          : `${totalActiveCount}টি মিল অন`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

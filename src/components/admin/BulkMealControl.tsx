import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Calendar, Search, Filter, Sparkles, CheckCircle2, XCircle, Check, X, Users, RefreshCw, ShieldAlert } from 'lucide-react';
import { User, MealDeclaration, SpecialMeal, MealRateConfig } from '../../types';
import { MockService } from '../../services/mockStorage';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { getBangladeshDateStr, getBangladeshTomorrowStr } from '../../utils/dateUtils';

interface BulkMealControlProps {
  users: User[];
  declarations: MealDeclaration[];
  rates?: MealRateConfig;
  specialMeals?: SpecialMeal[];
  onRefreshData: () => void;
}

export const BulkMealControl: React.FC<BulkMealControlProps> = ({
  users,
  declarations,
  rates,
  specialMeals = [],
  onRefreshData,
}) => {
  const approvedUsers = users.filter((u) => u.status === 'APPROVED');
  const todayStr = getBangladeshDateStr();
  const tomorrowStr = getBangladeshTomorrowStr();

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'ALL' | 'PERMANENT' | 'GUEST'>('ALL');
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  // Local state map for member declarations on the selected date
  // Key: userId, Value: { breakfast: boolean, lunch: boolean, dinner: boolean }
  const [mealMap, setMealMap] = useState<Record<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>>({});

  // Sync state whenever selectedDate, approvedUsers, or declarations update
  useEffect(() => {
    const newMap: Record<string, { breakfast: boolean; lunch: boolean; dinner: boolean }> = {};

    approvedUsers.forEach((u) => {
      const dec = declarations.find((d) => d.userId === u.id && d.date === selectedDate);
      if (dec) {
        newMap[u.id] = {
          breakfast: dec.breakfast,
          lunch: dec.lunch,
          dinner: dec.dinner,
        };
      } else {
        // Default default meal declaration if not explicitly set
        newMap[u.id] = {
          breakfast: true,
          lunch: true,
          dinner: true,
        };
      }
    });

    setMealMap(newMap);
  }, [selectedDate, declarations, users]);

  // Special meal info for selected date
  const specialObj = specialMeals.find(
    (sm) => sm.isActive !== false && (sm.date === selectedDate || sm.isRecurring)
  );

  // Filtered members list
  const filteredUsers = approvedUsers.filter((u) => {
    if (userTypeFilter !== 'ALL' && u.userType !== userTypeFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = u.name.toLowerCase().includes(term);
      const matchPhone = u.phone.includes(term);
      return matchName || matchPhone;
    }
    return true;
  });

  // Calculate counters
  const totalB = Object.values(mealMap).filter((m) => m.breakfast).length;
  const totalL = Object.values(mealMap).filter((m) => m.lunch).length;
  const totalD = Object.values(mealMap).filter((m) => m.dinner).length;

  const handleToggleSingleMeal = (userId: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
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

  const handleMasterToggleAll = (meal: 'breakfast' | 'lunch' | 'dinner', state: boolean) => {
    setMealMap((prev) => {
      const next = { ...prev };
      filteredUsers.forEach((u) => {
        const current = next[u.id] || { breakfast: true, lunch: true, dinner: true };
        next[u.id] = {
          ...current,
          [meal]: state,
        };
      });
      return next;
    });
  };

  const handleSaveBulkDeclarations = async () => {
    setSaving(true);
    setSuccessBanner(false);
    try {
      // Save all declarations for all approved users
      for (const u of approvedUsers) {
        const meals = mealMap[u.id] || { breakfast: true, lunch: true, dinner: true };
        await MockService.updateDeclaration(u.id, selectedDate, meals);
      }
      setSuccessBanner(true);
      onRefreshData();
      setTimeout(() => setSuccessBanner(false), 5000);
    } catch (err: any) {
      alert(err.message || 'বাল্ক ডিক্লারেশন সেভ করতে সমস্য হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto animate-scale-in">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 space-y-4 shadow-2xl relative overflow-hidden">
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

      {/* Master Toggle Controls & Search */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="সদস্যের নাম বা রুম নম্বর খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Member Type Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setUserTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                userTypeFilter === 'ALL'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              সবাই ({approvedUsers.length})
            </button>

            <button
              onClick={() => setUserTypeFilter('PERMANENT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                userTypeFilter === 'PERMANENT'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              স্থায়ী ({approvedUsers.filter((u) => u.userType === 'PERMANENT').length})
            </button>

            <button
              onClick={() => setUserTypeFilter('GUEST')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                userTypeFilter === 'GUEST'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              অতিথি ({approvedUsers.filter((u) => u.userType === 'GUEST').length})
            </button>
          </div>
        </div>

        {/* Master Quick Toggle Buttons Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5 font-display">
            ⚡ সবার জন্য একসাথে অন/অফ কন্ট্রোল:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Breakfast All */}
            <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
              <button
                onClick={() => handleMasterToggleAll('breakfast', true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/30 text-[11px]"
              >
                সকাল ALL ON
              </button>
              <button
                onClick={() => handleMasterToggleAll('breakfast', false)}
                className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-400 text-[11px]"
              >
                OFF
              </button>
            </div>

            {/* Lunch All */}
            <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
              <button
                onClick={() => handleMasterToggleAll('lunch', true)}
                className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold hover:bg-sky-500/30 text-[11px]"
              >
                দুপুর ALL ON
              </button>
              <button
                onClick={() => handleMasterToggleAll('lunch', false)}
                className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-400 text-[11px]"
              >
                OFF
              </button>
            </div>

            {/* Dinner All */}
            <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
              <button
                onClick={() => handleMasterToggleAll('dinner', true)}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-bold hover:bg-purple-500/30 text-[11px]"
              >
                রাত ALL ON
              </button>
              <button
                onClick={() => handleMasterToggleAll('dinner', false)}
                className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-400 text-[11px]"
              >
                OFF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Member Meals Table */}
      <div className="glass-panel rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-800 uppercase tracking-wider font-sans font-bold">
                <th className="p-4">সদস্যের বিবরণ</th>
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

                return (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-sm font-display shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-sm">{u.name}</h4>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {u.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Breakfast Toggle */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleSingleMeal(u.id, 'breakfast')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border shadow-sm active:scale-95 ${
                          meals.breakfast
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {meals.breakfast ? '✅ অন' : '❌ অফ'}
                      </button>
                    </td>

                    {/* Lunch Toggle */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleSingleMeal(u.id, 'lunch')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border shadow-sm active:scale-95 ${
                          meals.lunch
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {meals.lunch ? '✅ অন' : '❌ অফ'}
                      </button>
                    </td>

                    {/* Dinner Toggle */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleSingleMeal(u.id, 'dinner')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border shadow-sm active:scale-95 ${
                          meals.dinner
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {meals.dinner ? '✅ অন' : '❌ অফ'}
                      </button>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono border ${
                          totalActiveCount === 3
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : totalActiveCount > 0
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {totalActiveCount === 3 ? 'সকল মিল অন' : totalActiveCount === 0 ? 'সব অফ' : `${totalActiveCount}টি মিল অন`}
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

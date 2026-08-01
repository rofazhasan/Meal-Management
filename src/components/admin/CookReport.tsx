import React, { useState } from 'react';
import { ChefHat, Calendar, Printer, Utensils, CheckCircle2, DollarSign, Users, Sparkles, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { User, MealDeclaration, MealRateConfig, SpecialMeal } from '../../types';
import { BN } from '../../constants/banglaText';
import { getBangladeshDateStr, getDayOfWeekFromDateStr } from '../../utils/dateUtils';
import { MockService } from '../../services/mockStorage';

interface CookReportProps {
  users: User[];
  declarations: MealDeclaration[];
  rates: MealRateConfig;
  specialMeals?: SpecialMeal[];
}

export const CookReport: React.FC<CookReportProps> = ({
  users,
  declarations,
  rates,
  specialMeals = [],
}) => {
  const [selectedDate, setSelectedDate] = useState(() => getBangladeshDateStr());

  // Dynamically fetch declarations for selectedDate with auto-copy & emergency rules
  const { data: dateDeclarations = declarations.filter(d => d.date === selectedDate) } = useQuery({
    queryKey: ['declarations', selectedDate],
    queryFn: () => MockService.getDeclarationsForDate(selectedDate),
  });

  // Approved active users
  const activeUsers = users.filter((u) => u.status === 'APPROVED');

  const getSpecialMealForType = (type: 'breakfast' | 'lunch' | 'dinner') => {
    const dayOfWeek = getDayOfWeekFromDateStr(selectedDate);
    return specialMeals.find((sm) => {
      if (sm.isActive === false) return false;
      if (sm.mealType !== type) return false;
      if (sm.date === selectedDate) return true;
      if (sm.isRecurring && sm.repeatDayOfWeek === dayOfWeek) return true;
      return false;
    });
  };

  const specB = getSpecialMealForType('breakfast');
  const specL = getSpecialMealForType('lunch');
  const specD = getSpecialMealForType('dinner');
  const specialForDate = specB || specL || specD;

  // Group members eating each meal
  const breakfastMembers: User[] = [];
  const lunchMembers: User[] = [];
  const dinnerMembers: User[] = [];

  const isBGlobalOff = rates.globalMealStatus?.breakfast === false;
  const isLGlobalOff = rates.globalMealStatus?.lunch === false;
  const isDGlobalOff = rates.globalMealStatus?.dinner === false;

  activeUsers.forEach((user) => {
    if (user.isIndefinitelyPaused) return;

    const userDec = dateDeclarations.find((d) => d.userId === user.id);

    if (!isBGlobalOff && userDec?.breakfast) {
      breakfastMembers.push(user);
    }
    if (!isLGlobalOff && userDec?.lunch) {
      lunchMembers.push(user);
    }
    if (!isDGlobalOff && userDec?.dinner) {
      dinnerMembers.push(user);
    }
  });

  // Calculate costs
  const calculateMealTotalCost = (memberList: User[], mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const specMeal = getSpecialMealForType(mealType);
    return memberList.reduce((sum, u) => {
      const userRates = u.userType === 'PERMANENT' ? rates.permanent : rates.guest;
      const price = specMeal ? specMeal.customRate : userRates[mealType];
      return sum + price;
    }, 0);
  };

  const breakfastCost = calculateMealTotalCost(breakfastMembers, 'breakfast');
  const lunchCost = calculateMealTotalCost(lunchMembers, 'lunch');
  const dinnerCost = calculateMealTotalCost(dinnerMembers, 'dinner');

  const totalMealsCount = breakfastMembers.length + lunchMembers.length + dinnerMembers.length;
  const totalBazaarBudget = breakfastCost + lunchCost + dinnerCost;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto animate-scale-in">
      
      {/* Header Bar */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xl print:hidden">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <ChefHat className="w-6 h-6" />
            </div>
            বাবুর্চির দৈনিক বাজার ও মিল হিসাব (Cook Report)
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            দৈনিক বাবুর্চির জন্য নিখুঁত মিল সংখ্যা, বাজার বাজেট এবং রুমভিত্তিক মেম্বারদের তালিকা
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5">
            <Calendar className="w-4 h-4 text-cyan-400 ml-2" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-cyan-300 font-mono font-bold focus:outline-none pr-2"
            />
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/25 active:scale-95 font-display"
          >
            <Printer className="w-4 h-4" />
            <span>বাবুর্চি মেমো প্রিন্ট করুন</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for Cook */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        
        {/* Breakfast Card */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400 font-sans">সকালের নাস্তা</span>
            <div className="text-2xl font-extrabold text-emerald-400 font-display mt-1">
              {breakfastMembers.length} <span className="text-xs text-slate-400 font-normal">টি মিল</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">বাজেট: ৳{breakfastCost}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        {/* Lunch Card */}
        <div className="glass-panel p-5 rounded-3xl border border-cyan-500/30 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400 font-sans">দুপুরের খাবার</span>
            <div className="text-2xl font-extrabold text-cyan-400 font-display mt-1">
              {lunchMembers.length} <span className="text-xs text-slate-400 font-normal">টি মিল</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">বাজেট: ৳{lunchCost}</p>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        {/* Dinner Card */}
        <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400 font-sans">রাতের খাবার</span>
            <div className="text-2xl font-extrabold text-indigo-400 font-display mt-1">
              {dinnerMembers.length} <span className="text-xs text-slate-400 font-normal">টি মিল</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">বাজেট: ৳{dinnerCost}</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        {/* Total Grand Summary Card */}
        <div className="glass-panel p-5 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-amber-300 font-sans">সর্বমোট বাজার বাজেট</span>
            <div className="text-2xl font-extrabold text-amber-400 font-display mt-1">
              ৳{totalBazaarBudget}
            </div>
            <p className="text-xs text-amber-200/80 font-mono mt-1">মোট মিল: {totalMealsCount} টি</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Special Meal Note if any */}
      {specialForDate && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center gap-3 print:border-amber-400">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-amber-300">আজকের বিশেষ মেনু: {specialForDate.title}</span> • {specialForDate.description || 'স্পেশাল মিল প্রস্তুত করুন'}
          </div>
        </div>
      )}

      {/* Printable Sheet View */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 space-y-6 shadow-2xl print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
        
        {/* Print Only Header */}
        <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-black font-display">মেস ডাইনিং - বাবুর্চির বাজার ও মিল মেমো</h1>
              <p className="text-sm text-gray-700 font-sans mt-0.5">তারিখ: <span className="font-bold font-mono">{selectedDate}</span></p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-black">মোট মিল: {totalMealsCount} টি</div>
              <div className="text-sm font-bold text-gray-800">বাজার বাজেট: ৳{totalBazaarBudget}</div>
            </div>
          </div>
        </div>

        {/* 3 Detailed Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Breakfast List */}
          <div className="rounded-2xl border border-slate-800/80 p-4 bg-slate-950/40 print:border-gray-300 print:bg-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 print:border-gray-300">
              <h3 className="font-bold text-emerald-400 text-sm font-display flex items-center gap-2 print:text-black">
                <Utensils className="w-4 h-4" />
                সকালের নাস্তা ({breakfastMembers.length} জন)
              </h3>
              <span className="text-xs font-mono font-bold text-slate-300 print:text-gray-800">৳{breakfastCost}</span>
            </div>
            {breakfastMembers.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">কেউ নাস্তা খাবেন না</p>
            ) : (
              <ul className="space-y-2 text-xs divide-y divide-slate-800/50 print:divide-gray-200">
                {breakfastMembers.map((m, idx) => (
                  <li key={m.id} className="pt-2 flex justify-between items-center text-slate-200 print:text-black">
                    <span className="font-medium">{idx + 1}. {m.name}</span>
                    <span className="font-mono text-cyan-300 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 print:bg-gray-100 print:text-black print:border-gray-300">
                      {m.phone}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Lunch List */}
          <div className="rounded-2xl border border-slate-800/80 p-4 bg-slate-950/40 print:border-gray-300 print:bg-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 print:border-gray-300">
              <h3 className="font-bold text-cyan-400 text-sm font-display flex items-center gap-2 print:text-black">
                <Utensils className="w-4 h-4" />
                দুপুরের খাবার ({lunchMembers.length} জন)
              </h3>
              <span className="text-xs font-mono font-bold text-slate-300 print:text-gray-800">৳{lunchCost}</span>
            </div>
            {lunchMembers.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">কেউ দুপুরে খাবেন না</p>
            ) : (
              <ul className="space-y-2 text-xs divide-y divide-slate-800/50 print:divide-gray-200">
                {lunchMembers.map((m, idx) => (
                  <li key={m.id} className="pt-2 flex justify-between items-center text-slate-200 print:text-black">
                    <span className="font-medium">{idx + 1}. {m.name}</span>
                    <span className="font-mono text-cyan-300 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 print:bg-gray-100 print:text-black print:border-gray-300">
                      {m.phone}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Dinner List */}
          <div className="rounded-2xl border border-slate-800/80 p-4 bg-slate-950/40 print:border-gray-300 print:bg-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 print:border-gray-300">
              <h3 className="font-bold text-indigo-400 text-sm font-display flex items-center gap-2 print:text-black">
                <Utensils className="w-4 h-4" />
                রাতের খাবার ({dinnerMembers.length} জন)
              </h3>
              <span className="text-xs font-mono font-bold text-slate-300 print:text-gray-800">৳{dinnerCost}</span>
            </div>
            {dinnerMembers.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">কেউ রাতে খাবেন না</p>
            ) : (
              <ul className="space-y-2 text-xs divide-y divide-slate-800/50 print:divide-gray-200">
                {dinnerMembers.map((m, idx) => (
                  <li key={m.id} className="pt-2 flex justify-between items-center text-slate-200 print:text-black">
                    <span className="font-medium">{idx + 1}. {m.name}</span>
                    <span className="font-mono text-cyan-300 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 print:bg-gray-100 print:text-black print:border-gray-300">
                      {m.phone}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

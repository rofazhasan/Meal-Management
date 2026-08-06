'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, Calendar, Utensils, CheckCircle2, Copy, PieChart, Printer, DollarSign, Download, Filter, Search, AlertCircle } from 'lucide-react';
import { User, MealDeclaration, MealRateConfig, SpecialMeal, EmergencyClosure } from '../../types';
import { BN } from '../../constants/banglaText';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { getDayOfWeekFromDateStr, getBangladeshDateStr, getBangladeshNow, fillMissingDeclarationsForDateRange } from '../../utils/dateUtils';

interface UserReportsProps {
  currentUser: User;
  declarations: MealDeclaration[];
  rates?: MealRateConfig;
  specialMeals?: SpecialMeal[];
  emergencies?: EmergencyClosure[];
}

export const UserReports: React.FC<UserReportsProps> = ({ currentUser, declarations, rates, specialMeals = [], emergencies = [] }) => {
  const [activeRange, setActiveRange] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('monthly');
  const [searchDate, setSearchDate] = useState('');

  const defaultRates = {
    breakfast: currentUser.userType === 'PERMANENT' ? 40 : 50,
    lunch: currentUser.userType === 'PERMANENT' ? 70 : 85,
    dinner: currentUser.userType === 'PERMANENT' ? 70 : 85,
  };

  const userRates = rates
    ? (currentUser.userType === 'PERMANENT' ? rates.permanent : rates.guest)
    : defaultRates;

  const isBGlobalOff = rates?.globalMealStatus?.breakfast === false;
  const isLGlobalOff = rates?.globalMealStatus?.lunch === false;
  const isDGlobalOff = rates?.globalMealStatus?.dinner === false;

  const rawUserDecs = useMemo(
    () => declarations.filter(d => d.userId === currentUser.id),
    [declarations, currentUser.id]
  );

  const getSpecialMealForTypeAndDate = (dateStr: string, type: 'breakfast' | 'lunch' | 'dinner') => {
    const dayOfWeek = getDayOfWeekFromDateStr(dateStr);
    return specialMeals.find((sm) => {
      if (sm.isActive === false) return false;
      if (sm.mealType !== type) return false;
      if (sm.date === dateStr) return true;
      if (sm.isRecurring && sm.repeatDayOfWeek === dayOfWeek) return true;
      return false;
    });
  };

  // Filter declarations based on active range (daily / weekly / monthly / all) with continuous date filling
  const rangeFilteredDecs = useMemo(() => {
    if (rawUserDecs.length === 0) return [];

    const todayStr = getBangladeshDateStr();

    let startDateStr = todayStr;
    if (activeRange === 'daily') {
      startDateStr = todayStr;
    } else if (activeRange === 'weekly') {
      const now = getBangladeshNow();
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 7);
      startDateStr = getBangladeshDateStr(past7);
    } else if (activeRange === 'monthly') {
      const currentMonthStr = todayStr.substring(0, 7);
      startDateStr = `${currentMonthStr}-01`;
    } else {
      const earliestRaw = rawUserDecs.length > 0
        ? rawUserDecs.reduce((min, d) => (d.date < min ? d.date : min), todayStr)
        : `${todayStr.substring(0, 7)}-01`;
      startDateStr = earliestRaw < `${todayStr.substring(0, 7)}-01` ? earliestRaw : `${todayStr.substring(0, 7)}-01`;
    }

    return fillMissingDeclarationsForDateRange(rawUserDecs, startDateStr, todayStr, currentUser.id);
  }, [rawUserDecs, activeRange, currentUser.id]);


  // Enrich each declaration with accurate global/emergency status and effective pricing
  const processedDecs = useMemo(() => {
    return rangeFilteredDecs.map((dec) => {
      const dayEm = emergencies.find(e => dec.date >= e.date && dec.date <= (e.endDate || e.date));

      const isBEm = !!dayEm && (!dayEm.closedMeals || dayEm.closedMeals.length === 0 || dayEm.closedMeals.includes('breakfast'));
      const isLEm = !!dayEm && (!dayEm.closedMeals || dayEm.closedMeals.length === 0 || dayEm.closedMeals.includes('lunch'));
      const isDEm = !!dayEm && (!dayEm.closedMeals || dayEm.closedMeals.length === 0 || dayEm.closedMeals.includes('dinner'));

      // Meal is ON ONLY IF not globally off, not emergency closed, and selected by user
      const isBOn = !isBGlobalOff && !isBEm && dec.breakfast;
      const isLOn = !isLGlobalOff && !isLEm && dec.lunch;
      const isDOn = !isDGlobalOff && !isDEm && dec.dinner;

      const specB = getSpecialMealForTypeAndDate(dec.date, 'breakfast');
      const specL = getSpecialMealForTypeAndDate(dec.date, 'lunch');
      const specD = getSpecialMealForTypeAndDate(dec.date, 'dinner');

      const bPrice = isBGlobalOff || isBEm ? 0 : (specB ? specB.customRate : userRates.breakfast);
      const lPrice = isLGlobalOff || isLEm ? 0 : (specL ? specL.customRate : userRates.lunch);
      const dPrice = isDGlobalOff || isDEm ? 0 : (specD ? specD.customRate : userRates.dinner);

      const dailyCost = (isBOn ? bPrice : 0) + (isLOn ? lPrice : 0) + (isDOn ? dPrice : 0);

      return {
        ...dec,
        dayEm,
        isBEm,
        isLEm,
        isDEm,
        isBGlobalOff,
        isLGlobalOff,
        isDGlobalOff,
        isBOn,
        isLOn,
        isDOn,
        specB,
        specL,
        specD,
        bPrice,
        lPrice,
        dPrice,
        dailyCost,
      };
    });
  }, [rangeFilteredDecs, emergencies, isBGlobalOff, isLGlobalOff, isDGlobalOff, userRates]);

  // Final table list after user search/date filter sorted in descending date order (latest date top)
  const displayedDecs = useMemo(() => {
    let list = processedDecs;
    if (searchDate.trim()) {
      const term = searchDate.trim();
      list = list.filter(d => d.date.includes(term));
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [processedDecs, searchDate]);


  // Metrics computed STRICTLY using processed effective meal states
  const totalBreakfasts = processedDecs.filter(d => d.isBOn).length;
  const totalLunches = processedDecs.filter(d => d.isLOn).length;
  const totalDinners = processedDecs.filter(d => d.isDOn).length;
  const autoCopiedCount = processedDecs.filter(d => d.isAutoCopied).length;
  const totalMealsCount = totalBreakfasts + totalLunches + totalDinners;
  const totalMoneySpent = processedDecs.reduce((sum, d) => sum + d.dailyCost, 0);

  const breakfastPercentage = totalMealsCount > 0 ? Math.round((totalBreakfasts / totalMealsCount) * 100) : 0;
  const lunchPercentage = totalMealsCount > 0 ? Math.round((totalLunches / totalMealsCount) * 100) : 0;
  const dinnerPercentage = totalMealsCount > 0 ? Math.round((totalDinners / totalMealsCount) * 100) : 0;

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ['তারিখ', 'নাস্তা', 'দুপুর', 'রাত', 'দৈনিক খরচ (টাকা)', 'এন্ট্রি টাইপ'];
    const rows = processedDecs.map(d => [
      d.date,
      d.isBEm ? 'জরুরি বন্ধ' : d.isBGlobalOff ? 'গ্লোবাল বন্ধ' : d.isBOn ? `অন (${d.bPrice}tk)` : 'অফ',
      d.isLEm ? 'জরুরি বন্ধ' : d.isLGlobalOff ? 'গ্লোবাল বন্ধ' : d.isLOn ? `অন (${d.lPrice}tk)` : 'অফ',
      d.isDEm ? 'জরুরি বন্ধ' : d.isDGlobalOff ? 'গ্লোবাল বন্ধ' : d.isDOn ? `অন (${d.dPrice}tk)` : 'অফ',
      d.dailyCost,
      d.dayEm ? 'জরুরি নোটিশ' : d.isAutoCopied ? 'অটো-কপি' : 'ইউজার ডিক্লেয়ারড'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `meal_report_${currentUser.name}_${activeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto animate-scale-in">
      
      {/* Global Off Notice Banner if any meal is globally disabled */}
      {(isBGlobalOff || isLGlobalOff || isDGlobalOff) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-amber-200">এডমিন গ্লোবাল অফ অ্যালার্ট: </span>
            {isBGlobalOff && 'সকালের নাস্তা '}
            {isLGlobalOff && 'দুপুরের খাবার '}
            {isDGlobalOff && 'রাতের খাবার '}
            এডমিন কর্তৃক বিশ্বব্যাপী বন্ধ রাখা হয়েছে। বন্ধকৃত মিলগুলোর বাবদ কোনো টাকা কাটা বা হিসেব করা হবে না।
          </div>
        </div>
      )}

      {/* Header & Range Selector */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            {BN.reports} ও এনালিটিক্স
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            আপনার খাবার গ্রহণ ও প্রতিদিনের নিখুঁত খরচের বিবরণী
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm print:hidden"
            title="CSV এক্সপোর্ট"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>CSV ডাউনলোড</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm print:hidden"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>প্রিন্ট স্টেটমেন্ট</span>
          </button>

          <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold shadow-inner print:hidden">
            <button
              onClick={() => setActiveRange('daily')}
              className={`px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                activeRange === 'daily' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              দৈনিক
            </button>
            <button
              onClick={() => setActiveRange('weekly')}
              className={`px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                activeRange === 'weekly' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              সাপ্তাহিক
            </button>
            <button
              onClick={() => setActiveRange('monthly')}
              className={`px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                activeRange === 'monthly' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              মাসিক
            </button>
            <button
              onClick={() => setActiveRange('all')}
              className={`px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                activeRange === 'all' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              সব
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80 text-center shadow-lg">
          <Utensils className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-sans">মোট মিল খেয়াছেন</p>
          <p className="text-2xl font-extrabold text-white mt-1 font-mono">
            <AnimatedNumber value={totalMealsCount} />
          </p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80 text-center shadow-lg">
          <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-sans">মোট মিল বাবদ খরচ</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
            <AnimatedNumber value={totalMoneySpent} prefix="৳" decimals={0} />
          </p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80 text-center shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-sky-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-sans">দুপুর + রাত মিল</p>
          <p className="text-2xl font-extrabold text-sky-400 mt-1 font-mono">
            <AnimatedNumber value={totalLunches + totalDinners} />
          </p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80 text-center shadow-lg">
          <Copy className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-sans">অটো-কপি মিল</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
            <AnimatedNumber value={autoCopiedCount} />
          </p>
        </div>
      </div>

      {/* Visual Meal Ratio Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm font-display flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" />
            মিল খাবার বন্টন অনুপাত ({activeRange === 'daily' ? 'আজ' : activeRange === 'weekly' ? 'গত ৭ দিন' : activeRange === 'monthly' ? 'গত ৩০ দিন' : 'সমগ্র ইতিহাস'})
          </h3>
          <span className="text-xs text-slate-400 font-mono">মোট: {totalMealsCount} টি</span>
        </div>

        <div className="h-4 rounded-full bg-slate-900 overflow-hidden flex p-0.5 border border-slate-800">
          <div style={{ width: `${breakfastPercentage}%` }} className="bg-emerald-500 rounded-l-full transition-all duration-500" title={`নাস্তা: ${breakfastPercentage}%`} />
          <div style={{ width: `${lunchPercentage}%` }} className="bg-cyan-500 transition-all duration-500" title={`দুপুর: ${lunchPercentage}%`} />
          <div style={{ width: `${dinnerPercentage}%` }} className="bg-indigo-500 rounded-r-full transition-all duration-500" title={`রাত: ${dinnerPercentage}%`} />
        </div>

        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pt-1 font-sans">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />নাস্তা ({breakfastPercentage}%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />দুপুর ({lunchPercentage}%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />রাত ({dinnerPercentage}%)</span>
        </div>
      </div>

      {/* Declaration Log Table */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2 font-display">
            <Calendar className="w-5 h-5 text-cyan-400" />
            তারিখভিত্তিক মিল হিস্ট্রি ও খরচের হিসাব
          </h3>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="তারিখ খুঁজুন (YYYY-MM-DD)..."
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none w-48"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">ব্যালেন্স: ৳{currentUser.walletBalance}</span>
          </div>
        </div>

        {displayedDecs.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="কোনো মিল রেকর্ড পাওয়া যায়নি"
            description="নির্বাচিত সময়সীমার মধ্যে কোনো মিল হিস্ট্রি নেই।"
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 uppercase text-[10px] text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3.5">তারিখ</th>
                  <th className="p-3.5">{BN.breakfast}</th>
                  <th className="p-3.5">{BN.lunch}</th>
                  <th className="p-3.5">{BN.dinner}</th>
                  <th className="p-3.5">দৈনিক আনুমানিক খরচ</th>
                  <th className="p-3.5">এন্ট্রি টাইপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {displayedDecs.map((dec) => {
                  return (
                    <tr key={dec.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-slate-200">{dec.date}</td>
                      
                      {/* Breakfast Column */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          dec.isBEm ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          dec.isBGlobalOff ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          dec.isBOn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-slate-800/80 text-slate-500'
                        }`}>
                          {dec.isBEm ? '🚨 জরুরি বন্ধ' : dec.isBGlobalOff ? '🚫 গ্লোবাল বন্ধ (এডমিন)' : dec.isBOn ? `${BN.mealOn} (৳${dec.bPrice})` : BN.mealOff}
                        </span>
                      </td>

                      {/* Lunch Column */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          dec.isLEm ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          dec.isLGlobalOff ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          dec.isLOn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-slate-800/80 text-slate-500'
                        }`}>
                          {dec.isLEm ? '🚨 জরুরি বন্ধ' : dec.isLGlobalOff ? '🚫 গ্লোবাল বন্ধ (এডমিন)' : dec.isLOn ? `${BN.mealOn} (৳${dec.lPrice})` : BN.mealOff}
                        </span>
                      </td>

                      {/* Dinner Column */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          dec.isDEm ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          dec.isDGlobalOff ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          dec.isDOn ? (dec.specD ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20') :
                          'bg-slate-800/80 text-slate-500'
                        }`}>
                          {dec.isDEm ? '🚨 জরুরি বন্ধ' : dec.isDGlobalOff ? '🚫 গ্লোবাল বন্ধ (এডমিন)' : dec.isDOn ? `${BN.mealOn} (৳${dec.dPrice}${dec.specD ? ' - স্পেশাল' : ''})` : BN.mealOff}
                        </span>
                      </td>

                      {/* Daily Cost Column */}
                      <td className="p-3.5 font-bold font-mono text-cyan-300">
                        ৳{dec.dailyCost}
                      </td>

                      {/* Entry Type Column */}
                      <td className="p-3.5">
                        {(() => {
                          const isAllGlobalOff = dec.isBGlobalOff && dec.isLGlobalOff && dec.isDGlobalOff;
                          return (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              dec.dayEm ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                              isAllGlobalOff ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              dec.isAutoCopied ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}>
                              {dec.dayEm ? '🚨 জরুরি নোটিশ' : isAllGlobalOff ? '🚫 গ্লোবাল বন্ধ' : dec.isAutoCopied ? BN.autoCopied : BN.userDeclared}
                            </span>
                          );
                        })()}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};



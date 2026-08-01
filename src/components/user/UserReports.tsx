import React, { useState } from 'react';
import { BarChart3, Calendar, Utensils, CheckCircle2, Copy, PieChart, Printer, DollarSign } from 'lucide-react';
import { User, MealDeclaration, MealRateConfig, SpecialMeal } from '../../types';
import { BN } from '../../constants/banglaText';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';

interface UserReportsProps {
  currentUser: User;
  declarations: MealDeclaration[];
  rates?: MealRateConfig;
  specialMeals?: SpecialMeal[];
}

export const UserReports: React.FC<UserReportsProps> = ({ currentUser, declarations, rates, specialMeals = [] }) => {
  const [activeRange, setActiveRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const userDecs = declarations.filter(d => d.userId === currentUser.id);

  const defaultRates = {
    breakfast: currentUser.userType === 'PERMANENT' ? 40 : 50,
    lunch: currentUser.userType === 'PERMANENT' ? 70 : 85,
    dinner: currentUser.userType === 'PERMANENT' ? 70 : 85,
  };

  const userRates = rates
    ? (currentUser.userType === 'PERMANENT' ? rates.permanent : rates.guest)
    : defaultRates;

  const totalBreakfasts = userDecs.filter(d => d.breakfast).length;
  const totalLunches = userDecs.filter(d => d.lunch).length;
  const totalDinners = userDecs.filter(d => d.dinner).length;
  const autoCopiedCount = userDecs.filter(d => d.isAutoCopied).length;
  const totalMealsCount = totalBreakfasts + totalLunches + totalDinners;

  const getSpecialMealForTypeAndDate = (dateStr: string, type: 'breakfast' | 'lunch' | 'dinner') => {
    const dt = new Date(dateStr);
    const dayOfWeek = dt.getDay();
    return specialMeals.find((sm) => {
      if (sm.isActive === false) return false;
      if (sm.mealType !== type) return false;
      if (sm.date === dateStr) return true;
      if (sm.isRecurring && sm.repeatDayOfWeek === dayOfWeek) return true;
      return false;
    });
  };

  const totalMoneySpent = userDecs.reduce((sum, dec) => {
    const specB = getSpecialMealForTypeAndDate(dec.date, 'breakfast');
    const specL = getSpecialMealForTypeAndDate(dec.date, 'lunch');
    const specD = getSpecialMealForTypeAndDate(dec.date, 'dinner');

    const bPrice = specB ? specB.customRate : userRates.breakfast;
    const lPrice = specL ? specL.customRate : userRates.lunch;
    const dPrice = specD ? specD.customRate : userRates.dinner;

    return sum + (dec.breakfast ? bPrice : 0) + (dec.lunch ? lPrice : 0) + (dec.dinner ? dPrice : 0);
  }, 0);

  const breakfastPercentage = totalMealsCount > 0 ? Math.round((totalBreakfasts / totalMealsCount) * 100) : 0;
  const lunchPercentage = totalMealsCount > 0 ? Math.round((totalLunches / totalMealsCount) * 100) : 0;
  const dinnerPercentage = totalMealsCount > 0 ? Math.round((totalDinners / totalMealsCount) * 100) : 0;

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto animate-scale-in">
      
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
            আপনার খাবার গ্রহণ ও প্রতিদিনের আনুমানিক খরচের বিবরণী
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm print:hidden"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>প্রিন্ট স্টেটমেন্ট (Print Report)</span>
          </button>

          <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold shadow-inner print:hidden">
            <button
              onClick={() => setActiveRange('daily')}
              className={`px-3.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                activeRange === 'daily' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              দৈনিক
            </button>
            <button
              onClick={() => setActiveRange('weekly')}
              className={`px-3.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                activeRange === 'weekly' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              সাপ্তাহিক
            </button>
            <button
              onClick={() => setActiveRange('monthly')}
              className={`px-3.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                activeRange === 'monthly' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              মাসিক
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
            মিল খাবার বন্টন অনুপাত
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
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2 font-display">
            <Calendar className="w-5 h-5 text-cyan-400" />
            তারিখভিত্তিক মিল হিস্ট্রি ও খরচের হিসাব
          </h3>
          <span className="text-xs text-slate-400 font-mono">বর্তমান ব্যালেন্স: ৳{currentUser.walletBalance}</span>
        </div>

        {userDecs.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="কোনো মিল রেকর্ড পাওয়া যায়নি"
            description="এখনও কোনো দিনের মিল হিস্ট্রি নেই।"
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
                {userDecs.map((dec) => {
                  const spec = specialMeals.find(sm => sm.date === dec.date);
                  const bPrice = (spec && spec.mealType === 'breakfast') ? spec.customRate : userRates.breakfast;
                  const lPrice = (spec && spec.mealType === 'lunch') ? spec.customRate : userRates.lunch;
                  const dPrice = (spec && spec.mealType === 'dinner') ? spec.customRate : userRates.dinner;

                  const dailyCost =
                    (dec.breakfast ? bPrice : 0) +
                    (dec.lunch ? lPrice : 0) +
                    (dec.dinner ? dPrice : 0);

                  return (
                    <tr key={dec.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-slate-200">{dec.date}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${dec.breakfast ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800/80 text-slate-500'}`}>
                          {dec.breakfast ? `${BN.mealOn} (৳${bPrice})` : BN.mealOff}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${dec.lunch ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800/80 text-slate-500'}`}>
                          {dec.lunch ? `${BN.mealOn} (৳${lPrice})` : BN.mealOff}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${dec.dinner ? (spec?.mealType === 'dinner' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20') : 'bg-slate-800/80 text-slate-500'}`}>
                          {dec.dinner ? `${BN.mealOn} (৳${dPrice}${spec?.mealType === 'dinner' ? ' - স্পেশাল' : ''})` : BN.mealOff}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold font-mono text-cyan-300">
                        ৳{dailyCost}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                          dec.isAutoCopied ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {dec.isAutoCopied ? BN.autoCopied : BN.userDeclared}
                        </span>
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


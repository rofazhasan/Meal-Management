'use client';

import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, DollarSign, ToggleLeft, ToggleRight, Clock, Sparkles, FileSpreadsheet, Download, Database, AlertTriangle, Trash2, Calendar } from 'lucide-react';
import { MealRateConfig, SpecialMeal, User } from '../../types';
import { BN } from '../../constants/banglaText';
import { ApiService } from '../../services/apiService';
import { getBangladeshDateStr, getDayOfWeekFromDateStr } from '../../utils/dateUtils';
import { downloadArchiveExcel } from '../../utils/excelExport';

interface SettingsPanelProps {
  rates: MealRateConfig;
  specialMeals?: SpecialMeal[];
  onRefreshData: () => void;
  currentUser: User;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ rates, specialMeals, onRefreshData, currentUser }) => {
  const [permBreakfast, setPermBreakfast] = useState(rates.permanent.breakfast);
  const [permLunch, setPermLunch] = useState(rates.permanent.lunch);
  const [permDinner, setPermDinner] = useState(rates.permanent.dinner);
  const [permMonthly, setPermMonthly] = useState(rates.permanent.monthlyCharge);

  const [guestBreakfast, setGuestBreakfast] = useState(rates.guest.breakfast);
  const [guestLunch, setGuestLunch] = useState(rates.guest.lunch);
  const [guestDinner, setGuestDinner] = useState(rates.guest.dinner);
  const [guestMonthly, setGuestMonthly] = useState(rates.guest.monthlyCharge);

  const [globalBreakfast, setGlobalBreakfast] = useState(rates.globalMealStatus.breakfast);
  const [globalLunch, setGlobalLunch] = useState(rates.globalMealStatus.lunch);
  const [globalDinner, setGlobalDinner] = useState(rates.globalMealStatus.dinner);

  const [cutoffTime, setCutoffTime] = useState(rates.cutoffTime || '10:00');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ApiService.updateMealRates({
        permanent: {
          breakfast: permBreakfast,
          lunch: permLunch,
          dinner: permDinner,
          monthlyCharge: permMonthly,
        },
        guest: {
          breakfast: guestBreakfast,
          lunch: guestLunch,
          dinner: guestDinner,
          monthlyCharge: guestMonthly,
        },
        globalMealStatus: {
          breakfast: globalBreakfast,
          lunch: globalLunch,
          dinner: globalDinner,
        },
        cutoffTime,
      }, currentUser.id);
      await ApiService.logAudit(currentUser.id, 'SETTINGS_UPDATED', '', 'Meal rates, global meal switches, and cutoff time updated.');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      onRefreshData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto animate-scale-in">
      
      {/* Header Panel */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 flex items-center justify-between shadow-2xl">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Settings className="w-5 h-5 text-cyan-400" />
            </div>
            {BN.settings} ও রেট কনফিগারেশন
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            মেসের খাবারের রেট, গ্লোবাল সুইচ এবং সার্ভিস চার্জ কন্ট্রোল করুন
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-sm flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>সেটিংস ও মিলের রেট সফলভাবে হালনাগাদ করা হয়েছে!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Global Meal Master Switches */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
          <h3 className="font-bold text-slate-100 text-base font-display flex items-center gap-2">
            <ToggleRight className="w-5 h-5 text-amber-400" />
            {BN.masterMealSwitch}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => setGlobalBreakfast(!globalBreakfast)}
              className={`p-4.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all active:scale-95 ${
                globalBreakfast ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/20' : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
              }`}
            >
              <span className="font-display">{BN.breakfast} (সবাই)</span>
              <span className="font-mono">{globalBreakfast ? BN.mealOn : BN.mealOff}</span>
            </button>

            <button
              type="button"
              onClick={() => setGlobalLunch(!globalLunch)}
              className={`p-4.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all active:scale-95 ${
                globalLunch ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/20' : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
              }`}
            >
              <span className="font-display">{BN.lunch} (সবাই)</span>
              <span className="font-mono">{globalLunch ? BN.mealOn : BN.mealOff}</span>
            </button>

            <button
              type="button"
              onClick={() => setGlobalDinner(!globalDinner)}
              className={`p-4.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all active:scale-95 ${
                globalDinner ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/20' : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
              }`}
            >
              <span className="font-display">{BN.dinner} (সবাই)</span>
              <span className="font-mono">{globalDinner ? BN.mealOn : BN.mealOff}</span>
            </button>
          </div>
        </div>

        {/* Permanent Rates Setup */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
          <h3 className="font-bold text-slate-100 text-base font-display flex items-center gap-2 text-cyan-400">
            <DollarSign className="w-5 h-5" />
            {BN.permRates} (Permanent Member Rates)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.breakfast} (৳)</label>
              <input
                type="number"
                value={permBreakfast}
                onChange={(e) => setPermBreakfast(Number(e.target.value))}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.lunch} (৳)</label>
              <input
                type="number"
                value={permLunch}
                onChange={(e) => setPermLunch(Number(e.target.value))}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.dinner} (৳)</label>
              <input
                type="number"
                value={permDinner}
                onChange={(e) => setPermDinner(Number(e.target.value))}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.monthlyCharge} (৳)</label>
              <input
                type="number"
                value={permMonthly}
                onChange={(e) => setPermMonthly(Number(e.target.value))}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Guest Rates Setup */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
          <h3 className="font-bold text-slate-100 text-base font-display flex items-center gap-2 text-amber-400">
            <DollarSign className="w-5 h-5" />
            {BN.guestRates} (Guest Member Rates)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.breakfast} (৳)</label>
              <input
                type="number"
                value={guestBreakfast}
                onChange={(e) => setGuestBreakfast(Number(e.target.value))}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.lunch} (৳)</label>
              <input
                type="number"
                value={guestLunch}
                onChange={(e) => setGuestLunch(Number(e.target.value))}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.dinner} (৳)</label>
              <input
                type="number"
                value={guestDinner}
                onChange={(e) => setGuestDinner(Number(e.target.value))}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.monthlyCharge} (৳)</label>
              <input
                type="number"
                value={guestMonthly}
                onChange={(e) => setGuestMonthly(Number(e.target.value))}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Cutoff Time Config */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-3 shadow-xl">
          <h3 className="font-bold text-slate-100 text-base font-display flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            মিলের ডেডলাইন সময় নির্ধারণ (Cutoff Cut-off Time)
          </h3>
          <input
            type="time"
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
            className="w-full sm:w-48 bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-base font-mono font-bold text-cyan-400 focus:border-cyan-500 focus:outline-none"
          />
          <p className="text-xs text-slate-400 font-sans">ডিফল্ট সময়: ১০:০০ AM (২৪-ঘণ্টা ফরম্যাট)</p>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-base transition-all shadow-xl shadow-cyan-500/25 active:scale-95 disabled:opacity-50 font-display"
        >
          {saving ? 'সংরক্ষণ হচ্ছে...' : BN.saveChanges}
        </button>

      </form>

      {/* Special Meal Entry & Recurring Management */}
      <SpecialMealScheduler specialMeals={specialMeals} onRefreshData={onRefreshData} currentUser={currentUser} />

      {/* Monthly & Custom Date Range Data Archival Section */}
      <MonthlyArchivePanel currentUser={currentUser} onRefreshData={onRefreshData} />

      {/* Production System Reset Danger Zone (Restricted to SUPERADMIN only) */}
      {currentUser.role === 'SUPERADMIN' && (
        <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 space-y-3 shadow-xl">
          <h4 className="font-bold text-rose-300 text-sm font-display">ডেঞ্জারের জোন (সিস্টেম রিসেট - শুধুমাত্র SUPERADMIN)</h4>
          <p className="text-xs text-rose-200/70">
            প্রোডাকশনে সব টেস্ট ও ট্রানজেকশন ডাটা রিসেট করতে চাইলে নিচের বোতামটি ব্যবহার করুন। এই সুবিধাটি শুধুমাত্র সুপার-এডমিনের জন্য সংরক্ষিত।
          </p>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('আপনি কি নিশ্চিত যে সমস্ত টেস্ট ডাটা রিসেট করে প্রোডাকশন মেস ক্লিন করতে চান?')) {
                try {
                  await ApiService.purgeSystemData(currentUser.id);
                  const updatedUser = { ...currentUser, walletBalance: 0 };
                  await ApiService.setCurrentUser(updatedUser);
                  alert('সিস্টেম সফলভাবে রিসেট করা হয়েছে! সমস্ত ট্রানজেকশন ও মিল হিস্ট্রি মুছে ফেলা হয়েছে।');
                  onRefreshData();
                } catch (err: any) {
                  alert(`সিস্টেম রিসেট ব্যর্থ হয়েছে: ${err.message || 'অজানা সমস্যা'}`);
                }
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-bold transition-all"
          >
            সমস্ত ট্রানজেকশন ও মিল ডাটা রিসেট করুন
          </button>
        </div>
      )}

    </div>
  );
};


const SpecialMealScheduler: React.FC<{ specialMeals?: SpecialMeal[]; onRefreshData: () => void; currentUser: User }> = ({ specialMeals, onRefreshData, currentUser }) => {
  const [date, setDate] = useState(() => getBangladeshDateStr());
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('dinner');
  const [title, setTitle] = useState('🎉 স্পেশাল বিরিয়ানি ও ডেজার্ট নাইট');
  const [customRate, setCustomRate] = useState(150);
  const [description, setDescription] = useState('শাহী কাচ্চি বিরিয়ানি, চিকেন রোস্ট, ফিরনি ও কোল্ড ড্রিংকস');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState<number>(6); // Default Saturday

  const todayStr = getBangladeshDateStr();

  const handleAddSpecial = async () => {
    if (!title.trim() || customRate <= 0) {
      alert('সঠিক নাম ও কাস্টম রেট লিখুন');
      return;
    }
    if (!isRecurring && date < todayStr) {
      alert('অতীতের তারিখের জন্য স্পেশাল মিল শিডিউল করা সম্ভব নয়।');
      return;
    }
    setSaving(true);
    try {
      await ApiService.addSpecialMeal({ adminId: currentUser.id, date, mealType, title, customRate, description, isRecurring, repeatDayOfWeek });
      await ApiService.logAudit(currentUser.id, 'SPECIAL_MEAL_CREATED', '', `Created special meal: ${title}`);
      setMsg(true);
      setTimeout(() => setMsg(false), 2500);
      setTitle('');
      setDescription('');
      onRefreshData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-amber-500/30 space-y-4 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
          <Sparkles className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="font-bold text-slate-100 text-base font-display">স্পেশাল মিল এন্ট্রি (Special Meal Event)</h3>
          <p className="text-xs text-slate-400 font-sans">বিশেষ উপলক্ষে বা প্রতি সপ্তাহে নির্দিষ্ট বারে (যেমন প্রতি শনিবার) স্পেশাল মিলের রেট নির্ধারণ করুন</p>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          স্পেশাল মিল সফলভাবে যুক্ত করা হয়েছে!
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1 font-sans font-mono">তারিখ</label>
          <input
            type="date"
            value={date}
            min={todayStr}
            onChange={(e) => {
              const newDate = e.target.value;
              setDate(newDate);
              if (newDate) {
                // FIX 5: Use timezone-safe helper instead of new Date().getDay() which parses as UTC midnight
                setRepeatDayOfWeek(getDayOfWeekFromDateStr(newDate));
              }
            }}
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-slate-100 font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1 font-sans">খাবারের সময়</label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as any)}
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-slate-100 font-sans"
          >
            <option value="breakfast">সকালের নাস্তা</option>
            <option value="lunch">দুপুরের খাবার</option>
            <option value="dinner">রাতের খাবার (ডিফল্ট)</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1 font-sans">স্পেশাল মিলের নাম</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="যেমন: স্পেশাল বিফ বিরিয়ানি"
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-slate-100"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1 font-sans">কাস্টম রেট / দাম (৳)</label>
          <input
            type="number"
            value={customRate}
            onChange={(e) => setCustomRate(Number(e.target.value))}
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-cyan-300 font-mono font-bold"
          />
        </div>

        {/* Recurring Checkbox & Day Selector */}
        <div className="sm:col-span-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-amber-300 font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded"
            />
            <span>🔄 প্রতি সপ্তাহে এই বারে পুনরাবৃত্তি করুন (Repeat Weekly Every Week)</span>
          </label>

          {isRecurring && (
            <div className="flex items-center gap-2">
              <span className="text-slate-300">দিন বেছে নিন:</span>
              <select
                value={repeatDayOfWeek}
                onChange={(e) => setRepeatDayOfWeek(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-amber-400 font-bold"
              >
                <option value={6}>প্রতি শনিবার (Saturday)</option>
                <option value={0}>প্রতি রবিবার (Sunday)</option>
                <option value={1}>প্রতি সোমবার (Monday)</option>
                <option value={2}>প্রতি মঙ্গলবার (Tuesday)</option>
                <option value={3}>প্রতি বুধবার (Wednesday)</option>
                <option value={4}>প্রতি বৃহস্পতিবার (Thursday)</option>
                <option value={5}>প্রতি শুক্রবার (Friday)</option>
              </select>
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-slate-300 font-semibold mb-1 font-sans">মেনু বিবরণী (আইটেমসমূহ)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="যেমন: কাচ্চি বিরিয়ানি, চিকেন রোস্ট, ফিরনি"
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-slate-100"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddSpecial}
        disabled={saving}
        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 font-display"
      >
        {saving ? 'যুক্ত হচ্ছে...' : 'স্পেশাল মিল শিডিউল করুন'}
      </button>

      {/* Scheduled Special Meals Management List */}
      {specialMeals && specialMeals.length > 0 && (
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="font-bold text-slate-200 text-xs font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            শিডিউলকৃত স্পেশাল মিলের তালিকা ({specialMeals.length} টি)
          </h4>

          <div className="space-y-2">
            {specialMeals.map((sm) => {
              const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
              // FIX 6: Use timezone-safe helper instead of new Date(sm.date).getDay() which gives wrong weekday
              const dayName = days[sm.repeatDayOfWeek !== undefined ? sm.repeatDayOfWeek : getDayOfWeekFromDateStr(sm.date)];
              const isPast = !sm.isRecurring && sm.date < todayStr;

              return (
                <div key={sm.id} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300 font-display">{sm.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ৳{sm.customRate}
                      </span>
                      {sm.isRecurring ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                          🔄 প্রতি {dayName} পুনরাবৃত্তি
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                          📅 {sm.date} ({dayName})
                        </span>
                      )}
                    </div>
                    {sm.description && <p className="text-[11px] text-slate-400 mt-1">{sm.description}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    {isPast ? (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 text-[11px] font-bold">
                        🔒 দিন অতিক্রান্ত (View Only)
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await ApiService.toggleSpecialMealActive(currentUser.id, sm.id, sm.isActive !== false);
                            await ApiService.logAudit(currentUser.id, 'SPECIAL_MEAL_STATUS_CHANGED', sm.id, `Set special meal "${sm.title}" to ${sm.isActive !== false ? 'inactive' : 'active'}.`);
                            onRefreshData();
                          }}
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition ${
                            sm.isActive !== false
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {sm.isActive !== false ? '✅ সক্রিয়' : '⛔ বন্ধ'}
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`আপনি কি সত্যিই "${sm.title}" মুছে ফেলতে চান?`)) {
                              await ApiService.deleteSpecialMeal(currentUser.id, sm.id);
                              await ApiService.logAudit(currentUser.id, 'SPECIAL_MEAL_DELETED', sm.id, `Deleted special meal: ${sm.title}`);
                              onRefreshData();
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition"
                        >
                          মুছুন
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};


const MonthlyArchivePanel: React.FC<{ currentUser: User; onRefreshData: () => void }> = ({ currentUser, onRefreshData }) => {
  const [periodMode, setPeriodMode] = useState<'MONTH' | 'CUSTOM'>('MONTH');
  
  // Default to previous month
  const today = new Date();
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const defaultMonthStr = prevMonthDate.toISOString().slice(0, 7);

  const [month, setMonth] = useState(defaultMonthStr);
  const [startDate, setStartDate] = useState(() => `${defaultMonthStr}-01`);
  const [endDate, setEndDate] = useState(() => {
    const lastDay = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ periodLabel: string; counts: any } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveSuccessMsg, setArchiveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState('');

  const handlePreview = async () => {
    setLoadingPreview(true);
    setErrorMsg(null);
    try {
      const res = await ApiService.previewArchive(
        periodMode === 'MONTH'
          ? { month }
          : { startDate, endDate }
      );
      setPreviewData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'প্রিভিউ ফেচ করা সম্ভব হয়নি');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecuteArchive = async () => {
    if (confirmInputText.trim().toUpperCase() !== 'ARCHIVE') {
      alert('নিশ্চিত করতে "ARCHIVE" টাইপ করুন');
      return;
    }
    setShowConfirmModal(false);
    setArchiving(true);
    setErrorMsg(null);

    try {
      const res = await ApiService.executeArchive({
        adminId: currentUser.id,
        ...(periodMode === 'MONTH' ? { month } : { startDate, endDate }),
      });

      // Automatically trigger browser Excel download
      if (res.payload) {
        downloadArchiveExcel(res.payload);
      }

      setArchiveSuccessMsg(
        `সফলভাবে (${res.periodLabel}) সময়কালের ডাটা এক্সেলে এক্সপোর্ট ও ডাউনলোড করা হয়েছে এবং ক্লাউড থেকে ডাটা সংকুচিত/আর্কাইভ করা হয়েছে!`
      );
      setPreviewData(null);
      onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'ডাটা আর্কাইভ ব্যর্থ হয়েছে');
    } finally {
      setArchiving(false);
      setConfirmInputText('');
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-cyan-500/30 space-y-5 shadow-xl animate-scale-in">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg font-display">
              📦 মান্থলি / কাস্টম ডেট রেঞ্জ আর্কাইভ ও ক্লাউড ব্যাকআপ
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              নির্দিষ্ট মাস/সময়কালের মিল ও লেনদেনের ডাটা এক্সেলে ব্যাকআপ নিয়ে ক্লাউড খালি করুন (ইউজার ব্যালেন্স অক্ষত থাকবে)
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => { setPeriodMode('MONTH'); setPreviewData(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              periodMode === 'MONTH' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📅 একক মাস (Month)
          </button>
          <button
            type="button"
            onClick={() => { setPeriodMode('CUSTOM'); setPreviewData(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              periodMode === 'CUSTOM' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📆 কাস্টম তারিখ রেঞ্জ
          </button>
        </div>
      </div>

      {/* Safety Highlight Notice */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-cyan-300 font-bold font-display">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>ডাটা আর্কাইভ ও সেফটি রুলস (Data Safety Policy):</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-300 font-sans leading-relaxed">
          <li>
            <strong className="text-emerald-400">অক্ষত ডাটা (Cloud Database):</strong> সকল সদস্য অ্যাকাউন্ট (Users), প্রোফাইল তথ্য এবং <strong className="text-emerald-300">বর্তমান ওয়ালেট ব্যালেন্স (Wallet Balance)</strong> ক্লাউডে হুবহু সংরক্ষিত থাকবে।
          </li>
          <li>
            <strong className="text-amber-400">এক্সপোর্ট ও ক্লিনআপ:</strong> নির্ধারিত সময়কালের সমস্ত ডিক্লেয়ারেশন, কনসাম্পশন, গেস্ট মিল ও লেনদেন বিস্তারিত ৮টি আলাদা শীট সমৃদ্ধ <strong className="text-amber-300">Excel (.xlsx)</strong> ফাইলে ইনস্ট্যান্ট ডাউনলোড হবে এবং তারপর ক্লাউড ডাটাবেজ থেকে মুছে দেওয়া হবে।
          </li>
        </ul>
      </div>

      {archiveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{archiveSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        {periodMode === 'MONTH' ? (
          <div>
            <label className="block text-slate-300 font-semibold mb-1 font-mono">আর্কাইভের জন্য মাস বেছে নিন</label>
            <input
              type="month"
              value={month}
              onChange={(e) => { setMonth(e.target.value); setPreviewData(null); }}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-cyan-300 font-mono font-bold"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-slate-300 font-semibold mb-1 font-mono">শুরুর তারিখ (Start Date)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPreviewData(null); }}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-cyan-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1 font-mono">শেষ তারিখ (End Date)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPreviewData(null); }}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-cyan-300 font-mono font-bold"
              />
            </div>
          </>
        )}

        <div className="flex items-end">
          <button
            type="button"
            onClick={handlePreview}
            disabled={loadingPreview}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-extrabold text-xs transition border border-slate-700 active:scale-95 flex items-center justify-center gap-2 font-display"
          >
            {loadingPreview ? 'হিসাব করা হচ্ছে...' : '🔍 রিমুভযোগ্য রেকর্ড প্রিভিউ দেখুন'}
          </button>
        </div>
      </div>

      {/* Preview Card */}
      {previewData && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-white text-sm font-display">
              📊 প্রিভিউ সারসংক্ষেপ ({previewData.periodLabel})
            </span>
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/30">
              মোট রেকর্ড: {previewData.counts.totalOperationalRecords} টি
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">মিলের ডিক্লেয়ারেশন</span>
              <span className="text-base font-bold font-mono text-cyan-300">{previewData.counts.declarationsCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">মিলের কনসাম্পশন</span>
              <span className="text-base font-bold font-mono text-emerald-300">{previewData.counts.consumptionsCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">গেস্ট মিল এন্ট্রি</span>
              <span className="text-base font-bold font-mono text-amber-300">{previewData.counts.guestMealsCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">ওয়ালেট লেনদেন হিস্ট্রি</span>
              <span className="text-base font-bold font-mono text-purple-300">{previewData.counts.transactionsCount}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => { setConfirmInputText(''); setShowConfirmModal(true); }}
              disabled={archiving}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm transition shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 font-display"
            >
              <Download className="w-5 h-5" />
              <span>এক্সেলে ডাউনলোড করুন এবং ক্লাউড ডাটা আর্কাইভ করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-rose-500/40 max-w-md w-full space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 text-rose-400 font-bold text-base font-display">
              <AlertTriangle className="w-6 h-6" />
              <span>আর্কাইভ চূড়ান্তকরণ নিশ্চিত করুন</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              আপনি কি নিশ্চিত যে <strong className="text-cyan-300 font-mono">({previewData?.periodLabel})</strong> সময়কালের <strong className="text-rose-300">{previewData?.counts.totalOperationalRecords} টি</strong> অপোরেশনাল ডাটা এক্সেলে ডাউনলোড করে ক্লাউড ডাটাবেজ থেকে মুছে ফেলতে চান?
            </p>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              নিশ্চিত করতে নিচে <strong className="text-white font-mono">ARCHIVE</strong> টাইপ করুন:
            </div>

            <input
              type="text"
              value={confirmInputText}
              onChange={(e) => setConfirmInputText(e.target.value)}
              placeholder="ARCHIVE টাইপ করুন"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-center font-mono font-extrabold text-sm text-cyan-400 uppercase"
            />

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                onClick={handleExecuteArchive}
                disabled={archiving || confirmInputText.trim().toUpperCase() !== 'ARCHIVE'}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-lg shadow-rose-500/20"
              >
                {archiving ? 'আর্কাইভ হচ্ছে...' : 'হ্যাঁ, আর্কাইভ সম্পন্ন করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, DollarSign, ToggleLeft, ToggleRight, Clock, Sparkles } from 'lucide-react';
import { MealRateConfig, SpecialMeal } from '../../types';
import { BN } from '../../constants/banglaText';
import { MockService } from '../../services/mockStorage';
import { getBangladeshDateStr } from '../../utils/dateUtils';

interface SettingsPanelProps {
  rates: MealRateConfig;
  specialMeals?: SpecialMeal[];
  onRefreshData: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ rates, specialMeals, onRefreshData }) => {
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
      await MockService.updateMealRates({
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
      });

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
            type="text"
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
            className="w-full sm:w-48 bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-base font-mono font-bold text-cyan-400 focus:border-cyan-500 focus:outline-none"
          />
          <p className="text-xs text-slate-400 font-sans">ডিফল্ট সময়: ১০:০০ AM</p>
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
      <SpecialMealScheduler specialMeals={specialMeals} onRefreshData={onRefreshData} />

      {/* Production System Reset Danger Zone */}
      <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 space-y-3 shadow-xl">
        <h4 className="font-bold text-rose-300 text-sm font-display">ডেঞ্জারের জোন (সিস্টেম রিসেট)</h4>
        <p className="text-xs text-rose-200/70">
          প্রোডাকশনে সব টেস্ট ও ট্রানজেকশন ডাটা রিসেট করতে চাইলে নিচের বোতামটি ব্যবহার করুন।
        </p>
        <button
          type="button"
          onClick={async () => {
            if (window.confirm('আপনি কি নিশ্চিত যে সমস্ত টেস্ট ডাটা রিসেট করে প্রোডাকশন মেস ক্লিন করতে চান?')) {
              await MockService.purgeSystemData();
              alert('সিস্টেম সফলভাবে রিসেট করা হয়েছে!');
              onRefreshData();
            }
          }}
          className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-bold transition-all"
        >
          সমস্ত ট্রানজেকশন ও মিল ডাটা রিসেট করুন
        </button>
      </div>

    </div>
  );
};


const SpecialMealScheduler: React.FC<{ specialMeals?: SpecialMeal[]; onRefreshData: () => void }> = ({ specialMeals, onRefreshData }) => {
  const [date, setDate] = useState(() => getBangladeshDateStr());
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('dinner');
  const [title, setTitle] = useState('🎉 স্পেশাল বিরিয়ানি ও ডেজার্ট নাইট');
  const [customRate, setCustomRate] = useState(150);
  const [description, setDescription] = useState('শাহী কাচ্চি বিরিয়ানি, চিকেন রোস্ট, ফিরনি ও কোল্ড ড্রিংকস');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState<number>(6); // Default Saturday

  const handleAddSpecial = async () => {
    if (!title.trim() || customRate <= 0) {
      alert('সঠিক নাম ও কাস্টম রেট লিখুন');
      return;
    }
    setSaving(true);
    try {
      await MockService.addSpecialMeal('admin', date, mealType, title, customRate, description, isRecurring, repeatDayOfWeek);
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
            onChange={(e) => {
              const newDate = e.target.value;
              setDate(newDate);
              if (newDate) {
                setRepeatDayOfWeek(new Date(newDate).getDay());
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
              const dayName = days[sm.repeatDayOfWeek !== undefined ? sm.repeatDayOfWeek : new Date(sm.date).getDay()];

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
                    <button
                      type="button"
                      onClick={async () => {
                        await MockService.toggleSpecialMealActive('admin', sm.id);
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
                          await MockService.deleteSpecialMeal('admin', sm.id);
                          onRefreshData();
                        }
                      }}
                      className="px-2.5 py-1 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition"
                    >
                      মুছুন
                    </button>
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

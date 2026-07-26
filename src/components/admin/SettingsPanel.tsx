import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, DollarSign, ToggleLeft, ToggleRight, Clock, Sparkles } from 'lucide-react';
import { MealRateConfig } from '../../types';
import { BN } from '../../constants/banglaText';
import { MockService } from '../../services/mockStorage';

interface SettingsPanelProps {
  rates: MealRateConfig;
  onRefreshData: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ rates, onRefreshData }) => {
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

    </div>
  );
};

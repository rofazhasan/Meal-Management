import React, { useState } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock, Copy, ShieldAlert, Zap, Layers, Sparkles } from 'lucide-react';
import { User, MealRateConfig, MealDeclaration as MealDeclarationType, EmergencyClosure } from '../../types';
import { BN } from '../../constants/banglaText';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { MockService } from '../../services/mockStorage';

interface MealDeclarationProps {
  currentUser: User;
  rates: MealRateConfig;
  declarations: MealDeclarationType[];
  emergencies: EmergencyClosure[];
  onRefreshData: () => void;
}

export const MealDeclaration: React.FC<MealDeclarationProps> = ({
  currentUser,
  rates,
  declarations,
  emergencies,
  onRefreshData,
}) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const userRates = currentUser.userType === 'PERMANENT' ? rates.permanent : rates.guest;

  // Generate next 7 days list
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('bn-BD', { weekday: 'short' });
    const dayNum = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
    return { dateStr, dayName, dayNum, isToday: i === 0 };
  });

  const activeDec = declarations.find(d => d.date === selectedDate) || {
    id: 'temp',
    userId: currentUser.id,
    date: selectedDate,
    breakfast: true,
    lunch: true,
    dinner: true,
    isAutoCopied: false,
    updatedAt: new Date().toISOString(),
  };

  const emergencyForDate = emergencies.find(e => e.date === selectedDate);
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const [breakfast, setBreakfast] = useState(activeDec.breakfast);
  const [lunch, setLunch] = useState(activeDec.lunch);
  const [dinner, setDinner] = useState(activeDec.dinner);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Calculate total daily cost estimate
  const estimatedDailyCost =
    (breakfast ? userRates.breakfast : 0) +
    (lunch ? userRates.lunch : 0) +
    (dinner ? userRates.dinner : 0);

  // Sync state when date changes
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const dec = declarations.find(d => d.date === dateStr);
    if (dec) {
      setBreakfast(dec.breakfast);
      setLunch(dec.lunch);
      setDinner(dec.dinner);
    } else {
      setBreakfast(true);
      setLunch(true);
      setDinner(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await MockService.updateDeclaration(currentUser.id, selectedDate, { breakfast, lunch, dinner });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
      onRefreshData();
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPrev = async () => {
    setSaving(true);
    try {
      const cloned = await MockService.copyPreviousDayDeclaration(currentUser.id, selectedDate);
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
    setBreakfast(b);
    setLunch(l);
    setDinner(d);
  };

  const handleBulkWeekAllMealsOn = async () => {
    setSaving(true);
    try {
      for (const day of nextDays) {
        await MockService.updateDeclaration(currentUser.id, day.dateStr, { breakfast: true, lunch: true, dinner: true });
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
            onClick={handleCopyPrev}
            disabled={saving || !!emergencyForDate}
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

      {/* Date Carousel Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
        {nextDays.map((item) => (
          <button
            key={item.dateStr}
            onClick={() => handleSelectDate(item.dateStr)}
            className={`p-3.5 rounded-2xl border text-center transition-all active:scale-95 ${
              selectedDate === item.dateStr
                ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 border-cyan-400 text-cyan-300 font-bold shadow-lg shadow-cyan-500/15'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider">{item.isToday ? 'আজ' : item.dayName}</p>
            <p className="text-sm font-extrabold mt-0.5 font-mono">{item.dayNum}</p>
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

      {/* Emergency Off Alert */}
      {emergencyForDate && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
          <div>
            <h4 className="font-bold text-sm font-display text-rose-300">জরুরি নোটিশ: এই দিনে মিল সম্পূর্ণ বন্ধ!</h4>
            <p className="text-xs text-rose-200/80">{emergencyForDate.reason}</p>
          </div>
        </div>
      )}

      {/* 10 AM Cutoff Alert */}
      {isToday && (
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
        <div
          onClick={() => !emergencyForDate && setBreakfast(!breakfast)}
          className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[170px] group ${
            emergencyForDate
              ? 'bg-slate-950 border-slate-800 opacity-50 cursor-not-allowed'
              : breakfast
              ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/50 shadow-xl shadow-emerald-950/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-slate-100 font-display">{BN.breakfast}</span>
            {breakfast ? <CheckCircle2 className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" /> : <XCircle className="w-7 h-7 text-slate-600 group-hover:scale-110 transition-transform" />}
          </div>
          <div>
            <div className={`text-2xl font-extrabold mt-4 font-display ${breakfast ? 'text-emerald-400' : 'text-slate-500'}`}>
              {breakfast ? BN.mealOn : BN.mealOff}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">চার্জ: ৳{userRates.breakfast}</p>
          </div>
        </div>

        {/* Lunch Card */}
        <div
          onClick={() => !emergencyForDate && setLunch(!lunch)}
          className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[170px] group ${
            emergencyForDate
              ? 'bg-slate-950 border-slate-800 opacity-50 cursor-not-allowed'
              : lunch
              ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/50 shadow-xl shadow-emerald-950/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-slate-100 font-display">{BN.lunch}</span>
            {lunch ? <CheckCircle2 className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" /> : <XCircle className="w-7 h-7 text-slate-600 group-hover:scale-110 transition-transform" />}
          </div>
          <div>
            <div className={`text-2xl font-extrabold mt-4 font-display ${lunch ? 'text-emerald-400' : 'text-slate-500'}`}>
              {lunch ? BN.mealOn : BN.mealOff}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">চার্জ: ৳{userRates.lunch}</p>
          </div>
        </div>

        {/* Dinner Card */}
        <div
          onClick={() => !emergencyForDate && setDinner(!dinner)}
          className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[170px] group ${
            emergencyForDate
              ? 'bg-slate-950 border-slate-800 opacity-50 cursor-not-allowed'
              : dinner
              ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/50 shadow-xl shadow-emerald-950/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-slate-100 font-display">{BN.dinner}</span>
            {dinner ? <CheckCircle2 className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" /> : <XCircle className="w-7 h-7 text-slate-600 group-hover:scale-110 transition-transform" />}
          </div>
          <div>
            <div className={`text-2xl font-extrabold mt-4 font-display ${dinner ? 'text-emerald-400' : 'text-slate-500'}`}>
              {dinner ? BN.mealOn : BN.mealOff}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">চার্জ: ৳{userRates.dinner}</p>
          </div>
        </div>

      </div>

      {/* Save Action Button */}
      <button
        onClick={handleSave}
        disabled={saving || !!emergencyForDate}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-base transition-all shadow-xl shadow-cyan-500/25 active:scale-95 disabled:opacity-50 font-display"
      >
        {saving ? 'সংরক্ষণ করা হচ্ছে...' : 'মিল চয়েস পরিবর্তন সংরক্ষণ করুন'}
      </button>

    </div>
  );
};

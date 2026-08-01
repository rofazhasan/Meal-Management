import React, { useState } from 'react';
import { ShieldAlert, UserCheck, Utensils, Wallet, AlertOctagon, Check, X, PlusCircle, Sparkles, ChevronRight } from 'lucide-react';
import { User, MealRateConfig, EmergencyClosure, WalletTransaction, MealDeclaration } from '../../types';
import { BN } from '../../constants/banglaText';
import { StatusBadge } from '../common/StatusBadge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { MockService } from '../../services/mockStorage';
import { getBangladeshDateStr } from '../../utils/dateUtils';

interface AdminDashboardProps {
  currentAdmin: User;
  users: User[];
  rates: MealRateConfig;
  emergencies: EmergencyClosure[];
  declarations: MealDeclaration[];
  onRefreshData: () => void;
  onSelectUser: (user: User) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentAdmin,
  users,
  rates,
  emergencies,
  declarations,
  onRefreshData,
  onSelectUser,
}) => {
  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const activeUsers = users.filter(u => u.status === 'APPROVED');
  const totalWalletSum = users.reduce((acc, u) => acc + u.walletBalance, 0);

  const todayStr = getBangladeshDateStr();
  const todayDecs = declarations.filter(d => d.date === todayStr);
  const todayBreakfasts = todayDecs.filter(d => d.breakfast).length;
  const todayLunches = todayDecs.filter(d => d.lunch).length;
  const todayDinners = todayDecs.filter(d => d.dinner).length;

  // Emergency Off Form state
  const [emergencyDate, setEmergencyDate] = useState(todayStr);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  // Quick Top-up Modal State
  const [topUpUser, setTopUpUser] = useState<User | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(500);
  const [topUpNote, setTopUpNote] = useState('ক্যাশ ডিপোজিট');

  const handleApprove = async (userId: string) => {
    await MockService.updateUserStatus(userId, 'APPROVED', currentAdmin.id);
    onRefreshData();
  };

  const handleReject = async (userId: string) => {
    await MockService.updateUserStatus(userId, 'REJECTED', currentAdmin.id);
    onRefreshData();
  };

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyReason.trim()) {
      alert('অনুগ্রহ করে বন্ধের কারণ উল্লেখ করুন');
      return;
    }
    setEmergencySubmitting(true);
    try {
      await MockService.addEmergency(emergencyDate, emergencyReason, ['breakfast', 'lunch', 'dinner']);
      setEmergencyReason('');
      alert('জরুরি মিল বন্ধ সফলভাবে আপডেট করা হয়েছে!');
      onRefreshData();
    } finally {
      setEmergencySubmitting(false);
    }
  };

  const handleConfirmTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpUser || topUpAmount <= 0) return;
    await MockService.addWalletBalance(topUpUser.id, topUpAmount, currentAdmin.id, topUpNote);
    alert(`${topUpUser.name}-এর ওয়ালেটে ৳${topUpAmount} রিচার্জ যোগ করা হয়েছে!`);
    setTopUpUser(null);
    onRefreshData();
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto animate-scale-in">
      
      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Pending Approvals Card */}
        <div className="glass-panel p-5 rounded-3xl border border-amber-500/30 flex items-center justify-between shadow-xl shadow-amber-950/10">
          <div>
            <p className="text-xs font-semibold text-amber-400 font-display">{BN.pendingApprovals}</p>
            <p className="text-3xl font-extrabold text-slate-100 font-mono mt-1">
              <AnimatedNumber value={pendingUsers.length} />
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">আবেদনের অনুমোদনের অপেক্ষায়</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Active Users Card */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold text-slate-400 font-display">{BN.activeUsersCount}</p>
            <p className="text-3xl font-extrabold text-cyan-400 font-mono mt-1">
              <AnimatedNumber value={activeUsers.length} />
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">অনুমোদিত মোট মেম্বার</p>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Meals Consumption */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold text-slate-400 font-display">আজকের খাবার কাউন্ট</p>
            <p className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
              নাস্তা: {todayBreakfasts} | দুপুর: {todayLunches} | রাত: {todayDinners}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">সক্রিয় ডিক্লারেশন</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        {/* Total Wallet Funds */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold text-slate-400 font-display">{BN.totalRevenue}</p>
            <p className="text-3xl font-extrabold text-cyan-300 font-mono mt-1">
              <AnimatedNumber value={totalWalletSum} prefix={BN.tkSymbol} decimals={0} />
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">মোট মেস ফান্ড ব্যালেন্স</p>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Pending Approvals Action Section */}
      {pendingUsers.length > 0 && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-amber-500/30 space-y-4 shadow-xl shadow-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base font-display">
                {BN.pendingApprovals} ({pendingUsers.length} জন)
              </h3>
              <p className="text-xs text-slate-400 font-sans">নতুন ইউজার একাউন্ট যাচাইকরণ ও অনুমোদন দিন</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 uppercase text-[10px] text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3.5">নাম</th>
                  <th className="p-3.5">ফোন</th>
                  <th className="p-3.5">রুম</th>
                  <th className="p-3.5">ধরণ</th>
                  <th className="p-3.5 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {pendingUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3.5 font-bold text-slate-100">{u.name}</td>
                    <td className="p-3.5 font-mono text-slate-300">{u.phone}</td>
                    <td className="p-3.5 font-mono">{u.roomNo || '-'}</td>
                    <td className="p-3.5"><StatusBadge userType={u.userType} /></td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleApprove(u.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {BN.approve}
                      </button>
                      <button
                        onClick={() => handleReject(u.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                        {BN.reject}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid: Emergency Meal Closure & Quick Top-Up Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Emergency Meal Closure Panel */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-rose-500/30 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base font-display">{BN.emergencyMealClosure}</h3>
              <p className="text-xs text-slate-400 font-sans">বিশেষ পরিস্থিতিতে ডাইনিং মিল অফ নোটিশ দিন</p>
            </div>
          </div>

          <form onSubmit={handleEmergencySubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">{BN.closureDate}</label>
              <input
                type="date"
                required
                value={emergencyDate}
                onChange={(e) => setEmergencyDate(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 font-mono focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">{BN.closureReason}</label>
              <input
                type="text"
                required
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                placeholder="যেমন: গ্যাস সংযোগ মেরামতের কারণে সব মিল বন্ধ"
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={emergencySubmitting}
              className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-rose-600/30 active:scale-95 font-display"
            >
              {emergencySubmitting ? 'প্রসেসিং...' : BN.emergencySubmit}
            </button>
          </form>

          {/* Active Emergency Closures */}
          {emergencies.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs font-bold text-slate-400 mb-2 font-sans">সর্বশেষ জরুরি বন্ধ নোটিশসমূহ:</p>
              <div className="space-y-2">
                {emergencies.map((em) => (
                  <div key={em.id} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                    <p className="font-bold text-rose-300 font-mono">{em.date}: {em.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Wallet Top-Up Tool */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 text-cyan-400">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base font-display">দ্রুত পার্স / ওয়ালেট রিচার্জ করুন</h3>
              <p className="text-xs text-slate-400 font-sans">মেম্বারের ক্যাশ ডিপোজিট ক্রেডিট করুন</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">সদস্য নির্বাচন করুন</label>
              <select
                onChange={(e) => {
                  const u = activeUsers.find(usr => usr.id === e.target.value);
                  setTopUpUser(u || null);
                }}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">-- মেম্বার সিলেক্ট করুন --</option>
                {activeUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.phone}) - ব্যালেন্স: ৳{u.walletBalance}
                  </option>
                ))}
              </select>
            </div>

            {topUpUser && (
              <form onSubmit={handleConfirmTopUp} className="space-y-3.5 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 animate-slide-up">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">টাকার পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-base text-emerald-400 font-bold font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">বিবরণ / রিসিট নোট</label>
                  <input
                    type="text"
                    value={topUpNote}
                    onChange={(e) => setTopUpNote(e.target.value)}
                    placeholder="যেমন: বিকাশ মারফত জমা"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-95 font-display"
                >
                  {BN.confirmTopUp}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

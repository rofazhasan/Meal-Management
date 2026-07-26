import React, { useState } from 'react';
import { ArrowLeft, User, Phone, Home, Wallet, Shield, History, PlusCircle, Check, X, Calendar, Sparkles } from 'lucide-react';
import { User as UserType, WalletTransaction, MealDeclaration, UserType as MemberType } from '../../types';
import { BN } from '../../constants/banglaText';
import { StatusBadge } from '../common/StatusBadge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { MockService } from '../../services/mockStorage';

interface AdminUserDetailProps {
  user: UserType;
  adminId: string;
  transactions: WalletTransaction[];
  declarations: MealDeclaration[];
  onBack: () => void;
  onRefreshData: () => void;
}

export const AdminUserDetail: React.FC<AdminUserDetailProps> = ({
  user,
  adminId,
  transactions,
  declarations,
  onBack,
  onRefreshData,
}) => {
  const [topUpAmount, setTopUpAmount] = useState<number>(500);
  const [topUpNote, setTopUpNote] = useState('ক্যাশ রিচার্জ');
  const [submitting, setSubmitting] = useState(false);

  const userTx = transactions.filter(t => t.userId === user.id);
  const userDecs = declarations.filter(d => d.userId === user.id);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topUpAmount <= 0) return;
    setSubmitting(true);
    try {
      await MockService.addWalletBalance(user.id, topUpAmount, adminId, topUpNote);
      alert(`৳${topUpAmount} রিচার্জ যোগ করা হয়েছে!`);
      onRefreshData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleType = async () => {
    const newType: MemberType = user.userType === 'PERMANENT' ? 'GUEST' : 'PERMANENT';
    await MockService.updateUserType(user.id, newType);
    onRefreshData();
  };

  const handleStatusChange = async (status: 'APPROVED' | 'REJECTED') => {
    await MockService.updateUserStatus(user.id, status, adminId);
    onRefreshData();
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto animate-scale-in">
      
      {/* Top Back Navigation Bar */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>সদস্য তালিকায় ফিরে যান</span>
      </button>

      {/* User Profile Overview Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-400 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-300 font-extrabold text-2xl font-display">
                {user.name.charAt(0)}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white font-display">{user.name}</h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                ফোন: <span className="font-mono text-cyan-300">{user.phone}</span> • রুম: <span className="font-bold text-slate-200">{user.roomNo || '-'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge userType={user.userType} />
            <StatusBadge status={user.status} />
          </div>
        </div>

        {/* Action Controls for Admin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
          <button
            onClick={handleToggleType}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-slate-200 flex items-center justify-between transition-all active:scale-95"
          >
            <span>সদস্যের ধরণ পরিবর্তন করুন</span>
            <span className="font-bold text-cyan-400 font-display">
              {user.userType === 'PERMANENT' ? 'অতিথিতে সুইচ' : 'স্থায়ীতে সুইচ'}
            </span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('APPROVED')}
              disabled={user.status === 'APPROVED'}
              className="flex-1 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all disabled:opacity-40 active:scale-95 font-display"
            >
              অনুমোদন দিন
            </button>
            <button
              onClick={() => handleStatusChange('REJECTED')}
              disabled={user.status === 'REJECTED'}
              className="flex-1 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all disabled:opacity-40 active:scale-95 font-display"
            >
              বাতিল করুন
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Balance & Top-Up Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Wallet Balance Hero */}
        <div className="wallet-card-holographic p-7 rounded-3xl text-white shadow-2xl shadow-sky-950/40 border border-cyan-500/30 flex flex-col justify-between min-h-[200px]">
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-bold text-cyan-200 uppercase tracking-wider font-sans">{BN.currentBalance}</span>
            <Wallet className="w-5 h-5 text-cyan-300" />
          </div>
          <div className="my-4 z-10">
            <div className="text-4xl font-extrabold font-mono text-white">
              <AnimatedNumber value={user.walletBalance} prefix={BN.tkSymbol} decimals={0} />
            </div>
            <p className="text-xs text-cyan-200/80 mt-1 font-sans">সর্বশেষ আপডেটকৃত ওয়ালেট ব্যালেন্স</p>
          </div>
        </div>

        {/* Add Money Form */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2 font-display">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
            </div>
            টাকা রিচার্জ করুন
          </h3>

          <form onSubmit={handleTopUp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">পরিমাণ (৳)</label>
              <input
                type="number"
                required
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(Number(e.target.value))}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-base text-emerald-400 font-bold font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">নোট / বিবরণ</label>
              <input
                type="text"
                value={topUpNote}
                onChange={(e) => setTopUpNote(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-95 font-display"
            >
              {submitting ? 'রিচার্জ হচ্ছে...' : BN.confirmTopUp}
            </button>
          </form>
        </div>

      </div>

      {/* Transaction & Meal Declarations History Tabs */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
        <h3 className="font-bold text-slate-100 text-base flex items-center gap-2 font-display">
          <History className="w-5 h-5 text-cyan-400" />
          এই ইউজারের সাম্প্রতিক লেনদেন ইতিহাস
        </h3>

        {userTx.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="কোনো লেনদেন পাওয়া যায়নি"
            description="এই ইউজারের এখনও কোনো জমা বা খরচের ইতিহাস নেই।"
          />
        ) : (
          <div className="space-y-2.5">
            {userTx.map((tx) => (
              <div key={tx.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs flex justify-between items-center hover:border-slate-700 transition-colors">
                <div>
                  <p className="font-bold text-slate-200 font-sans">{tx.description}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{tx.date}</p>
                </div>
                <div className="text-right font-mono font-bold">
                  <span className={tx.type === 'RECHARGE' ? 'text-emerald-400' : 'text-rose-400'}>
                    {tx.type === 'RECHARGE' ? '+' : '-'} ৳{tx.amount}
                  </span>
                  <p className="text-[10px] text-slate-400 font-normal">অবশিষ্ট: ৳{tx.balanceAfter}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

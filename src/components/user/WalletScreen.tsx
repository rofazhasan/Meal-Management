import React, { useState } from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, History, CreditCard, AlertTriangle, Printer, Sparkles, ChevronRight } from 'lucide-react';
import { User, WalletTransaction } from '../../types';
import { BN } from '../../constants/banglaText';
import { ReceiptModal } from '../common/ReceiptModal';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';

interface WalletScreenProps {
  currentUser: User;
  transactions: WalletTransaction[];
}

export const WalletScreen: React.FC<WalletScreenProps> = ({ currentUser, transactions }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'RECHARGE' | 'MEAL_DEDUCTION'>('ALL');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<WalletTransaction | null>(null);

  const isLowBalance = currentUser.walletBalance < 200;

  const filteredTx = transactions.filter(tx => {
    if (filterType === 'ALL') return true;
    return tx.type === filterType;
  });

  const totalRecharge = transactions
    .filter(t => t.type === 'RECHARGE')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalDeduction = transactions
    .filter(t => t.type === 'MEAL_DEDUCTION' || t.type === 'MONTHLY_CHARGE')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto animate-scale-in">
      
      {/* Low Balance Warning Alert */}
      {isLowBalance && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-3 shadow-lg shadow-amber-950/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm font-display text-amber-300">সতর্কতা: আপনার ওয়ালেট ব্যালেন্স কম (৳২০০-এর কম)!</h4>
              <p className="text-xs text-amber-200/80">নিয়মিত মিল চালু রাখতে দ্রুত মেস ম্যানেজারকে রিচার্জ পরিশোধ করুন।</p>
            </div>
          </div>
        </div>
      )}

      {/* Luxury 3D Holographic Wallet Card */}
      <div className="wallet-card-holographic p-7 sm:p-8 rounded-3xl text-white shadow-2xl shadow-sky-950/40 border border-cyan-500/30 flex flex-col justify-between min-h-[230px]">
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30">
              <CreditCard className="w-5 h-5 text-cyan-300" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-200 font-sans">
              {BN.wallet} ডিজিটাল লেজার
            </span>
          </div>
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 backdrop-blur-md">
            {currentUser.userType === 'PERMANENT' ? BN.permanentUser : BN.guestUser}
          </span>
        </div>

        <div className="my-5 z-10">
          <p className="text-xs text-cyan-200/80 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {BN.currentBalance}
          </p>
          <div className="text-4xl sm:text-5xl font-extrabold text-white font-mono">
            <AnimatedNumber value={currentUser.walletBalance} prefix={BN.tkSymbol} decimals={0} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-cyan-500/20 z-10 text-xs">
          <div>
            <p className="text-cyan-200/70 font-sans">{BN.totalRecharge}</p>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-300 font-mono mt-0.5">
              <AnimatedNumber value={totalRecharge} prefix="+ ৳" decimals={0} />
            </p>
          </div>
          <div>
            <p className="text-cyan-200/70 font-sans">{BN.totalDeduction}</p>
            <p className="text-lg sm:text-xl font-extrabold text-rose-300 font-mono mt-0.5">
              <AnimatedNumber value={totalDeduction} prefix="- ৳" decimals={0} />
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Ledger & History Table */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-5 shadow-xl">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <History className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base font-display">পার্স লেনদেন রেজিস্টার (Ledger)</h3>
              <p className="text-xs text-slate-400 font-sans">সকল রিচার্জ ও মিল বাবদ খরচের বিবরণী</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all active:scale-95 ${
                filterType === 'ALL' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              সবগুলো
            </button>
            <button
              onClick={() => setFilterType('RECHARGE')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all active:scale-95 ${
                filterType === 'RECHARGE' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              রিচার্জ
            </button>
            <button
              onClick={() => setFilterType('MEAL_DEDUCTION')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all active:scale-95 ${
                filterType === 'MEAL_DEDUCTION' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              কাটা
            </button>
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="কোনো লেনদেন রেকর্ড পাওয়া যায়নি"
            description="আপনার নির্বাচিত ক্যাটাগরিতে এখনও কোনো রেকর্ড যুক্ত হয়নি।"
          />
        ) : (
          <div className="space-y-3">
            {filteredTx.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setSelectedTxForReceipt(tx)}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900 cursor-pointer transition-all flex items-center justify-between gap-4 group shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-2xl ${
                    tx.type === 'RECHARGE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {tx.type === 'RECHARGE' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-200 group-hover:text-cyan-300 transition-colors font-sans">{tx.description}</p>
                      <Printer className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{tx.date}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-base font-extrabold font-mono ${
                    tx.type === 'RECHARGE' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.type === 'RECHARGE' ? '+' : '-'} ৳{tx.amount}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    অবশিষ্ট: ৳{tx.balanceAfter}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Digital Receipt Modal */}
      <ReceiptModal
        transaction={selectedTxForReceipt}
        user={currentUser}
        onClose={() => setSelectedTxForReceipt(null)}
      />

    </div>
  );
};

import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownRight, Users, AlertCircle, Download, FileText, Printer, Building2, Sparkles } from 'lucide-react';
import { FinancialMetrics, Branch } from '../../types';
import { BN } from '../../constants/banglaText';
import { AnimatedNumber } from '../common/AnimatedNumber';

interface FinancialDashboardProps {
  metrics: FinancialMetrics;
  branches: Branch[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  metrics,
  branches,
  selectedBranchId,
  onSelectBranch,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'monthly' | 'yearly'>('monthly');

  const handleExportPDF = () => {
    alert('ফাইন্যান্সিয়াল রিপোর্ট PDF আকারে ডাউনলোড হচ্ছে...');
  };

  const handleExportExcel = () => {
    alert('ফাইন্যান্সিয়াল রিপোর্ট Excel (.xlsx) আকারে প্রস্তুত হচ্ছে...');
  };

  return (
    <div className="space-y-6 animate-scale-in pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              {BN.financialDashboard}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            রিয়েল-টাইম আয়-ব্যয়, ওয়ালেট জমা, নিট প্রফিট এবং রাজস্ব বিশ্লেষণ
          </p>
        </div>

        {/* Branch & Time Filters & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedBranchId}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="bg-transparent font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">{BN.allBranches}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
              ))}
            </select>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setFilterPeriod('today')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${filterPeriod === 'today' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              আজকের
            </button>
            <button
              onClick={() => setFilterPeriod('monthly')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${filterPeriod === 'monthly' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              মাসিক
            </button>
            <button
              onClick={() => setFilterPeriod('yearly')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${filterPeriod === 'yearly' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              বার্ষিক
            </button>
          </div>

          {/* Export Buttons */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-cyan-300 font-semibold transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-emerald-400 font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Top Financial KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Wallet Deposits */}
        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{BN.totalWalletBalance}</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">
              <AnimatedNumber value={metrics.totalWalletBalance} prefix={BN.tkSymbol} />
            </span>
          </div>
          <p className="text-[11px] text-cyan-400/80 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> মেম্বারদের অগ্রিম জমাকৃত ফান্ড
          </p>
        </div>

        {/* Total Collections */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">
              {filterPeriod === 'today' ? BN.todayCollection : filterPeriod === 'monthly' ? BN.monthlyCollection : BN.yearlyCollection}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">
              <AnimatedNumber
                value={filterPeriod === 'today' ? metrics.todayCollection : filterPeriod === 'monthly' ? metrics.monthlyCollection : metrics.yearlyCollection}
                prefix={BN.tkSymbol}
              />
            </span>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> মোট রিচার্জ কালেকশন
          </p>
        </div>

        {/* Expenses / Meal Deduction */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{BN.todayExpenses}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">
              <AnimatedNumber value={metrics.todayExpenses} prefix={BN.tkSymbol} />
            </span>
          </div>
          <p className="text-[11px] text-amber-400/80 mt-2 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" /> আনুমানিক কাঁচামাল ও পরিচালন ব্যয়
          </p>
        </div>

        {/* Net Profit / Balance */}
        <div className="glass-panel p-5 rounded-2xl border border-sky-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{BN.netProfit}</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">
              <AnimatedNumber value={metrics.netProfit} prefix={BN.tkSymbol} />
            </span>
          </div>
          <p className="text-[11px] text-sky-400/80 mt-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> নিট অপারেটিং প্রফিট
          </p>
        </div>
      </div>

      {/* Revenue Breakdown & Top Spenders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Source Breakdown Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            মেম্বারশিপ টাইপ অনুযায়ী রাজস্ব বিভাজন
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">{BN.permanentRevenue}</span>
                <span className="text-cyan-300 font-mono">৳{metrics.permanentRevenue.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-500 to-sky-400 h-full w-[80%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">{BN.guestRevenue}</span>
                <span className="text-amber-300 font-mono">৳{metrics.guestRevenue.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full w-[25%]" />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>অফেরতযোগ্য সার্ভিস চার্জ:</span>
              <span className="font-bold text-white font-mono">৳{metrics.totalRefunds}</span>
            </div>
          </div>
        </div>

        {/* Top Spending Users List */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              {BN.topSpenders}
            </h3>
            <span className="text-xs text-slate-400">চলতি মাস</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {metrics.topSpenders.map((user, i) => (
              <div key={i} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-300">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200">{user.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">{user.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 font-mono text-sm">৳{user.amount}</span>
                  <p className="text-[10px] text-slate-400">মোট খরচ</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownRight, Users, AlertCircle, Download, FileText, Printer, Sparkles, CheckCircle2, Wallet, HandCoins, ClipboardList, CheckCheck, XCircle } from 'lucide-react';
import { FinancialMetrics, WalletTransaction, User } from '../../types';
import { BN } from '../../constants/banglaText';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { ApiService } from '../../services/apiService';

interface FinancialDashboardProps {
  metrics: FinancialMetrics;
  transactions?: WalletTransaction[];
  users?: User[];
  currentAdmin: User;
  onRefreshData?: () => void;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  metrics,
  transactions = [],
  users = [],
  currentAdmin,
  onRefreshData,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'monthly' | 'yearly'>('monthly');

  // Monthly Fee State
  const [feeTargetUser, setFeeTargetUser] = useState<string>('ALL');
  const [feeMethod, setFeeMethod] = useState<'WALLET_DEDUCTION' | 'CASH_HAND_TO_HAND'>('WALLET_DEDUCTION');
  const [feeAmount, setFeeAmount] = useState<number>(500);
  const [feeMonthYear, setFeeMonthYear] = useState<string>('আগস্ট ২০২৬');
  const [feeSubmitting, setFeeSubmitting] = useState(false);

  // Monthly Fee Status Tracker
  const [feeCheckMonth, setFeeCheckMonth] = useState(feeMonthYear);

  const feeStatusReport = useMemo(() => {
    const approvedUsers = users.filter(u => u.status === 'APPROVED');
    return approvedUsers.map(u => {
      const paid = transactions.find(
        tx =>
          tx.userId === u.id &&
          (tx.type === 'MONTHLY_CHARGE' || tx.type === 'CASH_PAID') &&
          tx.description.includes(feeCheckMonth)
      );
      return {
        user: u,
        paid: !!paid,
        method: paid
          ? paid.type === 'MONTHLY_CHARGE'
            ? 'ওয়ালেট কর্তন'
            : 'হাতে ক্যাশ'
          : null,
        amount: paid ? paid.amount : null,
        paidAt: paid ? new Date(paid.date).toLocaleDateString('bn-BD') : null,
      };
    });
  }, [users, transactions, feeCheckMonth]);

  const paidCount = feeStatusReport.filter(r => r.paid).length;
  const unpaidCount = feeStatusReport.filter(r => !r.paid).length;

  const handlePrintFeeReport = () => {
    const style = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Hind Siliguri', sans-serif; background: #fff; color: #0f172a; padding: 28px; }
        h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
        .summary { display: flex; gap: 16px; margin-bottom: 18px; }
        .pill { padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; }
        .green { background: #dcfce7; color: #166534; }
        .red { background: #fee2e2; color: #991b1b; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .badge-green { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
        .badge-red { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
        footer { margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    `;
    const rows = feeStatusReport.map(r => `
      <tr>
        <td>${r.user.name}</td>
        <td class="mono">${r.user.phone}</td>
        <td>${r.paid ? `<span class="badge-green">✅ পরিশোধ করেছেন</span>` : '<span class="badge-red">❌ বকেয়া</span>'}</td>
        <td class="mono">${r.amount != null ? '৳' + r.amount : '-'}</td>
        <td>${r.method || '-'}</td>
        <td>${r.paidAt || '-'}</td>
      </tr>
    `).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${style}<title>মাসিক ফি স্ট্যাটাস - ${feeCheckMonth}</title></head><body>
      <h1>মাসিক ফি পরিশোধের তালিকা</h1>
      <p class="meta">মাস: ${feeCheckMonth} &nbsp;|&nbsp; মোট সদস্য: ${feeStatusReport.length} জন &nbsp;|&nbsp; মুদ্রণের সময়: ${new Date().toLocaleString('bn-BD')}</p>
      <div class="summary">
        <span class="pill green">✅ পরিশোধ করেছেন: ${paidCount} জন</span>
        <span class="pill red">❌ বকেয়া আছেন: ${unpaidCount} জন</span>
      </div>
      <table>
        <thead><tr><th>নাম</th><th>ফোন</th><th>স্ট্যাটাস</th><th>পরিমাণ</th><th>পদ্ধতি</th><th>তারিখ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <footer>মিল ম্যানেজার সিস্টেম — মাসিক ফি স্ট্যাটাস রিপোর্ট</footer>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
  };

  const handleCollectMonthlyFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feeAmount <= 0) return;
    setFeeSubmitting(true);
    try {
      const count = await ApiService.collectMonthlyFee(
        currentAdmin.id,
        feeTargetUser,
        feeMethod,
        feeAmount,
        feeMonthYear
      );
      const methodText = feeMethod === 'WALLET_DEDUCTION' ? 'ওয়ালেট থেকে সরাসরি কর্তন করা হয়েছে' : 'হাতে হাতে ক্যাশ রেকর্ড হিসাবে ট্রানজেকশন তৈরি হয়েছে (ওয়ালেট ব্যালেন্স অপরিবর্তিত)';
      alert(`মোট ${count} জন মেম্বারের ${feeMonthYear} তারিখের মাসিক ফি (৳${feeAmount}) ${methodText}!`);
      if (onRefreshData) {
        onRefreshData();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message || 'মাসিক ফি সংগ্রহ করতে সমস্যা হয়েছে');
    } finally {
      setFeeSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const rows: string[][] = [
      ['মেস ম্যানেজমেন্ট সিস্টেম - ফাইনান্সিয়াল ড্যাশবোর্ড রিপোর্ট'],
      ['রিপোর্ট তৈরির তারিখ', new Date().toLocaleString('bn-BD')],
      ['ফিল্টার সময়কাল', filterPeriod === 'today' ? 'আজকের' : filterPeriod === 'monthly' ? 'চলতি মাসের' : 'বার্ষিক'],
      [''],
      ['মেট্রিকে বিবরণ', 'পরিমাণ (৳)'],
      ['মোট ওয়ালেট ব্যালেন্স', (metrics.totalWalletBalance || 0).toString()],
      ['মাসিক মোট কালেকশন (জমা)', (metrics.monthlyCollection || 0).toString()],
      ['আজকের ব্যয় (খরচ)', (metrics.todayExpenses || 0).toString()],
      ['স্থায়ী সদস্য রাজস্ব', (metrics.permanentRevenue || 0).toString()],
      ['অতিথি সদস্য রাজস্ব', (metrics.guestRevenue || 0).toString()],
      ['মোট রিফান্ড', (metrics.totalRefunds || 0).toString()],
      ['নিট লাভ/লোকসান', (metrics.netProfit || 0).toString()],
      [''],
      ['সার্বিক লেনদেন রেজিস্টার (Transactions Ledger)'],
      ['তারিখ ও সময়', 'মেম্বার নাম', 'ফোন নম্বর', 'লেনদেনের ধরণ', 'বিবরণ', 'পরিমাণ (৳)', 'পূর্বের ব্যালেন্স (৳)', 'পরের ব্যালেন্স (৳)'],
    ];

    transactions.forEach((tx) => {
      const txUser = users?.find((u) => u.id === tx.userId);
      const typeText =
        tx.type === 'RECHARGE'
          ? 'ওয়ালেট রিচার্জ'
          : tx.type === 'MEAL_DEDUCTION'
          ? 'মিল কর্তন'
          : tx.type === 'MONTHLY_CHARGE'
          ? 'মাসিক ফি'
          : tx.type === 'CASH_PAID'
          ? 'হাতে ক্যাশ পরিশোধ'
          : tx.type === 'REFUND'
          ? 'রিফান্ড'
          : tx.type;

      const dateStr = new Date(tx.date).toLocaleString('bn-BD');
      const name = txUser ? txUser.name : 'অজানা মেম্বার';
      const phone = txUser ? txUser.phone : tx.userId;
      const desc = tx.description || '-';

      rows.push([
        `"${dateStr}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${phone.replace(/"/g, '""')}"`,
        `"${typeText}"`,
        `"${desc.replace(/"/g, '""')}"`,
        tx.amount.toString(),
        (tx.balanceBefore || 0).toString(),
        (tx.balanceAfter || 0).toString(),
      ]);
    });

    const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Meal_Management_Financial_Report_${filterPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

        {/* Time Filters & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
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

      {/* ═══════════════════════════════════════════════════════════
          MONTHLY FEE STATUS TRACKER
          ═══════════════════════════════════════════════════════════ */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-emerald-500/30 space-y-5 shadow-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
              <ClipboardList className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">মাসিক ফি পরিশোধের তালিকা</h3>
              <p className="text-xs text-slate-400">কোন সদস্য ফি দিয়েছেন আর কে বকেয়া আছেন তা দেখুন</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <input
              type="text"
              value={feeCheckMonth}
              onChange={e => setFeeCheckMonth(e.target.value)}
              placeholder="যেমন: আগস্ট ২০২৬"
              className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:border-emerald-500 focus:outline-none min-w-[150px]"
            />
            <button
              onClick={handlePrintFeeReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-slate-100 border border-slate-600/60 font-bold text-xs transition-all shadow-md active:scale-95 whitespace-nowrap"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              প্রিন্ট রিপোর্ট
            </button>
          </div>
        </div>

        {/* Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <CheckCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-2xl font-extrabold text-emerald-400 font-mono">{paidCount}</p>
              <p className="text-[10px] text-emerald-300 font-bold">ফি পরিশোধ করেছেন</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-2xl font-extrabold text-rose-400 font-mono">{unpaidCount}</p>
              <p className="text-[10px] text-rose-300 font-bold">ফি বকেয়া আছেন</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3 col-span-2 sm:col-span-1">
            <Users className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-2xl font-extrabold text-slate-300 font-mono">{feeStatusReport.length}</p>
              <p className="text-[10px] text-slate-400 font-bold">মোট সক্রিয় সদস্য</p>
            </div>
          </div>
        </div>

        {/* Per-User Fee Status Table */}
        {feeStatusReport.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 uppercase text-[10px] text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3.5">নাম</th>
                  <th className="p-3.5">ফোন</th>
                  <th className="p-3.5">ওয়ালেট</th>
                  <th className="p-3.5">ফি স্ট্যাটাস</th>
                  <th className="p-3.5">পরিমাণ</th>
                  <th className="p-3.5">পদ্ধতি</th>
                  <th className="p-3.5">তারিখ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {feeStatusReport.map(r => (
                  <tr key={r.user.id} className={`transition-colors ${
                    r.paid ? 'hover:bg-emerald-500/5' : 'hover:bg-rose-500/5 bg-rose-500/[0.02]'
                  }`}>
                    <td className="p-3.5 font-bold text-slate-100">{r.user.name}</td>
                    <td className="p-3.5 font-mono text-slate-300">{r.user.phone}</td>
                    <td className="p-3.5 font-mono text-slate-300">৳{r.user.walletBalance}</td>
                    <td className="p-3.5">
                      {r.paid ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> পরিশোধ করেছেন
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" /> বকেয়া আছেন
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono">
                      {r.amount != null ? <span className="text-slate-200">৳{r.amount}</span> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3.5">
                      {r.method ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.method === 'ওয়ালেট কর্তন'
                            ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}>{r.method}</span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">{r.paidAt || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center">
            <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">কোনো সক্রিয় সদস্য পাওয়া যায়নি।</p>
          </div>
        )}
      </div>

      {/* Monthly Fee Collection & Management Card */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-cyan-500/30 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <HandCoins className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display">
                💵 মাসিক ফি আদায় ও ওয়ালেট কর্তন হাব
              </h3>
              <p className="text-xs text-slate-400">
                ২টি ভিন্ন উপায়ে মাসিক ফি এনট্রি করুন (ওয়ালেট থেকে সরাসরি কর্তন অথবা হাতে হাতে ক্যাশ গ্রহণ)
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
            মাসিক ফি: ৳{feeAmount}
          </span>
        </div>

        <form onSubmit={handleCollectMonthlyFee} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Target User */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">প্রাপক সদস্য নির্বাচন</label>
              <select
                value={feeTargetUser}
                onChange={(e) => setFeeTargetUser(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">সকল অনুমোদিত মেম্বার ({users.filter(u => u.status === 'APPROVED').length} জন)</option>
                {users.filter(u => u.status === 'APPROVED').map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">মাসিক ফি পরিমাণ (৳)</label>
              <input
                type="number"
                required
                value={feeAmount}
                onChange={(e) => setFeeAmount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-emerald-400 font-bold font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Month & Year */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">মাস ও বছর (বিবরণ)</label>
              <input
                type="text"
                required
                value={feeMonthYear}
                onChange={(e) => setFeeMonthYear(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">পরিশোধের মাধ্যম</label>
              <select
                value={feeMethod}
                onChange={(e) => setFeeMethod(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-amber-300 font-bold focus:border-cyan-500 focus:outline-none"
              >
                <option value="WALLET_DEDUCTION">💳 ওয়ালেট থেকে সরাসরি কর্তন</option>
                <option value="CASH_HAND_TO_HAND">🤝 হাতে হাতে ক্যাশ প্রদান (ওয়ালেট অপরিবর্তিত)</option>
              </select>
            </div>

          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">
              {feeMethod === 'WALLET_DEDUCTION'
                ? 'ℹ️ মেম্বারের ওয়ালেট ব্যালেন্স থেকে সরাসরি ৳' + feeAmount + ' কর্তন করা হবে এবং লেনদেন যুক্ত হবে।'
                : 'ℹ️ মেম্বার হাতে হাতে ক্যাশ প্রদান করেছেন। ওয়ালেট ব্যালেন্স অপরিবর্তিত থাকবে এবং ট্রানজেকশনে লেখা থাকবে: "(হাতে হাতে ক্যাশ প্রদান করা হয়েছে, ওয়ালেট থেকে কর্তন নয়)"।'}
            </span>
          </div>

          <button
            type="submit"
            disabled={feeSubmitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-cyan-500/25 active:scale-95 disabled:opacity-50 font-display flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{feeSubmitting ? 'প্রসেস হচ্ছে...' : 'মাসিক ফি আদায়ের ট্রানজেকশন প্রসেস করুন'}</span>
          </button>
        </form>
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

      {/* All System Transactions Master Ledger Table */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-white font-display flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              সকল সদস্যের সার্বিক লেনদেন রেজিস্টার (All Transactions Ledger)
            </h3>
            <p className="text-xs text-slate-400 font-sans">সিস্টেমের সমস্ত মেম্বার রিচার্জ, মিল কর্তন এবং রিফান্ড রেকর্ড</p>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-1.5 transition print:hidden"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট মাস্টার লেনদেন লেজার</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 uppercase text-[10px] text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="p-3.5 font-bold">তারিখ ও সময়</th>
                <th className="p-3.5 font-bold">মেম্বার</th>
                <th className="p-3.5 font-bold">লেনদেনের ধরণ</th>
                <th className="p-3.5 font-bold">বিবরণ</th>
                <th className="p-3.5 font-bold text-right">পরিমাণ (৳)</th>
                <th className="p-3.5 font-bold text-right">নতুন ব্যালেন্স (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
              {transactions && transactions.length > 0 ? (
                transactions.map((tx) => {
                  const txUser = users?.find(u => u.id === tx.userId);
                  const isRecharge = tx.type === 'RECHARGE';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-900/60 transition">
                      <td className="p-3.5 font-mono text-slate-400">
                        {new Date(tx.date).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        {txUser ? txUser.name : 'অজানা মেম্বার'}
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">{txUser?.phone || tx.userId}</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                          isRecharge ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {isRecharge ? '➕ ওয়ালেট রিচার্জ' : '➖ মিল কর্তন'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300">{tx.description || '-'}</td>
                      <td className={`p-3.5 text-right font-mono font-bold ${isRecharge ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isRecharge ? `+ ৳${tx.amount}` : `- ৳${tx.amount}`}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-200">
                        ৳{tx.balanceAfter}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    কোনো লেনদেন রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

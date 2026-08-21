'use client';

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Download,
  FileText,
  Printer,
  Sparkles,
  CheckCircle2,
  HandCoins,
  ClipboardList,
  CheckCheck,
  XCircle,
  Search,
  Filter,
  Eye,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { FinancialMetrics, WalletTransaction, User } from '../../types';
import { BN } from '../../constants/banglaText';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { ApiService } from '../../services/apiService';
import { ReceiptModal } from '../common/ReceiptModal';

interface FinancialDashboardProps {
  metrics: FinancialMetrics;
  transactions?: WalletTransaction[];
  users?: User[];
  currentAdmin: User;
  onRefreshData?: () => void;
}

/**
 * Unified Transaction Type Formatter Algorithm
 * Maps internal enum keys to accurate Bangla titles, badges, and color schemes.
 */
export function getTxTypeInfo(type: string): {
  label: string;
  badgeClass: string;
  amountPrefix: string;
  amountClass: string;
  isCredit: boolean;
} {
  switch (type) {
    case 'RECHARGE':
    case 'ADMIN_TOPUP':
    case 'CREDIT':
      return {
        label: '➕ ওয়ালেট রিচার্জ',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        amountPrefix: '+ ৳',
        amountClass: 'text-emerald-400',
        isCredit: true,
      };
    case 'REFUND':
      return {
        label: '🔄 রিফান্ড (সমন্বয় / রিভার্সাল)',
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        amountPrefix: '+ ৳',
        amountClass: 'text-cyan-300',
        isCredit: true,
      };
    case 'DISCOUNT':
      return {
        label: '🎁 ছাড় / ডিসকাউন্ট',
        badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        amountPrefix: '+ ৳',
        amountClass: 'text-teal-300',
        isCredit: true,
      };
    case 'MEAL_DEDUCTION':
    case 'DEBIT':
      return {
        label: '➖ মিল কর্তন',
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        amountPrefix: '- ৳',
        amountClass: 'text-rose-400',
        isCredit: false,
      };
    case 'MONTHLY_CHARGE':
      return {
        label: '📋 মাসিক ফি কর্তন',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        amountPrefix: '- ৳',
        amountClass: 'text-amber-300',
        isCredit: false,
      };
    case 'CASH_PAID':
      return {
        label: '🤝 হাতে ক্যাশ ফি গ্রহণ',
        badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        amountPrefix: '৳',
        amountClass: 'text-purple-300',
        isCredit: false,
      };
    case 'PENALTY':
      return {
        label: '⚠️ জরিমানা / পেনাল্টি',
        badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
        amountPrefix: '- ৳',
        amountClass: 'text-red-400',
        isCredit: false,
      };
    default:
      return {
        label: type,
        badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
        amountPrefix: '৳',
        amountClass: 'text-slate-200',
        isCredit: false,
      };
  }
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  metrics,
  transactions = [],
  users = [],
  currentAdmin,
  onRefreshData,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'monthly' | 'yearly'>('monthly');

  // Fetch Guest Meals for Financial Analytics
  const { data: allGuestMeals = [] } = useQuery({
    queryKey: ['financial_all_guest_meals'],
    queryFn: () => ApiService.getGuestMeals({}),
    staleTime: 5000,
  });

  const guestMealMetrics = useMemo(() => {
    let walletTotal = 0;
    let cashTotal = 0;
    let totalMeals = 0;
    allGuestMeals.forEach((gm) => {
      const amt = Number(gm.chargedAmount || 0);
      const count = (gm.breakfastCount || 0) + (gm.lunchCount || 0) + (gm.dinnerCount || 0);
      totalMeals += count;
      if (gm.paymentMethod === 'CASH') {
        cashTotal += amt;
      } else {
        walletTotal += amt;
      }
    });
    return { walletTotal, cashTotal, grandTotal: walletTotal + cashTotal, totalMeals };
  }, [allGuestMeals]);

  // Master Ledger Filter & Voucher States
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'ALL' | 'RECHARGE' | 'REFUND' | 'MEAL_DEDUCTION' | 'MONTHLY_CHARGE' | 'CASH_PAID'>('ALL');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<WalletTransaction | null>(null);
  const [showMonthlyAuditModal, setShowMonthlyAuditModal] = useState(false);

  // Dynamic Month & Year Options Generation
  const monthOptions = useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
      list.push(label);
    }
    return list;
  }, []);

  // Monthly Fee State
  const [feeTargetUser, setFeeTargetUser] = useState<string>('ALL');
  const [feeMethod, setFeeMethod] = useState<'WALLET_DEDUCTION' | 'CASH_HAND_TO_HAND'>('WALLET_DEDUCTION');
  const [feeAmount, setFeeAmount] = useState<number>(500);
  const [feeMonthYear, setFeeMonthYear] = useState<string>(monthOptions[0] || 'চলতি মাস');
  const [feeSubmitting, setFeeSubmitting] = useState(false);

  // Monthly Fee Status Tracker
  const [feeCheckMonth, setFeeCheckMonth] = useState<string>(monthOptions[0] || 'চলতি মাস');

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

  // Timeframe and Type Filtered Master Transactions
  const filteredMasterTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((tx) => {
      const txDateObj = new Date(tx.date);
      const txDateStr = txDateObj.toISOString().split('T')[0];

      // 1. Timeframe Filter
      if (filterPeriod === 'today' && txDateStr !== todayStr) {
        return false;
      }
      if (filterPeriod === 'monthly' && (txDateObj.getMonth() !== currentMonth || txDateObj.getFullYear() !== currentYear)) {
        return false;
      }
      if (filterPeriod === 'yearly' && txDateObj.getFullYear() !== currentYear) {
        return false;
      }

      // 2. Type Filter
      if (ledgerTypeFilter !== 'ALL') {
        if (ledgerTypeFilter === 'RECHARGE' && !['RECHARGE', 'ADMIN_TOPUP', 'CREDIT'].includes(tx.type)) return false;
        if (ledgerTypeFilter === 'REFUND' && tx.type !== 'REFUND') return false;
        if (ledgerTypeFilter === 'MEAL_DEDUCTION' && !['MEAL_DEDUCTION', 'DEBIT'].includes(tx.type)) return false;
        if (ledgerTypeFilter === 'MONTHLY_CHARGE' && tx.type !== 'MONTHLY_CHARGE') return false;
        if (ledgerTypeFilter === 'CASH_PAID' && tx.type !== 'CASH_PAID') return false;
      }

      // 3. Search Term Filter
      if (ledgerSearch.trim()) {
        const query = ledgerSearch.toLowerCase().trim();
        const txUser = users.find((u) => u.id === tx.userId);
        const userName = txUser?.name.toLowerCase() || '';
        const userPhone = txUser?.phone.toLowerCase() || '';
        const desc = (tx.description || '').toLowerCase();
        const id = tx.id.toLowerCase();
        if (!userName.includes(query) && !userPhone.includes(query) && !desc.includes(query) && !id.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, users, filterPeriod, ledgerTypeFilter, ledgerSearch]);

  // Master Ledger Financial Summary Pills Calculations
  const ledgerStats = useMemo(() => {
    let recharges = 0;
    let refunds = 0;
    let mealDeductions = 0;
    let monthlyCharges = 0;

    filteredMasterTransactions.forEach((tx) => {
      if (['RECHARGE', 'ADMIN_TOPUP', 'CREDIT'].includes(tx.type)) {
        recharges += tx.amount;
      } else if (tx.type === 'REFUND') {
        refunds += tx.amount;
      } else if (['MEAL_DEDUCTION', 'DEBIT'].includes(tx.type)) {
        mealDeductions += tx.amount;
      } else if (tx.type === 'MONTHLY_CHARGE') {
        monthlyCharges += tx.amount;
      }
    });

    const netMealDeductions = Math.max(0, mealDeductions + monthlyCharges - refunds);

    return { recharges, refunds, mealDeductions, monthlyCharges, netMealDeductions };
  }, [filteredMasterTransactions]);

  // System-wide Global Double-Entry Accounting Audit Stats
  const globalAuditStats = useMemo(() => {
    let allInflow = 0;
    let allGrossDeduct = 0;
    let allRefunds = 0;

    transactions.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      if (['RECHARGE', 'ADMIN_TOPUP', 'CREDIT', 'CASH_PAID'].includes(tx.type)) {
        allInflow += amt;
      } else if (['MEAL_DEDUCTION', 'DEBIT', 'MONTHLY_CHARGE'].includes(tx.type)) {
        allGrossDeduct += amt;
      } else if (tx.type === 'REFUND') {
        allRefunds += amt;
      }
    });

    const totalInflow = allInflow || metrics.totalCollected || (metrics.totalWalletBalance + (metrics.grossDeductions || metrics.totalSpent || 0) - (metrics.totalRefunds || 0));
    const grossDeductions = allGrossDeduct || metrics.grossDeductions || metrics.totalSpent || 0;
    const totalRefunds = allRefunds || metrics.totalRefunds || 0;
    const realNetSpent = Math.max(0, grossDeductions - totalRefunds);
    const memberWalletReserve = metrics.totalWalletBalance || 0;

    const accountingVariance = Math.abs(totalInflow - (realNetSpent + memberWalletReserve));
    const isBalanced = accountingVariance < 1;

    return {
      totalInflow,
      grossDeductions,
      totalRefunds,
      realNetSpent,
      memberWalletReserve,
      accountingVariance: Math.round(accountingVariance * 100) / 100,
      isBalanced,
    };
  }, [transactions, metrics]);

  // Dynamic Timeframe Financial Metrics & Top Spenders (Subtracting Refunds from Gross Deductions)
  const timeframeMetrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const periodTx = transactions.filter((tx) => {
      const d = new Date(tx.date);
      const dStr = d.toISOString().split('T')[0];
      if (filterPeriod === 'today') return dStr === todayStr;
      if (filterPeriod === 'monthly') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (filterPeriod === 'yearly') return d.getFullYear() === currentYear;
      return true;
    });

    let collections = 0;
    let grossDeductions = 0;
    let refunds = 0;
    const userSpendMap = new Map<string, number>();

    periodTx.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      if (['RECHARGE', 'ADMIN_TOPUP', 'CREDIT', 'CASH_PAID'].includes(tx.type)) {
        collections += amt;
      } else if (['MEAL_DEDUCTION', 'DEBIT', 'MONTHLY_CHARGE'].includes(tx.type)) {
        grossDeductions += amt;
        if (tx.userId) {
          userSpendMap.set(tx.userId, (userSpendMap.get(tx.userId) || 0) + amt);
        }
      } else if (tx.type === 'REFUND') {
        refunds += amt;
        if (tx.userId) {
          userSpendMap.set(tx.userId, (userSpendMap.get(tx.userId) || 0) - amt);
        }
      }
    });

    const netExpenses = Math.max(0, grossDeductions - refunds);

    const topSpendersList = Array.from(userSpendMap.entries())
      .map(([userId, amt]) => {
        const u = users.find((usr) => usr.id === userId);
        return {
          name: u?.name || 'অজানা মেম্বার',
          phone: u?.phone || 'N/A',
          amount: Math.max(0, amt),
        };
      })
      .filter((s) => s.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const activeTopSpenders = topSpendersList.length > 0 ? topSpendersList : metrics.topSpenders || [];

    return {
      collections: collections || (filterPeriod === 'today' ? metrics.todayCollection : filterPeriod === 'monthly' ? metrics.monthlyCollection : metrics.yearlyCollection),
      grossDeductions,
      netExpenses: periodTx.length > 0 ? netExpenses : metrics.todayExpenses,
      netProfit: periodTx.length > 0 ? netExpenses : metrics.netProfit,
      topSpenders: activeTopSpenders,
      refunds,
    };
  }, [transactions, users, filterPeriod, metrics]);

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

    filteredMasterTransactions.forEach((tx) => {
      const txUser = users?.find((u) => u.id === tx.userId);
      const info = getTxTypeInfo(tx.type);

      const dateStr = new Date(tx.date).toLocaleString('bn-BD');
      const name = txUser ? txUser.name : 'অজানা মেম্বার';
      const phone = txUser ? txUser.phone : tx.userId;
      const desc = tx.description || '-';

      rows.push([
        `"${dateStr}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${phone.replace(/"/g, '""')}"`,
        `"${info.label}"`,
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
      
      {/* World-Class Printable Master Ledger Header (Visible ONLY on print) */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-black font-display tracking-tight uppercase">
              মেস ডাইনিং — সার্বিক লেনদেন মাস্টার লেজার ও ক্যাশ রেজিস্টার
            </h1>
            <p className="text-xs font-semibold text-gray-800 mt-1">
              মেসের সমস্ত মেম্বার রিচার্জ, মিল কর্তন, মিল বন্ধের রিফান্ড এবং আর্থিক হিসেব রেজিস্টার
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-black font-mono font-bold">
              <span>রিপোর্ট সময়কাল: {filterPeriod === 'today' ? 'আজকের' : filterPeriod === 'monthly' ? 'চলতি মাসের' : 'সর্বমোট'}</span>
              <span>|</span>
              <span>মোট রেকর্ড: {filteredMasterTransactions.length} টি</span>
              <span>|</span>
              <span>জেনারেটর: {currentAdmin?.name || 'মেস এডমিন'}</span>
            </div>
          </div>

          <div className="text-right border-2 border-black p-3 bg-gray-50 rounded">
            <div className="text-xs uppercase font-bold text-gray-700">মোট মেস ওয়ালেট ব্যালেন্স ফান্ড</div>
            <div className="text-2xl font-black text-black font-mono">৳{(metrics.totalWalletBalance || 0).toLocaleString()}</div>
            <div className="text-xs font-bold text-black border-t border-black mt-1 pt-0.5">
              অনুমোদিত মেম্বার: {users?.length || 0} জন
            </div>
          </div>
        </div>

        {/* Master Ledger Key Financial Metrics Strip (Print Only) */}
        <div className="mt-4 border border-black p-2.5 bg-gray-100 grid grid-cols-4 gap-2 text-xs font-mono font-bold text-black text-center">
          <div>ওয়ালেট জমা: ৳{ledgerStats.recharges.toLocaleString()}</div>
          <div>মিল রিফান্ড: ৳{ledgerStats.refunds.toLocaleString()}</div>
          <div>মিল কর্তন: ৳{ledgerStats.mealDeductions.toLocaleString()}</div>
          <div>মাসিক মেস ফি: ৳{ledgerStats.monthlyCharges.toLocaleString()}</div>
        </div>
      </div>

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
          {/* Refresh Data Button */}
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition"
              title="ডেটা রিফ্রেশ করুন"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

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
            onClick={() => setShowMonthlyAuditModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-xs text-purple-300 font-bold transition shadow-sm active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-purple-400" />
            <span>মাসিক অডিট মেমো</span>
          </button>
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
        {/* 1. Total Collections / Inflow */}
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
                value={timeframeMetrics.collections}
                prefix={BN.tkSymbol}
              />
            </span>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> মোট সংগৃহীত তহবিল (Inflow)
          </p>
        </div>

        {/* 2. Real Net Spent / Expense */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">
              {filterPeriod === 'today' ? 'আজকের প্রকৃত নিট খরচ' : filterPeriod === 'monthly' ? 'চলতি মাসের প্রকৃত নিট খরচ' : 'বার্ষিক প্রকৃত নিট খরচ'}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">
              <AnimatedNumber value={timeframeMetrics.netExpenses} prefix={BN.tkSymbol} />
            </span>
          </div>
          <p className="text-[10px] text-amber-300/80 mt-2 font-mono flex items-center gap-1">
            <span>(গ্রস ৳{timeframeMetrics.grossDeductions} - রিফান্ড ৳{timeframeMetrics.refunds})</span>
          </p>
        </div>

        {/* 3. Total Refunds (Net-Zero Reversals) */}
        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">মোট সমন্বয়কৃত রিফান্ড</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-cyan-300 font-mono">
              <AnimatedNumber value={timeframeMetrics.refunds} prefix={BN.tkSymbol} />
            </span>
          </div>
          <p className="text-[10px] text-cyan-400/80 mt-2 flex items-center gap-1 font-sans">
            <span>🔄 কর্তন + রিফান্ড = ৳০ নিট ব্যয় প্রভাব</span>
          </p>
        </div>

        {/* 4. Active Member Balances / Reserve */}
        <div className="glass-panel p-5 rounded-2xl border border-sky-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{BN.totalWalletBalance}</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">
              <AnimatedNumber value={metrics.totalWalletBalance} prefix={BN.tkSymbol} />
            </span>
          </div>
          <p className="text-[11px] text-sky-400/80 mt-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> মেম্বারদের বর্তমান অব্যবহৃত রিজার্ভ
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DOUBLE-ENTRY ACCOUNTING & ECONOMIC EQUILIBRIUM AUDIT CARD
          ═══════════════════════════════════════════════════════════ */}
      <div className="glass-panel p-6 rounded-3xl border border-sky-500/30 space-y-4 shadow-xl bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-slate-900/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-sky-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white font-display flex items-center gap-2">
                ডাবল-এন্ট্রি হিসাব সমীকরণ ও অর্থনৈতিক অডিট স্থিতি (Economic Equilibrium)
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                সিস্টেমের মোট সংগৃহীত তহবিল, প্রকৃত নিট ব্যয় এবং মেম্বার ওয়ালেট ব্যালেন্সের নিখুঁত গাণিতিক সমতা
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {globalAuditStats.isBalanced ? (
              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>হিসাব ১০০% ব্যালেন্সড ও নির্ভুল</span>
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>পার্থক্য: ৳{globalAuditStats.accountingVariance}</span>
              </span>
            )}
          </div>
        </div>

        {/* Double-Entry Equation Visual Strip */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center text-center font-mono">
          {/* Box 1: Total Inflow */}
          <div className="md:col-span-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-left">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">১. মোট সংগৃহীত তহবিল (Inflow)</span>
            <span className="text-xl font-black text-white mt-1 block">
              ৳{globalAuditStats.totalInflow.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-300/80 font-sans mt-0.5 block">রিচার্জ + টপআপ + ক্যাশ ফি</span>
          </div>

          {/* Equals Symbol */}
          <div className="text-2xl font-black text-slate-500 md:col-span-1 flex items-center justify-center">
            =
          </div>

          {/* Box 2: Real Net Spent */}
          <div className="md:col-span-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left">
            <span className="text-[10px] text-amber-400 uppercase font-bold block">২. প্রকৃত নিট খরচ (Real Spent)</span>
            <span className="text-xl font-black text-white mt-1 block">
              ৳{globalAuditStats.realNetSpent.toLocaleString()}
            </span>
            <span className="text-[10px] text-amber-300/80 font-sans mt-0.5 block">
              গ্রস ৳{globalAuditStats.grossDeductions.toLocaleString()} - রিফান্ড ৳{globalAuditStats.totalRefunds.toLocaleString()}
            </span>
          </div>

          {/* Plus Symbol */}
          <div className="text-2xl font-black text-slate-500 md:col-span-1 flex items-center justify-center">
            +
          </div>

          {/* Box 3: Wallet Reserves */}
          <div className="md:col-span-1 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-left">
            <span className="text-[10px] text-sky-400 uppercase font-bold block">৩. মেম্বার ব্যালেন্স</span>
            <span className="text-xl font-black text-white mt-1 block">
              ৳{globalAuditStats.memberWalletReserve.toLocaleString()}
            </span>
            <span className="text-[10px] text-sky-300/80 font-sans mt-0.5 block">ওয়ালেট রিজার্ভ</span>
          </div>
        </div>

        {/* Economic Accounting Guidance Note */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-slate-200">অর্থনৈতিক নীতি (Economics Law):</strong> একই মিলের কর্তন (Deduction) ও রিফান্ড (Refund) হওয়া মানে নিট লেনদেন ৳০ (Net Zero Transaction)। মেস এডমিন সর্বদা রিয়েল-টাইমে সঠিক ব্যয়, কালেকশন এবং অবশিষ্ট তহবিলের স্বচ্ছতা দেখতে পাবেন।
          </span>
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
              <p className="text-xs text-slate-400">কোন সদস্য ফি দিয়েছেন আর কে বকেয়া আছেন তা দেখুন</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={feeCheckMonth}
              onChange={e => setFeeCheckMonth(e.target.value)}
              className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold focus:border-emerald-500 focus:outline-none min-w-[160px]"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  📅 {m}
                </option>
              ))}
            </select>
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
              <p className="text-[10px] text-rose-300 font-bold">ফি বকেয়া আছেন</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3 col-span-2 sm:col-span-1">
            <Users className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-2xl font-extrabold text-slate-300 font-mono">{feeStatusReport.length}</p>
              <p className="text-[10px] text-slate-400 font-bold">মোট সক্রিয় সদস্য</p>
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
                  <th className="p-3.5">ওয়ালেট</th>
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
                          <XCircle className="w-3 h-3" /> বকেয়া আছেন
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
            <p className="text-slate-500 text-sm">কোনো সক্রিয় সদস্য পাওয়া যায়নি।</p>
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
              <select
                value={feeMonthYear}
                onChange={(e) => {
                  setFeeMonthYear(e.target.value);
                  setFeeCheckMonth(e.target.value);
                }}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-cyan-300 font-bold focus:border-cyan-500 focus:outline-none"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    📅 {m}
                  </option>
                ))}
              </select>
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
                <span className="text-cyan-300 font-mono">৳{(metrics.permanentRevenue || 0).toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-500 to-sky-400 h-full w-[80%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">{BN.guestRevenue} (মোট অতিরিক্ত গেস্ট মিল)</span>
                <span className="text-amber-300 font-mono">৳{guestMealMetrics.grandTotal.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full w-[45%]" />
              </div>
              <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-mono bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <span>💳 ওয়ালেট: ৳{guestMealMetrics.walletTotal}</span>
                <span>💵 ক্যাশ: ৳{guestMealMetrics.cashTotal}</span>
                <span>🍽️ মোট মিল: {guestMealMetrics.totalMeals}টি</span>
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
              {BN.topSpenders} (নিট খরচ)
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {filterPeriod === 'today' ? 'আজকের' : filterPeriod === 'monthly' ? 'চলতি মাস' : 'বার্ষিক'}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {timeframeMetrics.topSpenders && timeframeMetrics.topSpenders.length > 0 ? (
              timeframeMetrics.topSpenders.map((user, i) => (
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
                    <p className="text-[10px] text-slate-400">নিট খরচ (রিফান্ড সমন্বিত)</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                নির্বাচিত সময়কালে কোনো মেম্বারের খরচের ইতিহাস পাওয়া যায়নি
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ALL SYSTEM TRANSACTIONS MASTER LEDGER TABLE & SEARCH HUB
          ═══════════════════════════════════════════════════════════ */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-white font-display flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              সকল সদস্যের সার্বিক লেনদেন রেজিস্টার (All Transactions Ledger)
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              সিস্টেমের সমস্ত মেম্বার রিচার্জ, মিল কর্তন, মিল বন্ধের রিফান্ড এবং মাসিক ফি রেকর্ড
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-1.5 transition print:hidden"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট মাস্টার লেজার</span>
            </button>
          </div>
        </div>

        {/* Master Ledger Filters & Search Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              placeholder="মেম্বার নাম, ফোন অথবা বিবরণ দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          {/* Transaction Type Selector Filter */}
          <div className="sm:col-span-6 flex items-center gap-2">
            <div className="relative w-full">
              <Filter className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value as any)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-cyan-300 font-bold text-xs focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">সব ধরণের লেনদেন (All Category)</option>
                <option value="RECHARGE">➕ ওয়ালেট রিচার্জ (Recharges)</option>
                <option value="REFUND">🔄 মিল বন্ধের টাকা রিফান্ড (Meal Off Refunds)</option>
                <option value="MEAL_DEDUCTION">➖ মিল কর্তন (Meal Deductions)</option>
                <option value="MONTHLY_CHARGE">📋 মাসিক ফি কর্তন (Monthly Charges)</option>
                <option value="CASH_PAID">🤝 হাতে ক্যাশ ফি গ্রহণ (Cash Received)</option>
              </select>
            </div>

            {ledgerSearch || ledgerTypeFilter !== 'ALL' ? (
              <button
                onClick={() => {
                  setLedgerSearch('');
                  setLedgerTypeFilter('ALL');
                }}
                className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
                title="ফিল্টার রিসেট"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Master Ledger Filtered Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-400 font-semibold block">মোট ওয়ালেট রিচার্জ (জমা)</span>
            <span className="text-lg font-bold text-emerald-300 font-mono mt-0.5 block">
              + ৳{ledgerStats.recharges.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-[10px] text-cyan-300 font-semibold block">মিল রিফান্ড সমন্বয় (রিভার্সাল)</span>
            <span className="text-lg font-bold text-cyan-200 font-mono mt-0.5 block">
              + ৳{ledgerStats.refunds.toLocaleString()}
            </span>
            <span className="text-[9px] text-cyan-400/80 font-mono">Net ৳০ প্রভাব</span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-[10px] text-rose-400 font-semibold block">মোট গ্রস কর্তন</span>
            <span className="text-lg font-bold text-rose-300 font-mono mt-0.5 block">
              - ৳{(ledgerStats.mealDeductions + ledgerStats.monthlyCharges).toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px] text-amber-400 font-semibold block">প্রকৃত নিট মিল ব্যয়</span>
            <span className="text-lg font-bold text-amber-300 font-mono mt-0.5 block">
              ৳{ledgerStats.netMealDeductions.toLocaleString()}
            </span>
            <span className="text-[9px] text-amber-300/80 font-mono">গ্রস - রিফান্ড</span>
          </div>
        </div>

        {/* Master Ledger Table */}
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
                <th className="p-3.5 font-bold text-center">রসিদ / অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
              {filteredMasterTransactions.length > 0 ? (
                filteredMasterTransactions.map((tx) => {
                  const txUser = users?.find(u => u.id === tx.userId);
                  const typeInfo = getTxTypeInfo(tx.type);

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTxForReceipt(tx)}
                      className="hover:bg-slate-900/80 cursor-pointer transition-colors group"
                    >
                      <td className="p-3.5 font-mono text-slate-400">
                        {new Date(tx.date).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="p-3.5 font-bold text-white">
                        {txUser ? txUser.name : 'অজানা মেম্বার'}
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">{txUser?.phone || tx.userId}</span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${typeInfo.badgeClass}`}>
                          {typeInfo.label}
                        </span>
                        {tx.type === 'REFUND' && (
                          <span className="block text-[9px] text-cyan-400 font-mono mt-0.5">
                            (রিভার্সাল: Net ৳০ প্রভাব)
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-300 font-sans max-w-xs truncate">
                        {tx.description || '-'}
                      </td>

                      <td className={`p-3.5 text-right font-mono font-bold ${typeInfo.amountClass}`}>
                        {typeInfo.amountPrefix}{tx.amount}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-slate-200">
                        ৳{tx.balanceAfter}
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxForReceipt(tx);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/20 text-[10px] font-bold inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>রসিদ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    কোনো মিলপ্রসঙ্গ বা লেনদেন রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Formal Master Ledger Audit Signature Block (Print Only) */}
        <div className="hidden print:block pt-10 mt-8 print-avoid-break border-t border-black">
          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="border-t border-black pt-1 font-bold text-black w-40 mx-auto">
                হিসাব প্রস্তুতকারী (Prepared By)
              </div>
              <p className="text-[9pt] text-gray-700 mt-0.5">স্বাক্ষর: ....................................</p>
            </div>
            <div>
              <div className="border-t border-black pt-1 font-bold text-black w-40 mx-auto">
                মেস অডিটর / ক্যাশিয়ার (Auditor)
              </div>
              <p className="text-[9pt] text-gray-700 mt-0.5">স্বাক্ষর: ....................................</p>
            </div>
            <div>
              <div className="border-t border-black pt-1 font-bold text-black w-40 mx-auto">
                মেস প্রেসিডেন্ট / এডমিন (Admin)
              </div>
              <p className="text-[9pt] text-gray-700 mt-0.5">স্বাক্ষর: ....................................</p>
            </div>
          </div>

          <div className="mt-6 text-center text-[8pt] text-gray-600 border-t border-gray-300 pt-2 font-mono">
            মেস ম্যানেজমেন্ট মাস্টার লেজার রেজিস্টার | প্রিন্টিং তারিখ ও সময়: {new Date().toLocaleString('bn-BD')}
          </div>
        </div>

      </div>

      {/* Digital Receipt Modal Voucher */}
      <ReceiptModal
        transaction={selectedTxForReceipt}
        user={users.find((u) => u.id === selectedTxForReceipt?.userId) || null}
        admin={currentAdmin}
        onClose={() => setSelectedTxForReceipt(null)}
      />

      {/* MODAL: Monthly Financial Settlement & Audit Statement */}
      {showMonthlyAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/40 max-w-4xl w-full shadow-2xl space-y-6 animate-scale-in my-8 print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:border-black">
              <div>
                <h3 className="text-xl font-extrabold text-white font-display print:text-black flex items-center gap-2">
                  📋 মেস ডাইনিং — মাসিক ফাইনান্সিয়াল অডিট ও ক্লোজিং সেটেলমেন্ট মেমো
                </h3>
                <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
                  মেসের আয়-ব্যয়, ওয়ালেট জমা, সদস্য অডিট ও সমাপনী ক্লোজিং হিসেব
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 text-xs font-bold transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট অডিট মেমো</span>
                </button>
                <button onClick={() => setShowMonthlyAuditModal(false)} className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Audit Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 print:border-black print:bg-gray-100">
                <span className="text-slate-400 print:text-black block font-bold">মোট মেস ফান্ড ব্যালেন্স</span>
                <span className="text-lg font-extrabold text-cyan-400 print:text-black font-mono">৳{(metrics.totalWalletBalance || 0).toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 print:border-black print:bg-gray-100">
                <span className="text-slate-400 print:text-black block font-bold">মোট জমা কালেকশন</span>
                <span className="text-lg font-extrabold text-emerald-400 print:text-black font-mono">৳{(metrics.monthlyCollection || 0).toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 print:border-black print:bg-gray-100">
                <span className="text-slate-400 print:text-black block font-bold">মোট মিল খাবার খরচ</span>
                <span className="text-lg font-extrabold text-rose-400 print:text-black font-mono">৳{ledgerStats.mealDeductions.toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 print:border-black print:bg-gray-100">
                <span className="text-slate-400 print:text-black block font-bold">মোট মেস ফি কালেকশন</span>
                <span className="text-lg font-extrabold text-amber-400 print:text-black font-mono">৳{ledgerStats.monthlyCharges.toLocaleString()}</span>
              </div>
            </div>

            {/* Printable Audit Notice Banner */}
            <div className="hidden print:block p-3 border-2 border-black bg-gray-100 text-black text-xs font-bold font-sans">
              অডিট সারসংক্ষেপ: উক্ত অডিট রিপোর্টটি মেস কমিটি কর্তৃক প্রস্তাবিত এবং নিবন্ধিত সকল মেম্বারদের ওয়ালেট লেনদেন যাচাই সাপেক্ষে চুরান্ত করা হয়েছে।
            </div>

            {/* All Members Audit Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-black">
              <table className="w-full text-left text-xs border border-black border-collapse">
                <thead className="bg-slate-900/90 text-slate-300 uppercase text-[10px] font-mono border-b border-slate-800 print:bg-gray-100 print:text-black print:border-black">
                  <tr>
                    <th className="p-3 font-bold border border-black">ক্রঃ</th>
                    <th className="p-3 font-bold border border-black">মেম্বারের নাম ও ফোন</th>
                    <th className="p-3 font-bold border border-black">রুম ও সিট</th>
                    <th className="p-3 font-bold border border-black">ধরণ</th>
                    <th className="p-3 font-bold text-right border border-black">সমাপনী ব্যালেন্স</th>
                    <th className="p-3 font-bold text-center border border-black">অডিট স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {users.map((u, index) => (
                    <tr key={u.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                      <td className="p-3 font-mono text-slate-400 print:text-black border border-black">{index + 1}</td>
                      <td className="p-3 font-bold text-white print:text-black border border-black">
                        {u.name}
                        <span className="block text-[10px] text-slate-400 print:text-black font-normal font-mono">{u.phone}</span>
                      </td>
                      <td className="p-3 text-slate-300 print:text-black font-mono border border-black font-bold">
                        {u.profile?.roomNumber ? `রুম ${u.profile.roomNumber}` : 'N/A'} {u.profile?.seatNumber ? `(${u.profile.seatNumber})` : ''}
                      </td>
                      <td className="p-3 text-slate-300 print:text-black border border-black">
                        {u.userType === 'PERMANENT' ? 'স্থায়ী' : 'অতিথি'}
                      </td>
                      <td className={`p-3 text-right font-mono font-bold border border-black ${u.walletBalance < 0 ? 'text-rose-400 print:text-black' : 'text-emerald-400 print:text-black'}`}>
                        ৳{u.walletBalance}
                      </td>
                      <td className="p-3 text-center border border-black">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border print:bg-white print:text-black print:border-black ${
                          u.walletBalance < 0
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : u.walletBalance < 100
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {u.walletBalance < 0 ? '🚨 নেগেটিভ' : u.walletBalance < 100 ? '⚠️ লো ব্যালেন্স' : '✅ সঠিক'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4-Column Audit Signature Section */}
            <div className="hidden print:block pt-10 mt-6 print-avoid-break border-t border-black">
              <div className="grid grid-cols-4 gap-4 text-center text-xs">
                <div>
                  <div className="border-t border-black pt-1 font-bold text-black text-[9pt]">
                    অডিট সদস্য ১
                  </div>
                  <p className="text-[8pt] text-gray-700 mt-0.5">স্বাক্ষর: ....................</p>
                </div>
                <div>
                  <div className="border-t border-black pt-1 font-bold text-black text-[9pt]">
                    অডিট সদস্য ২
                  </div>
                  <p className="text-[8pt] text-gray-700 mt-0.5">স্বাক্ষর: ....................</p>
                </div>
                <div>
                  <div className="border-t border-black pt-1 font-bold text-black text-[9pt]">
                    ক্যাশিয়ার / ট্র্যাজারার
                  </div>
                  <p className="text-[8pt] text-gray-700 mt-0.5">স্বাক্ষর: ....................</p>
                </div>
                <div>
                  <div className="border-t border-black pt-1 font-bold text-black text-[9pt]">
                    মেস সভাপতি / এডমিন
                  </div>
                  <p className="text-[8pt] text-gray-700 mt-0.5">স্বাক্ষর: ....................</p>
                </div>
              </div>

              <div className="mt-6 text-center text-[8pt] text-gray-600 border-t border-gray-300 pt-2 font-mono">
                মেস ডাইনিং ম্যানেজমেন্ট সফটওয়্যার — মাসিক অডিট ও ফাইনান্সিয়াল ক্লোজিং রিপোর্ট | জেনারেশন সময়: {new Date().toLocaleString('bn-BD')}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

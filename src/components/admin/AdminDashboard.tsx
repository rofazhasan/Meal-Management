'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ShieldAlert, UserCheck, Utensils, Wallet, AlertOctagon, Check, X, PlusCircle, Sparkles, ChevronRight, Printer, TriangleAlert, UserX, SlidersHorizontal, KeyRound, Send, CheckCircle2, XCircle } from 'lucide-react';
import { User, MealRateConfig, EmergencyClosure, WalletTransaction, MealDeclaration, RechargeRequest } from '../../types';
import { BN } from '../../constants/banglaText';
import { StatusBadge } from '../common/StatusBadge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { ApiService } from '../../services/apiService';
import { ReceiptModal } from '../common/ReceiptModal';
import { getBangladeshDateStr } from '../../utils/dateUtils';
import { getUserMealStateForDate } from '../../utils/mealUtils';

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
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [receiptTx, setReceiptTx] = useState<WalletTransaction | null>(null);
  const [receiptUser, setReceiptUser] = useState<User | null>(null);

  useEffect(() => {
    fetchRechargeRequests();
  }, []);

  const fetchRechargeRequests = async () => {
    try {
      const reqs = await ApiService.getRechargeRequests();
      setRechargeRequests(reqs.filter(r => r.status === 'PENDING'));
    } catch {
      // Fallback
    }
  };

  const handleApproveRecharge = async (requestId: string) => {
    try {
      const { request, transaction } = await ApiService.approveRechargeRequest(requestId, currentAdmin.id);
      const targetUser = users.find(u => u.id === request.userId) || {
        id: request.userId,
        name: request.userName,
        phone: request.userPhone,
        role: 'USER',
        userType: 'PERMANENT',
        status: 'APPROVED',
        walletBalance: request.amount,
        createdAt: new Date().toISOString(),
      } as User;

      setReceiptUser(targetUser);
      setReceiptTx(transaction);
      alert(`✅ ৳${request.amount} মেম্বার ${request.userName}-এর ওয়ালেটে যোগ করা হয়েছে এবং ডিজিটাল রসিদ জেনারেট হয়েছে!`);
      onRefreshData();
      fetchRechargeRequests();
    } catch (err: any) {
      alert(`অনুমোদন করতে ব্যর্থ: ${err.message}`);
    }
  };

  const handleRejectRecharge = async (requestId: string) => {
    const reason = prompt('বাতিলের কারণ উল্লেখ করুন (ঐচ্ছিক):', 'তথ্য সঠিক পাওয়া যায়নি') || '';
    try {
      await ApiService.rejectRechargeRequest(requestId, currentAdmin.id, reason);
      alert('রিকুয়েস্টটি বাতিল করা হয়েছে।');
      fetchRechargeRequests();
    } catch (err: any) {
      alert(`বাতিল করতে সমস্যা হয়েছে: ${err.message}`);
    }
  };

  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const activeUsers = users.filter(u => u.status === 'APPROVED');
  const passwordResetUsers = users.filter(u => u.isPasswordResetRequested);
  const totalWalletSum = users.reduce((acc, u) => acc + u.walletBalance, 0);

  const handleApproveReset = async (userId: string) => {
    try {
      await ApiService.approvePasswordReset(currentAdmin.id, userId, '123');
      alert('পাসওয়ার্ড রিসেট অনুমোদন করা হয়েছে! উক্ত সদস্যের পাসওয়ার্ড 123 সেট হয়েছে।');
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে');
    }
  };

  const handleRejectReset = async (userId: string) => {
    try {
      await ApiService.rejectPasswordReset(currentAdmin.id, userId);
      alert('পাসওয়ার্ড রিসেট অনুরোধ বাতিল করা হয়েছে');
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'বাতিল করতে সমস্যা হয়েছে');
    }
  };

  const todayStr = getBangladeshDateStr();

  const emergencyToday = emergencies.find(em => {
    const start = em.date;
    const end = em.endDate || em.date;
    return todayStr >= start && todayStr <= end;
  });

  let todayBreakfasts = 0;
  let todayLunches = 0;
  let todayDinners = 0;

  activeUsers.forEach((u) => {
    const dec = declarations.find((d) => d.userId === u.id && d.date === todayStr);
    const state = getUserMealStateForDate(u, todayStr, dec, rates, emergencyToday);
    if (state.breakfast) todayBreakfasts++;
    if (state.lunch) todayLunches++;
    if (state.dinner) todayDinners++;
  });

  // Emergency Off Form state (Supports Date Range)
  const [emergencyStartDate, setEmergencyStartDate] = useState(todayStr);
  const [emergencyEndDate, setEmergencyEndDate] = useState(todayStr);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  // ── Meal-Off Report State ────────────────────────────────────────
  const [reportDate, setReportDate] = useState(todayStr);

  // Compute meal-off report for reportDate
  const mealOffReport = useCallback(() => {
    const reportDecs = declarations.filter(d => d.date === reportDate);
    const minPermRate = Math.min(
      rates.permanent.breakfast,
      rates.permanent.lunch,
      rates.permanent.dinner,
    );
    const minGuestRate = Math.min(
      rates.guest.breakfast,
      rates.guest.lunch,
      rates.guest.dinner,
    );

    const emergencyOnDate = emergencies.find(em => {
      const start = em.date;
      const end = em.endDate || em.date;
      return reportDate >= start && reportDate <= end;
    });

    type ReportRow = {
      user: User;
      dec: MealDeclaration | undefined;
      category: 'EMERGENCY_OFF' | 'INSUFFICIENT_BALANCE' | 'VOLUNTARILY_OFF' | 'PARTIAL_OFF';
      offMeals: string[];
    };

    const rows: ReportRow[] = [];

    for (const u of activeUsers) {
      const dec = reportDecs.find(d => d.userId === u.id);

      const isBEmergency = !!emergencyOnDate && emergencyOnDate.closedMeals.includes('breakfast');
      const isLEmergency = !!emergencyOnDate && emergencyOnDate.closedMeals.includes('lunch');
      const isDEmergency = !!emergencyOnDate && emergencyOnDate.closedMeals.includes('dinner');

      const isBOff = isBEmergency || (dec ? !dec.breakfast : true);
      const isLOff = isLEmergency || (dec ? !dec.lunch : true);
      const isDOff = isDEmergency || (dec ? !dec.dinner : true);

      const allOff = isBOff && isLOff && isDOff;
      const someOff = isBOff || isLOff || isDOff;

      if (!someOff) continue; // all meals ON — skip

      const offMeals: string[] = [];
      if (isBOff) offMeals.push('নাস্তা');
      if (isLOff) offMeals.push('দুপুর');
      if (isDOff) offMeals.push('রাত');

      const minRate = u.userType === 'PERMANENT' ? minPermRate : minGuestRate;
      const balanceTooLow = u.walletBalance < minRate;

      let category: ReportRow['category'];
      if (emergencyOnDate && (isBEmergency || isLEmergency || isDEmergency)) {
        category = 'EMERGENCY_OFF';
      } else if (allOff && balanceTooLow) {
        category = 'INSUFFICIENT_BALANCE';
      } else if (allOff) {
        category = 'VOLUNTARILY_OFF';
      } else {
        category = 'PARTIAL_OFF';
      }

      rows.push({ user: u, dec, category, offMeals });
    }

    return {
      isEmergencyOnDate: !!emergencyOnDate,
      emergencyReason: emergencyOnDate?.reason || '',
      emergencyOff: rows.filter(r => r.category === 'EMERGENCY_OFF'),
      insufficientBalance: rows.filter(r => r.category === 'INSUFFICIENT_BALANCE'),
      voluntarilyOff: rows.filter(r => r.category === 'VOLUNTARILY_OFF'),
      partialOff: rows.filter(r => r.category === 'PARTIAL_OFF'),
    };
  }, [declarations, reportDate, activeUsers, rates, emergencies]);

  const report = mealOffReport();

  const handlePrintReport = () => {
    const printStyle = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Hind Siliguri', sans-serif; background: #fff; color: #0f172a; padding: 24px; }
        h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
        .section { margin-bottom: 22px; }
        .section-title { font-size: 13px; font-weight: 700; padding: 6px 10px; border-radius: 6px; margin-bottom: 8px; }
        .red { background: #fee2e2; color: #991b1b; }
        .yellow { background: #fef9c3; color: #854d0e; }
        .blue { background: #dbeafe; color: #1e40af; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f1f5f9; padding: 7px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .badge-red { background: #fee2e2; color: #991b1b; padding: 2px 7px; border-radius: 99px; font-size: 10px; font-weight: 700; }
        .badge-yellow { background: #fef9c3; color: #854d0e; padding: 2px 7px; border-radius: 99px; font-size: 10px; font-weight: 700; }
        .badge-blue { background: #dbeafe; color: #1e40af; padding: 2px 7px; border-radius: 99px; font-size: 10px; font-weight: 700; }
        .empty { color: #94a3b8; font-size: 12px; padding: 8px 10px; }
        footer { margin-top: 28px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    `;
    const allRows = [
      ...report.emergencyOff,
      ...report.insufficientBalance,
      ...report.voluntarilyOff,
      ...report.partialOff,
    ];
    const tableRows = allRows.map(r => `
      <tr>
        <td>${r.user.name}</td>
        <td class="mono">${r.user.phone}</td>
        <td class="mono">৳${r.user.walletBalance}</td>
        <td>${r.offMeals.join(', ')}</td>
        <td>${
          r.category === 'EMERGENCY_OFF'
            ? '<span class="badge-red">🚨 জরুরি বন্ধ</span>'
            : r.category === 'INSUFFICIENT_BALANCE'
            ? '<span class="badge-red">ব্যালেন্স স্বল্পতা</span>'
            : r.category === 'VOLUNTARILY_OFF'
            ? `<span class="badge-yellow">${r.user.isIndefinitelyPaused ? 'অনির্দিষ্ট বিরতি' : 'স্বেচ্ছায় বন্ধ'}</span>`
            : '<span class="badge-blue">আংশিক বন্ধ</span>'
        }</td>
      </tr>
    `).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${printStyle}<title>মিল বন্ধ রিপোর্ট - ${reportDate}</title></head><body>
      <h1>মিল বন্ধ সদস্য রিপোর্ট</h1>
      <p class="meta">তারিখ: ${reportDate} &nbsp;|&nbsp; মোট বন্ধ: ${allRows.length} জন &nbsp;|&nbsp; মুদ্রণের সময়: ${new Date().toLocaleString('bn-BD')}</p>
      <div class="section">
        <div class="section-title red">🔴 ব্যালেন্স স্বল্পতার কারণে বন্ধ (${report.insufficientBalance.length} জন)</div>
        ${report.insufficientBalance.length === 0 ? '<p class="empty">কেউ নেই।</p>' : ''}
      </div>
      <div class="section">
        <div class="section-title yellow">🟡 স্বেচ্ছায় / অনির্দিষ্ট বিরতিতে বন্ধ (${report.voluntarilyOff.length} জন)</div>
        ${report.voluntarilyOff.length === 0 ? '<p class="empty">কেউ নেই।</p>' : ''}
      </div>
      <div class="section">
        <div class="section-title blue">🔵 আংশিক বন্ধ (${report.partialOff.length} জন)</div>
        ${report.partialOff.length === 0 ? '<p class="empty">কেউ নেই।</p>' : ''}
      </div>
      ${allRows.length > 0 ? `
      <table>
        <thead><tr><th>নাম</th><th>ফোন</th><th>ওয়ালেট</th><th>বন্ধ মিল</th><th>কারণ</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>` : '<p class="empty">নির্বাচিত তারিখে কোনো মেম্বারের মিল বন্ধ নেই।</p>'}
      <footer>মিল ম্যানেজার সিস্টেম — অ্যাডমিন প্রিন্ট রিপোর্ট</footer>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 400);
    }
  };

  // Quick Top-up Modal State
  const [topUpUser, setTopUpUser] = useState<User | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(500);
  const [topUpNote, setTopUpNote] = useState('ক্যাশ ডিপোজিট');

  const handleApprove = async (userId: string) => {
    await ApiService.updateUserStatus(userId, 'APPROVED', currentAdmin.id);
    onRefreshData();
  };

  const handleReject = async (userId: string) => {
    await ApiService.updateUserStatus(userId, 'REJECTED', currentAdmin.id);
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
      await ApiService.addEmergency({ date: emergencyStartDate, endDate: emergencyEndDate, reason: emergencyReason, closedMeals: ['breakfast', 'lunch', 'dinner'] });
      setEmergencyReason('');
      alert(`জরুরি মিল বন্ধ নোটিশ (${emergencyStartDate} থেকে ${emergencyEndDate}) সফলভাবে পোস্ট করা হয়েছে!`);
      onRefreshData();
    } finally {
      setEmergencySubmitting(false);
    }
  };

  const handleConfirmTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpUser || topUpAmount <= 0) return;
    await ApiService.addWalletBalance(topUpUser.id, topUpAmount, currentAdmin.id, topUpNote);
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
            <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-xs sm:text-sm font-bold text-emerald-400">
              <span className="bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">নাস্তা: {todayBreakfasts}</span>
              <span className="bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20 text-sky-400">দুপুর: {todayLunches}</span>
              <span className="bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20 text-purple-400">রাত: {todayDinners}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 font-sans">সক্রিয় ডিক্লারেশন</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
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
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Pending User Recharge Requests Hub */}
      {rechargeRequests.length > 0 && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-emerald-500/40 space-y-4 shadow-xl shadow-emerald-950/20 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900 animate-scale-in">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base font-display flex items-center gap-2">
                  📥 মুলতুবি রিচার্জ রিকুয়েস্টসমূহ <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">{rechargeRequests.length} টি</span>
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  মেম্বারদের পাঠানো টাকা পাওয়ার পর অনুমোদন করুন
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {rechargeRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-500/30 transition-all shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-amber-400 font-display shrink-0">
                    {req.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-100 text-sm">{req.userName}</h4>
                      <span className="text-xs font-mono text-slate-400">({req.userPhone})</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
                        {req.paymentMethod}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="text-emerald-400 font-extrabold text-base font-mono">৳{req.amount}</span>
                      {req.trxId && <span className="text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">TrxID: {req.trxId}</span>}
                    </div>

                    {req.note && (
                      <p className="text-xs text-amber-300/90 italic mt-1 font-sans">
                        💬 "{req.note}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleRejectRecharge(req.id)}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all active:scale-95 flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>বাতিল</span>
                  </button>

                  <button
                    onClick={() => handleApproveRecharge(req.id)}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5 font-display"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>অনুমোদন ও রসিদ তৈরি</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Password Reset Requests Section */}
      {passwordResetUsers.length > 0 && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-amber-500/40 space-y-4 shadow-xl shadow-amber-950/20 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base font-display flex items-center gap-2">
                পাসওয়ার্ড রিসেট অনুরোধসমুহ ({passwordResetUsers.length} টি)
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                অনুমোদন করলে মেম্বারের পাসওয়ার্ড রিসেট হয়ে <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-400 font-mono font-bold">123</code> সেট হবে
              </p>
            </div>
          </div>

          <div className="overflow-x-auto touch-pan-x rounded-2xl border border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-300 min-w-[500px]">
              <thead className="bg-slate-900/90 uppercase text-[10px] text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3.5">সদস্যের নাম</th>
                  <th className="p-3.5">মোবাইল নম্বর</th>
                  <th className="p-3.5">অনুরোধের সময়</th>
                  <th className="p-3.5 text-right">একশন (রিসেট to 123)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-sans">
                {passwordResetUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3.5 font-bold text-slate-100 whitespace-nowrap">{u.name}</td>
                    <td className="p-3.5 font-mono text-cyan-300 whitespace-nowrap">{u.phone}</td>
                    <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                      {u.passwordResetRequestedAt ? new Date(u.passwordResetRequestedAt).toLocaleTimeString('bn-BD') : 'অনুরোধ করা হয়েছে'}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleApproveReset(u.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        অনুমোদন (Reset to 123)
                      </button>
                      <button
                        onClick={() => handleRejectReset(u.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                        বাতিল
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

          <div className="overflow-x-auto touch-pan-x rounded-2xl border border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-300 min-w-[450px]">
              <thead className="bg-slate-900/90 uppercase text-[10px] text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3.5">নাম</th>
                  <th className="p-3.5">ফোন</th>
                  <th className="p-3.5">ধরণ</th>
                  <th className="p-3.5 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {pendingUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3.5 font-bold text-slate-100 whitespace-nowrap">{u.name}</td>
                    <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap">{u.phone}</td>
                    <td className="p-3.5 whitespace-nowrap"><StatusBadge userType={u.userType} /></td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">বন্ধ শুরুর তারিখ</label>
                <input
                  type="date"
                  required
                  value={emergencyStartDate}
                  onChange={(e) => {
                    setEmergencyStartDate(e.target.value);
                    if (e.target.value > emergencyEndDate) setEmergencyEndDate(e.target.value);
                  }}
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">বন্ধ শেষের তারিখ (রেঞ্জ)</label>
                <input
                  type="date"
                  required
                  value={emergencyEndDate}
                  min={emergencyStartDate}
                  onChange={(e) => setEmergencyEndDate(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">{BN.closureReason}</label>
              <input
                type="text"
                required
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                placeholder="যেমন: গ্যাস সংযোগ মেরামতের কারণে সব মিল বন্ধ"
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={emergencySubmitting}
              className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-rose-600/30 active:scale-95 font-display"
            >
              {emergencySubmitting ? 'প্রসেসিং...' : 'জরুরি বন্ধ নোটিশ জারি করুন'}
            </button>
          </form>

          {/* Active Emergency Closures */}
          {emergencies.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs font-bold text-slate-400 mb-2 font-sans">সর্বশেষ জরুরি বন্ধ নোটিশসমূহ:</p>
              <div className="space-y-2">
                {emergencies.map((em) => (
                  <div key={em.id} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                    <p className="font-bold text-rose-300 font-mono">
                      {em.date} {em.endDate && em.endDate !== em.date ? `থেকে ${em.endDate}` : ''}: {em.reason}
                    </p>
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

      {/* ═══════════════════════════════════════════════════════════
          MEAL-OFF MEMBERS REPORT
          ═══════════════════════════════════════════════════════════ */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-5 shadow-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <UserX className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base font-display">মিল বন্ধ সদস্য রিপোর্ট</h3>
              <p className="text-xs text-slate-400 font-sans">কোন সদস্যের মিল কেন বন্ধ তার বিস্তারিত তালিকা</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                className="bg-transparent text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-slate-100 border border-slate-600/60 font-bold text-xs transition-all shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              প্রিন্ট করুন
            </button>
          </div>
        </div>

        {/* Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
            <p className="text-2xl font-extrabold text-rose-400 font-mono">{report.emergencyOff.length}</p>
            <p className="text-[10px] text-rose-300 font-bold mt-0.5">🚨 জরুরি বন্ধ</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
            <p className="text-2xl font-extrabold text-rose-400 font-mono">{report.insufficientBalance.length}</p>
            <p className="text-[10px] text-rose-300 font-bold mt-0.5">ব্যালেন্স স্বল্পতা</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-2xl font-extrabold text-amber-400 font-mono">{report.voluntarilyOff.length}</p>
            <p className="text-[10px] text-amber-300 font-bold mt-0.5">স্বেচ্ছায় বন্ধ</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
            <p className="text-2xl font-extrabold text-sky-400 font-mono">{report.partialOff.length}</p>
            <p className="text-[10px] text-sky-300 font-bold mt-0.5">আংশিক বন্ধ</p>
          </div>
        </div>

        {report.isEmergencyOnDate && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold animate-pulse">
            <TriangleAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <span>
              🚨 নির্বাচিত তারিখটিতে অ্যাডমিন কর্তৃক জরুরি বন্ধ জারি ছিল: <strong>{report.emergencyReason || 'জরুরি বন্ধ নোটিশ'}</strong>। জরুরি নোটিশের আওতায় বন্ধ থাকা মিলগুলো জরুরি নোটিশ ক্যাটাগরিতে অন্তর্ভুক্ত।
            </span>
          </div>
        )}

        {/* Category: Emergency Off */}
        {report.emergencyOff.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                🚨 জরুরি নোটিশের কারণে বন্ধ ({report.emergencyOff.length} জন)
              </span>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-rose-500/20">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-rose-500/5 text-[10px] text-rose-400 uppercase border-b border-rose-500/20 font-mono">
                  <tr>
                    <th className="p-3">নাম</th>
                    <th className="p-3">ফোন</th>
                    <th className="p-3">ওয়ালেট</th>
                    <th className="p-3">কারণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-500/10 bg-slate-950/30">
                  {report.emergencyOff.map(r => (
                    <tr key={r.user.id} className="hover:bg-rose-500/5 transition-colors">
                      <td className="p-3 font-bold text-slate-100">{r.user.name}</td>
                      <td className="p-3 font-mono text-slate-300">{r.user.phone}</td>
                      <td className="p-3 font-mono text-slate-300">৳{r.user.walletBalance}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                          🚨 জরুরি বন্ধ ({report.emergencyReason || 'নোটিশ'})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Category: Insufficient Balance */}
        {report.insufficientBalance.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                🔴 ব্যালেন্স স্বল্পতার কারণে সিস্টেম বন্ধ করেছে ({report.insufficientBalance.length} জন)
              </span>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-rose-500/20">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-rose-500/5 text-[10px] text-rose-400 uppercase border-b border-rose-500/20 font-mono">
                  <tr>
                    <th className="p-3">নাম</th>
                    <th className="p-3">ফোন</th>
                    <th className="p-3">ওয়ালেট</th>
                    <th className="p-3">বন্ধ মিল</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-500/10 bg-slate-950/30">
                  {report.insufficientBalance.map(r => (
                    <tr key={r.user.id} className="hover:bg-rose-500/5 transition-colors">
                      <td className="p-3 font-bold text-slate-100">{r.user.name}</td>
                      <td className="p-3 font-mono text-slate-300">{r.user.phone}</td>
                      <td className="p-3 font-mono text-rose-400 font-bold">৳{r.user.walletBalance}</td>
                      <td className="p-3 text-rose-300">{r.offMeals.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Category: Voluntarily Off */}
        {report.voluntarilyOff.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                🟡 স্বেচ্ছায় / অনির্দিষ্ট বিরতিতে বন্ধ ({report.voluntarilyOff.length} জন)
              </span>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-amber-500/20">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-amber-500/5 text-[10px] text-amber-400 uppercase border-b border-amber-500/20 font-mono">
                  <tr>
                    <th className="p-3">নাম</th>
                    <th className="p-3">ফোন</th>
                    <th className="p-3">ওয়ালেট</th>
                    <th className="p-3">কারণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10 bg-slate-950/30">
                  {report.voluntarilyOff.map(r => (
                    <tr key={r.user.id} className="hover:bg-amber-500/5 transition-colors">
                      <td className="p-3 font-bold text-slate-100">{r.user.name}</td>
                      <td className="p-3 font-mono text-slate-300">{r.user.phone}</td>
                      <td className="p-3 font-mono text-slate-300">৳{r.user.walletBalance}</td>
                      <td className="p-3">
                        {r.user.isIndefinitelyPaused
                          ? <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">অনির্দিষ্ট বিরতি</span>
                          : <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/50 text-[10px] font-bold">নিজে বন্ধ করেছে</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Category: Partial Off */}
        {report.partialOff.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[11px] font-bold">
                🔵 কিছু মিল বন্ধ (আংশিক) ({report.partialOff.length} জন)
              </span>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-sky-500/20">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-sky-500/5 text-[10px] text-sky-400 uppercase border-b border-sky-500/20 font-mono">
                  <tr>
                    <th className="p-3">নাম</th>
                    <th className="p-3">ফোন</th>
                    <th className="p-3">ওয়ালেট</th>
                    <th className="p-3">বন্ধ মিল</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-500/10 bg-slate-950/30">
                  {report.partialOff.map(r => (
                    <tr key={r.user.id} className="hover:bg-sky-500/5 transition-colors">
                      <td className="p-3 font-bold text-slate-100">{r.user.name}</td>
                      <td className="p-3 font-mono text-slate-300">{r.user.phone}</td>
                      <td className="p-3 font-mono text-slate-300">৳{r.user.walletBalance}</td>
                      <td className="p-3 text-sky-300">{r.offMeals.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {report.emergencyOff.length === 0 && report.insufficientBalance.length === 0 && report.voluntarilyOff.length === 0 && report.partialOff.length === 0 && (
          <div className="py-8 text-center">
            <Utensils className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
            <p className="text-slate-400 font-sans text-sm">এই তারিখে সকল সদস্যের সব মিল চালু আছে।</p>
          </div>
        )}
      </div>

      {/* Digital Receipt Modal for Recharge Approval */}
      <ReceiptModal
        transaction={receiptTx}
        user={receiptUser}
        declarations={declarations}
        rates={rates}
        onClose={() => {
          setReceiptTx(null);
          setReceiptUser(null);
        }}
      />

    </div>
  );
};

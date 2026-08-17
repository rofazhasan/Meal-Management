import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, History, CreditCard, AlertTriangle, Printer, Sparkles, Send, CheckCircle2, Clock, XCircle, X, Search, RefreshCw } from 'lucide-react';
import { User, WalletTransaction, MealDeclaration, MealRateConfig, RechargeRequest, PaymentMethod } from '../../types';
import { BN } from '../../constants/banglaText';
import { ReceiptModal } from '../common/ReceiptModal';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { ApiService } from '../../services/apiService';

interface WalletScreenProps {
  currentUser: User;
  transactions: WalletTransaction[];
  declarations?: MealDeclaration[];
  rates?: MealRateConfig;
  onRefreshData?: () => void;
}

const CREDIT_TYPES = ['RECHARGE', 'CREDIT', 'ADMIN_TOPUP', 'REFUND', 'DISCOUNT', 'CASH_PAID'];
const DEBIT_TYPES = ['MEAL_DEDUCTION', 'DEBIT', 'MONTHLY_CHARGE', 'PENALTY'];

export const WalletScreen: React.FC<WalletScreenProps> = ({ currentUser, transactions, declarations, rates, onRefreshData }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'RECHARGE' | 'MEAL_DEDUCTION'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<WalletTransaction | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Recharge Request Modal States
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [reqAmount, setReqAmount] = useState<number>(500);
  const [reqMethod, setReqMethod] = useState<PaymentMethod>('BKASH');
  const [reqTrxId, setReqTrxId] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [myRequests, setMyRequests] = useState<RechargeRequest[]>([]);

  useEffect(() => {
    fetchMyRequests();
  }, [currentUser.id]);

  const fetchMyRequests = async () => {
    try {
      const reqs = await ApiService.getRechargeRequests();
      setMyRequests(reqs.filter((r) => r.userId === currentUser.id));
    } catch {
      // Fallback
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchMyRequests();
      if (onRefreshData) {
        onRefreshData();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleSendRechargeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reqAmount <= 0) {
      alert('অনুগ্রহ করে সঠিক রিচার্জ পরিমাণ উল্লেখ করুন');
      return;
    }
    setSubmittingReq(true);
    try {
      await ApiService.createRechargeRequest({
        userId: currentUser.id,
        userName: currentUser.name,
        userPhone: currentUser.phone,
        amount: reqAmount,
        paymentMethod: reqMethod,
        trxId: reqTrxId.trim(),
        note: reqNote.trim(),
      });
      alert('✅ রিচার্জ রিকুয়েস্ট সফলভাবে এডমিন বরাবর পাঠানো হয়েছে! এডমিন এপ্রুভ করলে আপনার ওয়ালেট রিচার্জ হবে এবং রসিদ তৈরি হবে।');
      setShowRechargeModal(false);
      setReqTrxId('');
      setReqNote('');
      fetchMyRequests();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(`রিকুয়েস্ট পাঠাতে ব্যর্থ: ${err.message}`);
    } finally {
      submittingReq && setSubmittingReq(false);
    }
  };

  const isLowBalance = currentUser.walletBalance < 200;

  const userTxs = transactions.filter(t => t.userId === currentUser.id);

  const filteredTx = userTxs.filter(tx => {
    const isCredit = CREDIT_TYPES.includes(tx.type);
    const isDebit = DEBIT_TYPES.includes(tx.type);

    if (filterType === 'RECHARGE' && !isCredit) return false;
    if (filterType === 'MEAL_DEDUCTION' && !isDebit) return false;

    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      const matchDesc = (tx.description || '').toLowerCase().includes(query);
      const matchDate = (tx.date || '').toLowerCase().includes(query);
      const matchAmt = tx.amount.toString().includes(query);
      return matchDesc || matchDate || matchAmt;
    }

    return true;
  });

  const RECHARGE_TYPES = ['RECHARGE', 'CREDIT', 'ADMIN_TOPUP', 'CASH_PAID'];
  const GROSS_DEDUCTION_TYPES = ['MEAL_DEDUCTION', 'DEBIT', 'MONTHLY_CHARGE', 'PENALTY'];

  const totalRecharge = userTxs
    .filter(t => RECHARGE_TYPES.includes(t.type))
    .reduce((acc, t) => acc + t.amount, 0);

  const grossDeduction = userTxs
    .filter(t => GROSS_DEDUCTION_TYPES.includes(t.type))
    .reduce((acc, t) => acc + t.amount, 0);

  const totalRefunds = userTxs
    .filter(t => t.type === 'REFUND')
    .reduce((acc, t) => acc + t.amount, 0);

  // Net Deductions = Gross Charges - Total Refunds
  const totalDeduction = Math.max(0, grossDeduction - totalRefunds);

  // Financial ratio progress metrics
  const totalFlow = totalRecharge || 1;
  const spentPercent = Math.min(100, Math.round((totalDeduction / totalFlow) * 100));
  const remainingPercent = Math.max(0, 100 - spentPercent);

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
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              title="রিফ্রেশ করুন"
              className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-500/30 transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-300' : ''}`} />
            </button>
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 backdrop-blur-md">
              {currentUser.userType === 'PERMANENT' ? BN.permanentUser : BN.guestUser}
            </span>
          </div>
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

        <div className="space-y-2 z-10">
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-cyan-500/20 text-xs">
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
              {totalRefunds > 0 && (
                <p className="text-[10px] text-cyan-300/80 font-mono mt-0.5">
                  *(৳{totalRefunds} রিফান্ড কর্তন সমন্বিত)
                </p>
              )}
            </div>
          </div>

          {/* Wallet Balance Usage Progress Indicator */}
          {totalRecharge > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] text-cyan-200/80 mb-1 font-mono">
                <span>ব্যয়িত: {spentPercent}%</span>
                <span>অবশিষ্ট ফান্ড: {remainingPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950/60 overflow-hidden flex border border-cyan-500/20">
                <div className="h-full bg-rose-400/80 transition-all duration-500" style={{ width: `${spentPercent}%` }} />
                <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${remainingPercent}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Quick Recharge Request Action Button */}
        <div className="pt-4 border-t border-cyan-500/20 z-10 flex justify-end">
          <button
            onClick={() => setShowRechargeModal(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 hover:from-emerald-400 hover:to-teal-300 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 font-display"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>💸 রিচার্জের জন্য এডমিনকে রিকুয়েস্ট পাঠান</span>
          </button>
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm print:hidden"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>প্রিন্ট স্টেটমেন্ট</span>
            </button>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs print:hidden">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-xl font-bold transition-all active:scale-95 ${filterType === 'ALL' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                সবগুলো
              </button>
              <button
                onClick={() => setFilterType('RECHARGE')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all active:scale-95 ${filterType === 'RECHARGE' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                রিচার্জ
              </button>
              <button
                onClick={() => setFilterType('MEAL_DEDUCTION')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all active:scale-95 ${filterType === 'MEAL_DEDUCTION' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                কাটা
              </button>
            </div>
          </div>
        </div>

        {/* Transaction Search Bar */}
        <div className="relative print:hidden">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="লেনদেন খুঁজুন (বিবরণ, পরিমাণ বা তারিখ দিয়ে...)"
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500/50 transition-all font-sans"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {filteredTx.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="কোনো লেনদেন রেকর্ড পাওয়া যায়নি"
            description={searchTerm ? "আপনার সার্চ অনুযায়ী কোনো লেনদেন খুঁজে পাওয়া যায়নি।" : "আপনার নির্বাচিত ক্যাটাগরিতে এখনও কোনো রেকর্ড যুক্ত হয়নি।"}
          />
        ) : (
          <div className="space-y-3">
            {filteredTx.map((tx) => {
              const isCredit = CREDIT_TYPES.includes(tx.type);
              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTxForReceipt(tx)}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900 cursor-pointer transition-all flex items-center justify-between gap-4 group shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-2xl ${isCredit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                      {isCredit ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-200 group-hover:text-cyan-300 transition-colors font-sans">{tx.description}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1 font-mono group-hover:bg-cyan-500/20">
                          <Printer className="w-3 h-3 text-cyan-400" />
                          রসিদ
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{new Date(tx.date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-base font-extrabold font-mono ${isCredit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                      {isCredit ? '+' : '-'} ৳{tx.amount}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      অবশিষ্ট: ৳{tx.balanceAfter}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* User Sent Recharge Requests Tracking Card */}
      {myRequests.length > 0 && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Send className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base font-display">আমার পাঠানো রিচার্জ রিকুয়েস্ট ট্র্যাকার</h3>
                <p className="text-xs text-slate-400 font-sans">এডমিন পর্যালোচনার স্ট্যাটাস</p>
              </div>
            </div>
            <button
              onClick={fetchMyRequests}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>আপডেট স্ট্যাটাস</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {myRequests.map((req) => (
              <div key={req.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-sm font-mono">৳{req.amount}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                      {req.paymentMethod}
                    </span>
                    {req.trxId && <span className="text-[10px] text-slate-400 font-mono">TrxID: {req.trxId}</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    তারিখ: {new Date(req.requestedAt).toLocaleString('bn-BD')}
                  </p>
                  {req.rejectionReason && (
                    <p className="text-[11px] text-rose-400 font-bold mt-0.5">কারণ: {req.rejectionReason}</p>
                  )}
                </div>

                <div className="shrink-0">
                  {req.status === 'PENDING' && (
                    <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[11px] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      মুলতুবি (Pending)
                    </span>
                  )}
                  {req.status === 'APPROVED' && (
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      অনুমোদিত (Approved)
                    </span>
                  )}
                  {req.status === 'REJECTED' && (
                    <span className="px-3 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold text-[11px] flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      বাতিল (Rejected)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Recharge Request Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-5 sm:p-8 rounded-3xl border border-slate-800 w-full max-w-md space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-lg font-display">রিচার্জ রিকুয়েস্ট পাঠান</h3>
                  <p className="text-xs text-slate-400 font-sans">এডমিনকে টাকা প্রদানের বিস্তারিত দিন</p>
                </div>
              </div>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendRechargeRequest} className="space-y-4 text-xs font-sans">

              {/* Payment Method Selector */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">পেমেন্ট মেথড বা মাধ্যম নির্বাচন করুন</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BKASH', 'NAGAD', 'ROCKET', 'CASH', 'BANK'] as PaymentMethod[]).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setReqMethod(method)}
                      className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${reqMethod === method
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                    >
                      {method === 'BKASH' ? 'বিকাশ' : method === 'NAGAD' ? 'নগদ' : method === 'ROCKET' ? 'রকেট' : method === 'CASH' ? 'ক্যাশ (নগদ টাকা)' : 'ব্যাংক'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input & Preset Chips */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 font-sans">
                  টাকার পরিমাণ (৳) — যেকোনো পরিমাণের জন্য নিচে লিখুন
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={reqAmount || ''}
                  onChange={(e) => setReqAmount(Number(e.target.value))}
                  placeholder="যেকোনো পরিমাণ টাইপ করুন (যেমন: ৫০, ১২০, ৩৫০, ১০০০...)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-emerald-400 font-mono text-base font-extrabold focus:outline-none focus:border-emerald-500 transition-all mb-2"
                />
                
                {/* Preset Helper Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold font-sans">দ্রুত বাছাই:</span>
                  {[50, 100, 200, 500, 1000, 2000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setReqAmount(amt)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border transition-all ${
                        reqAmount === amt
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* TrxID / Reference Input */}
              {reqMethod !== 'CASH' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Transaction ID (TrxID) / ট্রানজেকশন নম্বর (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={reqTrxId}
                    onChange={(e) => setReqTrxId(e.target.value)}
                    placeholder="যেমন: 9B7281XA92"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>
              )}

              {/* Note Input */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">অতিরিক্ত বার্তা / নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                  placeholder="যেমন: মেস ম্যানেজার কে নগদ ৫০০ টাকা দিয়েছি"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 font-sans text-xs focus:outline-none focus:border-emerald-500/60 transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRechargeModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 font-bold text-xs"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingReq ? 'পাঠানো হচ্ছে...' : 'রিকুয়েস্ট পাঠান'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Digital Receipt Modal */}
      <ReceiptModal
        transaction={selectedTxForReceipt}
        user={currentUser}
        declarations={declarations}
        rates={rates}
        onClose={() => setSelectedTxForReceipt(null)}
      />

    </div>
  );
};


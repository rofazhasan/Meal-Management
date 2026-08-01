import React from 'react';
import { X, Printer, CheckCircle2, Shield, UtensilsCrossed } from 'lucide-react';
import { WalletTransaction, User } from '../../types';

interface ReceiptModalProps {
  transaction: WalletTransaction | null;
  user: User | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, user, onClose }) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(transaction.date).toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in print:p-0 print:bg-white">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden print:shadow-none print:border-none print:bg-white print:text-black print:rounded-none">
        
        {/* Close Button (Hidden when printing) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50 print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Voucher Header */}
        <div className="text-center pb-4 border-b border-slate-800 print:border-gray-200">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-400 p-0.5 flex items-center justify-center mb-2 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center print:bg-white">
              <UtensilsCrossed className="w-6 h-6 text-sky-400 print:text-black" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-100 print:text-black">মিল ম্যানেজার ডিজিটাল ভাউচার</h2>
          <p className="text-xs text-slate-400 print:text-gray-600">মেস / হোস্টেল ক্যাশ রসিদ</p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-[11px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 print:bg-gray-100 print:text-black">
            ID: {transaction.id.toUpperCase()}
          </span>
        </div>

        {/* User & Transaction Information Grid */}
        <div className="py-4 space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-800/50 print:border-gray-100">
            <span className="text-slate-400 print:text-gray-500">গ্রাহকের নাম:</span>
            <span className="font-bold text-slate-200 print:text-black">{user?.name || 'অনুমোদিত ইউজার'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/50 print:border-gray-100">
            <span className="text-slate-400 print:text-gray-500">মোবাইল নম্বর:</span>
            <span className="font-mono text-slate-300 print:text-black">{user?.phone || 'N/A'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/50 print:border-gray-100">
            <span className="text-slate-400 print:text-gray-500">একাউন্ট টাইপ:</span>
            <span className="text-slate-300 print:text-black font-bold">
              {user?.userType === 'PERMANENT' ? 'স্থায়ী মেম্বার' : 'গেস্ট মেম্বার'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/50 print:border-gray-100">
            <span className="text-slate-400 print:text-gray-500">লেনদেনের তারিখ:</span>
            <span className="text-slate-300 print:text-black font-sans">{formattedDate}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/50 print:border-gray-100">
            <span className="text-slate-400 print:text-gray-500">বিবরণ:</span>
            <span className="text-slate-300 print:text-black font-medium">{transaction.description}</span>
          </div>
        </div>

        {/* Amount Box */}
        <div className="my-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center print:bg-gray-50 print:border-gray-300">
          <p className="text-xs text-slate-400 print:text-gray-600">মোট লেনদেন পরিমাণ</p>
          <div className={`text-3xl font-black my-1 font-sans ${
            transaction.type === 'RECHARGE' ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'
          }`}>
            {transaction.type === 'RECHARGE' ? '+' : '-'} ৳{transaction.amount}
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 print:text-gray-600 mt-2">
            <span>পূর্বের ব্যালেন্স: ৳{transaction.balanceBefore}</span>
            <span>বর্তমান ব্যালেন্স: ৳{transaction.balanceAfter}</span>
          </div>
        </div>

        {/* Verification Stamp */}
        <div className="flex items-center justify-between pt-3 text-[11px] text-slate-400 print:text-gray-600">
          <div className="flex items-center gap-1 text-emerald-400 print:text-emerald-700 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>সফলভাবে সম্পন্ন</span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <Shield className="w-3.5 h-3.5 text-sky-400 print:text-gray-500" />
            <span>ডিজিটাল মেস অনুমোদন</span>
          </div>
        </div>

        {/* Printable Action Buttons */}
        <div className="mt-6 flex items-center gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট / PDF সেভ করুন</span>
          </button>
        </div>

      </div>
    </div>
  );
};

'use client';

import React from 'react';
import { X, AlertCircle, CreditCard, Sparkles } from 'lucide-react';

interface InsufficientBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
  requiredAmount?: number;
  onRechargeClick?: () => void;
}

export const InsufficientBalanceModal: React.FC<InsufficientBalanceModalProps> = ({
  isOpen,
  onClose,
  walletBalance,
  requiredAmount,
  onRechargeClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900/95 border-2 border-rose-500/50 rounded-3xl shadow-2xl shadow-rose-950/60 overflow-hidden animate-scale-in flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
            <h3 className="font-extrabold text-sm sm:text-base text-white font-display">
              মুরুব্বি মুরুব্বি উহু হু হু হু 😂
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-center">
          
          {/* Responsive Meme Image Container */}
          <div className="relative group rounded-2xl overflow-hidden border-2 border-rose-500/40 shadow-xl bg-black">
            <img
              src="/images/insufficient-balance.jpeg"
              alt="মুরুব্বি মুরুব্বি উহু হু হু হু"
              className="w-full max-h-[220px] sm:max-h-[300px] md:max-h-[340px] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.02]"
              onError={(e) => {
                // Fallback to root path if /images/ fails
                (e.target as HTMLImageElement).src = '/insufficient-balance.jpeg';
              }}
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-center">
              <p className="text-xs sm:text-sm font-black text-amber-300 font-display">
                টাকা ছাড়া মিল অন করা যাবে না!
              </p>
            </div>
          </div>

          {/* Balance Breakdown Pills */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-left">
              <span className="text-[10px] text-slate-400 font-sans block">বর্তমান ওয়ালেট ব্যালেন্স</span>
              <span className="text-sm font-bold text-rose-400">৳{walletBalance}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-left">
              <span className="text-[10px] text-slate-400 font-sans block">প্রয়োজনীয় মিল ফি</span>
              <span className="text-sm font-bold text-amber-300">
                {requiredAmount ? `৳${requiredAmount}` : '৳৫০+'}
              </span>
            </div>
          </div>

          {/* Bengali Humorous & Helpful Guidance */}
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200/90 leading-relaxed text-left">
            <p className="font-semibold">
              ⚠️ আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই। মিল চালু করতে হলে আগে ওয়ালেট রিচার্জ করুন অথবা মেস ম্যানেজারকে ক্যাশ জমা দিন।
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
          {onRechargeClick && (
            <button
              onClick={() => {
                onClose();
                onRechargeClick();
              }}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span>ওয়ালেট রিচার্জ করুন</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-95"
          >
            ঠিক আছে, বুঝতে পেরেছি
          </button>
        </div>

      </div>
    </div>
  );
};

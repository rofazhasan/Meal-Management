'use client';

import React, { useState } from 'react';
import { Phone, Lock, User as UserIcon, Home, ArrowRight, ShieldAlert, Utensils, KeyRound, Sparkles, Eye, EyeOff } from 'lucide-react';
import { getBangladeshDateStr } from '../../utils/dateUtils';
import { normalizePhoneNumber } from '../../utils/phoneUtils';
import { User, UserType } from '../../types';
import { BN } from '../../constants/banglaText';
import { ApiService } from '../../services/apiService';
import { StatusBadge } from '../common/StatusBadge';
import { AppLogo } from '../common/AppLogo';
import { Footer } from '../common/Footer';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [userType, setUserType] = useState<UserType>('PERMANENT');
  const [error, setError] = useState<string | null>(null);
  const [pendingUserNotice, setPendingUserNotice] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetSuccessNotice, setResetSuccessNotice] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleRequestResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccessNotice(null);
    setResetLoading(true);
    try {
      await ApiService.requestPasswordReset(resetPhone);
      setResetSuccessNotice('আপনার পাসওয়ার্ড রিসেট অনুরোধ সফলভাবে অ্যাডমিনের কাছে পাঠানো হয়েছে! অ্যাডমিন অনুমোদন করলে আপনার পাসওয়ার্ড রিসেট হয়ে 123 হবে।');
    } catch (err: any) {
      setResetError(err.message || 'অনুরোধ পাঠাতে সমস্যা হয়েছে');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await ApiService.login(phone, password);
        if (user.status === 'PENDING') {
          setPendingUserNotice(user);
        } else {
          onLoginSuccess(user);
        }
      } else {
        if (!name.trim()) {
          throw new Error('অনুগ্রহ করে আপনার নামটি লিখুন');
        }
        const newUser = await ApiService.register({
          name,
          phone,
          password,
          userType,
          role: 'USER',
        });
        setPendingUserNotice(newUser);
      }
    } catch (err: any) {
      setError(err.message || 'একটি ত্রুটি ঘটেছে');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full flex flex-col justify-center items-center py-4 sm:py-8 relative">
      <div className="w-full max-w-md z-10 animate-scale-in mx-auto">
        
        {/* Header Hero Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <AppLogo size="xl" />
          </div>
          <h1 className="text-3xl font-extrabold font-display bg-gradient-to-r from-cyan-300 via-sky-200 to-white bg-clip-text text-transparent">
            {BN.appTitle}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 font-sans">{BN.tagline}</p>
        </div>

        {/* Pending Approval Card */}
        {pendingUserNotice ? (
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-amber-500/30 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 font-display">{pendingUserNotice.name}</h2>
              <div className="mt-2 flex justify-center">
                <StatusBadge status="PENDING" />
              </div>
            </div>
            <p className="text-sm text-slate-300 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 font-sans">
              {BN.pendingApprovalNotice}
            </p>
            <p className="text-xs text-slate-400 font-sans">{BN.contactAdmin}</p>
            <button
              onClick={() => setPendingUserNotice(null)}
              className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-slate-200 hover:bg-slate-800 font-bold text-xs transition-all active:scale-95"
            >
              ফিরে যান
            </button>
          </div>
        ) : (
          /* Login / Register Glass Card */
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 shadow-2xl space-y-6">
            
            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all active:scale-95 ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/25 font-display'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {BN.login}
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all active:scale-95 ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/25 font-display'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {BN.register}
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.namePlaceholder}</label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="যেমন: রফিকুল ইসলাম"
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.phonePlaceholder}</label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(normalizePhoneNumber(e.target.value))}
                    placeholder="01711111111"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 font-sans">{BN.passwordPlaceholder}</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setResetPhone(phone);
                        setShowResetModal(true);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 hover:underline font-sans font-semibold transition"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-3 pl-11 pr-11 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    title={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.selectUserType}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setUserType('PERMANENT')}
                        className={`p-3.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all active:scale-95 ${
                          userType === 'PERMANENT'
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="font-display">{BN.permanentUser}</span>
                        <span className="text-[10px] text-slate-400 font-normal">নিয়মিত মেস মেম্বার</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserType('GUEST')}
                        className={`p-3.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all active:scale-95 ${
                          userType === 'GUEST'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="font-display">{BN.guestUser}</span>
                        <span className="text-[10px] text-slate-400 font-normal">সাময়িক মেহমান</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-base transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 active:scale-95 font-display"
              >
                <span>{mode === 'login' ? BN.login : BN.register}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </form>

          </div>
        )}

      </div>

      {/* Forgot Password Reset Request Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-amber-500/30 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 font-display">পাসওয়ার্ড রিসেট অনুরোধ</h3>
                  <p className="text-xs text-slate-400 font-sans">পাসওয়ার্ড রিসেট অনুরোধ পাঠাতে ফোন নম্বর দিন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetSuccessNotice(null);
                  setResetError(null);
                }}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              >
                ✕
              </button>
            </div>

            {resetSuccessNotice ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-3">
                <p className="font-semibold">{resetSuccessNotice}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetSuccessNotice(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs font-display hover:bg-emerald-400 transition"
                >
                  ঠিক আছে (ঠিক আছে)
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestResetSubmit} className="space-y-4">
                {resetError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                    {resetError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">আপনার নিবন্ধিত মোবাইল নম্বর</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={resetPhone}
                      onChange={(e) => setResetPhone(e.target.value)}
                      placeholder="01711111111"
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-slate-300 text-xs font-sans space-y-1">
                  <p className="font-bold text-amber-300">💡 পাসওয়ার্ড রিসেট নিয়মাবলী:</p>
                  <p>অনুরোধটি মেস অ্যাডমিনের কাছে পাঠানো হবে। অ্যাডমিন অনুমোদন করলে আপনার পাসওয়ার্ড ডিফল্ট <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400 font-mono font-bold">123</code> এ সেট হবে।</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition font-display"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-amber-500/20 active:scale-95 font-display"
                  >
                    {resetLoading ? 'অনুরোধ পাঠানো হচ্ছে...' : 'অনুরোধ পাঠান'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

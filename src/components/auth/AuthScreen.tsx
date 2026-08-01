import React, { useState } from 'react';
import { Phone, Lock, User as UserIcon, Home, ArrowRight, ShieldAlert, Utensils, KeyRound, Sparkles, Eye, EyeOff } from 'lucide-react';
import { User, UserType } from '../../types';
import { BN } from '../../constants/banglaText';
import { MockService } from '../../services/mockStorage';
import { StatusBadge } from '../common/StatusBadge';
import { AppLogo } from '../common/AppLogo';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await MockService.login(phone, password);
        if (user.status === 'PENDING') {
          setPendingUserNotice(user);
        } else {
          onLoginSuccess(user);
        }
      } else {
        if (!name.trim()) {
          throw new Error('অনুগ্রহ করে আপনার নামটি লিখুন');
        }
        const newUser = await MockService.register({
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

  const handleQuickLogin = async (phoneNum: string, pass: string) => {
    setPhone(phoneNum);
    setPassword(pass);
    setError(null);
    setLoading(true);
    try {
      const user = await MockService.login(phoneNum, pass);
      if (user.status === 'PENDING') {
        setPendingUserNotice(user);
      } else {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#050811]">
      {/* Background Floating Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-float-delayed" />

      <div className="w-full max-w-md z-10 animate-scale-in">
        
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
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01711111111"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">{BN.passwordPlaceholder}</label>
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
    </div>
  );
};

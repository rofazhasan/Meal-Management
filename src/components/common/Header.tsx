import React from 'react';
import { Wallet, Moon, Sun, Shield, UserCheck, LogOut, UtensilsCrossed, Sparkles } from 'lucide-react';
import { User as UserType } from '../../types';
import { BN } from '../../constants/banglaText';
import { AnimatedNumber } from './AnimatedNumber';

import { AppLogo } from './AppLogo';

interface HeaderProps {
  currentUser: UserType | null;
  onLogout: () => void;
  onSwitchRole: (newRole: 'USER' | 'ADMIN') => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onSwitchRole,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 py-3 sm:px-6 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <AppLogo size="md" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg sm:text-xl font-extrabold font-display bg-gradient-to-r from-cyan-300 via-sky-200 to-white bg-clip-text text-transparent">
                {BN.appTitle}
              </h1>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-amber-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ENTERPRISE v4.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-sans">
              {BN.appSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls & User Profile Bar */}
        {currentUser && (
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Wallet Pill */}
            {currentUser.role === 'USER' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold text-xs sm:text-sm shadow-sm shadow-cyan-500/10 backdrop-blur-md">
                <Wallet className="w-4 h-4 text-cyan-400" />
                <AnimatedNumber value={currentUser.walletBalance} prefix={BN.tkSymbol} decimals={0} className="text-slate-100 font-bold" />
              </div>
            )}

            {/* User Avatar & Name */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-slate-950 font-bold text-[11px]">
                {currentUser.name.charAt(0)}
              </div>
              <span className="font-semibold text-slate-200">{currentUser.name}</span>
            </div>

            {/* Quick Role Switcher Pill */}
            <div className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => onSwitchRole('USER')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium ${
                  currentUser.role === 'USER'
                    ? 'bg-gradient-to-r from-cyan-600 to-sky-500 text-white font-semibold shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                ইউজার মোড
              </button>
              <button
                onClick={() => onSwitchRole('ADMIN')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-gradient-to-r from-amber-600 to-rose-500 text-white font-semibold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                অ্যাডমিন মোড
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
              title="থিম পরিবর্তন"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all text-xs font-semibold active:scale-95 shadow-sm"
              title={BN.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{BN.logout}</span>
            </button>

          </div>
        )}

      </div>
    </header>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Wallet, 
  Moon, 
  Sun, 
  Shield, 
  UserCheck, 
  LogOut, 
  Sparkles, 
  Palette, 
  Check, 
  Square 
} from 'lucide-react';
import { User as UserType, AppTheme } from '../../types';
import { BN } from '../../constants/banglaText';
import { AnimatedNumber } from './AnimatedNumber';
import { AppLogo } from './AppLogo';
import { BauhausGeometricLogo } from '../bauhaus/BauhausGeometricLogo';

interface HeaderProps {
  currentUser: UserType | null;
  onLogout: () => void;
  onSwitchRole: (newRole: 'USER' | 'ADMIN') => void;
  theme: AppTheme;
  onToggleTheme?: () => void;
  onThemeChange?: (newTheme: AppTheme) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onSwitchRole,
  theme,
  onToggleTheme,
  onThemeChange,
}) => {
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: { id: AppTheme; label: string; icon: string; desc: string; color: string }[] = [
    { id: 'dark', label: 'Cyber Dark', icon: '🌌', desc: 'Glassmorphic Dark', color: '#0ea5e9' },
    { id: 'light', label: 'Clean Light', icon: '☀️', desc: 'Minimal Light Mode', color: '#0284c7' },
    { id: 'bauhaus', label: 'Bauhaus Poster', icon: '📐', desc: '1920s Constructivist Light', color: '#D02020' },
    { id: 'bauhaus-dark', label: 'Bauhaus Night', icon: '⬛', desc: 'High-Contrast Geometric', color: '#F0C020' },
  ];

  const handleSelectTheme = (newTheme: AppTheme) => {
    if (onThemeChange) {
      onThemeChange(newTheme);
    } else if (onToggleTheme) {
      onToggleTheme();
    }
    setThemeDropdownOpen(false);
  };

  const isBauhaus = theme === 'bauhaus' || theme === 'bauhaus-dark';

  return (
    <header className={`sticky top-0 z-40 glass-panel px-4 py-3 sm:px-6 transition-all ${isBauhaus ? 'border-b-4 border-black dark:border-white shadow-[0_4px_0px_0px_black]' : 'border-b border-slate-800/80'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          {isBauhaus ? (
            <BauhausGeometricLogo size="md" />
          ) : (
            <AppLogo size="md" />
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg sm:text-xl font-extrabold font-display tracking-tight">
                {BN.appTitle}
              </h1>
              {isBauhaus ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black bg-[#D02020] text-white border border-black shadow-[2px_2px_0px_0px_black] uppercase font-outfit">
                  BAUHAUS 1926
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-mono">
                  ENTERPRISE v4.0
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 hidden sm:block font-sans">
              {BN.appSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls & User Profile Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser && (
            <>
              {/* Quick Wallet Pill */}
              <div className={`flex items-center gap-2 px-3 py-1.5 font-semibold text-xs sm:text-sm shadow-sm ${
                isBauhaus 
                  ? 'rounded-none bg-[#F0C020] text-black border-2 border-black shadow-[3px_3px_0px_0px_black]' 
                  : 'rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 shadow-cyan-500/10 backdrop-blur-md'
              }`}>
                <Wallet className={`w-4 h-4 ${isBauhaus ? 'text-black' : 'text-cyan-600 dark:text-cyan-400'}`} />
                <AnimatedNumber 
                  value={currentUser.walletBalance} 
                  prefix={BN.tkSymbol} 
                  decimals={0} 
                  className={isBauhaus ? 'text-black font-extrabold' : 'text-slate-900 dark:text-white font-bold'} 
                />
              </div>

              {/* User Avatar & Name */}
              <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs ${
                isBauhaus
                  ? 'rounded-none bg-white dark:bg-slate-900 border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_black]'
                  : 'rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                <div className={`w-6 h-6 flex items-center justify-center font-bold text-[11px] ${
                  isBauhaus
                    ? 'rounded-full bg-[#1040C0] text-white border border-black'
                    : 'rounded-full bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950'
                }`}>
                  {currentUser.name.charAt(0)}
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">{currentUser.name}</span>
              </div>

              {/* Quick Role Switcher Pill */}
              {(currentUser.isDualMode || currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN') && (
                <div className={`flex items-center p-1 text-xs ${
                  isBauhaus
                    ? 'rounded-none bg-white dark:bg-slate-900 border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_black]'
                    : 'rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800'
                }`}>
                  <button
                    onClick={() => onSwitchRole('USER')}
                    className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 transition-all font-bold text-[11px] sm:text-xs ${
                      currentUser.activeMode === 'USER'
                        ? isBauhaus
                          ? 'bg-[#1040C0] text-white border border-black shadow-[2px_2px_0px_0px_black]'
                          : 'bg-gradient-to-r from-cyan-600 to-sky-500 text-white shadow-md shadow-sky-500/20 rounded-lg'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ইউজার</span> মোড
                  </button>
                  <button
                    onClick={() => onSwitchRole('ADMIN')}
                    className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 transition-all font-bold text-[11px] sm:text-xs ${
                      currentUser.activeMode === 'ADMIN'
                        ? isBauhaus
                          ? 'bg-[#D02020] text-white border border-black shadow-[2px_2px_0px_0px_black]'
                          : 'bg-gradient-to-r from-amber-600 to-rose-500 text-white shadow-md shadow-amber-500/20 rounded-lg'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">অ্যাডমিন</span> মোড
                  </button>
                </div>
              )}
            </>
          )}

          {/* Theme Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setThemeDropdownOpen((prev) => !prev)}
              className={`p-2 transition-all flex items-center gap-1 text-xs font-bold ${
                isBauhaus
                  ? 'rounded-none bg-white dark:bg-slate-900 border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  : 'rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-95 shadow-sm'
              }`}
              title="ডিজাইন সিস্টেম ও থিম নির্বাচন"
            >
              <Palette className="w-4 h-4 text-[#D02020] dark:text-[#F0C020]" />
              <span className="hidden sm:inline font-outfit uppercase text-[11px]">{theme}</span>
            </button>

            {themeDropdownOpen && (
              <div className={`absolute right-0 mt-2 w-64 p-2 z-50 animate-scale-in ${
                isBauhaus
                  ? 'rounded-none bg-white dark:bg-slate-950 border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_black]'
                  : 'rounded-2xl glass-panel border border-slate-800 shadow-2xl backdrop-blur-xl bg-slate-900/95'
              }`}>
                <div className="px-3 py-2 border-b border-slate-700/60 mb-1 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 font-outfit">
                    Design Theme Style
                  </span>
                  <BauhausGeometricLogo size="sm" />
                </div>
                <div className="space-y-1">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTheme(t.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-all font-sans ${
                        theme === t.id
                          ? isBauhaus
                            ? 'bg-[#F0C020] text-black font-extrabold border-2 border-black shadow-[2px_2px_0px_0px_black]'
                            : 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 rounded-xl'
                          : isBauhaus
                            ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                            : 'hover:bg-slate-800/80 text-slate-300 rounded-xl'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{t.icon}</span>
                        <div>
                          <div className="font-bold">{t.label}</div>
                          <div className="text-[10px] opacity-75 font-mono">{t.desc}</div>
                        </div>
                      </div>
                      {theme === t.id && <Check className="w-4 h-4 shrink-0 text-current" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Logout button (if logged in) */}
          {currentUser && (
            <button
              onClick={onLogout}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-all text-xs font-semibold active:scale-95 shadow-sm ${
                isBauhaus
                  ? 'rounded-none bg-[#D02020] text-white border-2 border-black shadow-[3px_3px_0px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  : 'rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
              }`}
              title={BN.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{BN.logout}</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};

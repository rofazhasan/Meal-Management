import React from 'react';
import { LayoutDashboard, CalendarCheck, Wallet, BarChart3, ShieldCheck, Users, Settings, ShieldAlert, DollarSign, Building2, ChefHat, UtensilsCrossed } from 'lucide-react';
import { BN } from '../../constants/banglaText';

export type TabType = 
  | 'dashboard' 
  | 'meals' 
  | 'wallet' 
  | 'reports' 
  | 'admin-dashboard' 
  | 'admin-cook-report'
  | 'admin-bulk-meals'
  | 'admin-finance' 
  | 'admin-users' 
  | 'admin-settings' 
  | 'admin-audit';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isAdmin: boolean;
  pendingApprovalsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  isAdmin,
  pendingApprovalsCount = 0,
}) => {
  if (isAdmin) {
    return (
      <nav className="glass-panel border border-slate-800/80 p-1.5 my-3 rounded-2xl max-w-7xl mx-auto flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto shadow-xl">
        <button
          onClick={() => onTabChange('admin-dashboard')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap active:scale-95 ${
            activeTab === 'admin-dashboard'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 font-bold'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 font-semibold'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          {BN.adminPanel}
          {pendingApprovalsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white animate-pulse font-mono">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('admin-cook-report')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap active:scale-95 ${
            activeTab === 'admin-cook-report'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 font-bold'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 font-semibold'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          বাবুর্চির হিসাব
        </button>

        <button
          onClick={() => onTabChange('admin-bulk-meals')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap active:scale-95 ${
            activeTab === 'admin-bulk-meals'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 font-bold'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 font-semibold'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          বাল্ক মিল ওভাররাইড
        </button>

        <button
          onClick={() => onTabChange('admin-finance')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap active:scale-95 ${
            activeTab === 'admin-finance'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 font-bold'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 font-semibold'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          ফাইন্যান্সিয়াল হাব
        </button>

        <button
          onClick={() => onTabChange('admin-users')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap active:scale-95 ${
            activeTab === 'admin-users'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 font-bold'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 font-semibold'
          }`}
        >
          <Users className="w-4 h-4" />
          {BN.users}
        </button>

        <button
          onClick={() => onTabChange('admin-settings')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap active:scale-95 ${
            activeTab === 'admin-settings'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 font-bold'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 font-semibold'
          }`}
        >
          <Settings className="w-4 h-4" />
          {BN.settings}
        </button>

        <button
          onClick={() => onTabChange('admin-audit')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap active:scale-95 ${
            activeTab === 'admin-audit'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 font-bold'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 font-semibold'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          অডিট লগ
        </button>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md glass-panel p-1.5 rounded-2xl border border-slate-700/60 shadow-2xl shadow-cyan-950/40 flex items-center justify-around">
      <button
        onClick={() => onTabChange('dashboard')}
        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all active:scale-95 ${
          activeTab === 'dashboard'
            ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30 shadow-md shadow-cyan-500/10'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[11px] font-medium font-sans">{BN.dashboard}</span>
      </button>

      <button
        onClick={() => onTabChange('meals')}
        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all active:scale-95 ${
          activeTab === 'meals'
            ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 text-cyan-300 font-bold border border-cyan-500/30 shadow-md shadow-cyan-500/10'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <CalendarCheck className="w-5 h-5" />
        <span className="text-[11px] font-medium font-sans">{BN.mealDeclaration}</span>
      </button>

      <button
        onClick={() => onTabChange('wallet')}
        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all active:scale-95 ${
          activeTab === 'wallet'
            ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 text-cyan-300 font-bold border border-cyan-500/30 shadow-md shadow-cyan-500/10'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Wallet className="w-5 h-5" />
        <span className="text-[11px] font-medium font-sans">{BN.wallet}</span>
      </button>

      <button
        onClick={() => onTabChange('reports')}
        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all active:scale-95 ${
          activeTab === 'reports'
            ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 text-cyan-300 font-bold border border-cyan-500/30 shadow-md shadow-cyan-500/10'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <BarChart3 className="w-5 h-5" />
        <span className="text-[11px] font-medium font-sans">{BN.reports}</span>
      </button>
    </nav>
  );
};

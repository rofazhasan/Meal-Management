import React from 'react';
import { LayoutDashboard, CalendarCheck, Wallet, BarChart3, ShieldCheck, Users, Settings, ShieldAlert, DollarSign, Building2, ChefHat, UtensilsCrossed, Eye } from 'lucide-react';
import { BN } from '../../constants/banglaText';

export type TabType = 
  | 'dashboard' 
  | 'meals' 
  | 'wallet' 
  | 'reports' 
  | 'public-meals'
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
  const [showMoreAdminMenu, setShowMoreAdminMenu] = React.useState(false);

  if (isAdmin) {
    const adminTabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
      { id: 'admin-dashboard', label: BN.adminPanel, icon: <ShieldCheck className="w-4 h-4" />, badge: pendingApprovalsCount },
      { id: 'admin-cook-report', label: 'বাবুর্চির হিসাব', icon: <ChefHat className="w-4 h-4" /> },
      { id: 'admin-bulk-meals', label: 'বাল্ক মিল ওভাররাইড', icon: <UtensilsCrossed className="w-4 h-4" /> },
      { id: 'admin-finance', label: 'ফাইন্যান্সিয়াল হাব', icon: <DollarSign className="w-4 h-4" /> },
      { id: 'admin-users', label: BN.users, icon: <Users className="w-4 h-4" /> },
      { id: 'admin-settings', label: BN.settings, icon: <Settings className="w-4 h-4" /> },
      { id: 'admin-audit', label: 'অডিট লগ', icon: <ShieldAlert className="w-4 h-4" /> },
    ];

    return (
      <>
        {/* Desktop & Tablet Top Navigation Bar */}
        <nav className="glass-panel border border-slate-800/80 p-1.5 my-3 rounded-2xl max-w-7xl mx-auto flex items-center justify-start md:justify-center gap-1 sm:gap-2 overflow-x-auto touch-pan-x no-scrollbar shadow-xl scroll-smooth">
          {adminTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 font-bold'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 font-semibold'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white animate-pulse font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile Floating Bottom Bar for Admin User (Visible on screens < md) */}
        <div className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-lg">
          {/* Backdrop for More Admin Menu */}
          {showMoreAdminMenu && (
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs -z-10 animate-fade-in"
              onClick={() => setShowMoreAdminMenu(false)}
            />
          )}

          {/* More Admin Options Dropup Menu on Mobile */}
          {showMoreAdminMenu && (
            <div className="absolute bottom-16 right-2 w-60 glass-panel border border-amber-500/40 rounded-2xl p-2 shadow-2xl bg-slate-950/95 backdrop-blur-2xl space-y-1 animate-slide-up z-50">
              <div className="px-3 py-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono border-b border-slate-800 flex items-center justify-between">
                <span>অ্যাডমিন ফিচারসমূহ</span>
                <button onClick={() => setShowMoreAdminMenu(false)} className="text-slate-400 hover:text-slate-200">✕</button>
              </div>

              <button
                onClick={() => {
                  onTabChange('admin-finance');
                  setShowMoreAdminMenu(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  activeTab === 'admin-finance'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>ফাইন্যান্সিয়াল হাব</span>
              </button>

              <button
                onClick={() => {
                  onTabChange('admin-settings');
                  setShowMoreAdminMenu(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  activeTab === 'admin-settings'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>সেটিংসমূহ</span>
              </button>

              <button
                onClick={() => {
                  onTabChange('admin-audit');
                  setShowMoreAdminMenu(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  activeTab === 'admin-audit'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>অডিট লগ</span>
              </button>
            </div>
          )}

          <nav className="glass-panel p-1.5 rounded-2xl border border-amber-500/40 shadow-2xl shadow-amber-950/50 flex items-center justify-around bg-slate-950/95 backdrop-blur-xl">
            <button
              onClick={() => {
                setShowMoreAdminMenu(false);
                onTabChange('admin-dashboard');
              }}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all relative active:scale-95 ${
                activeTab === 'admin-dashboard'
                  ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-medium font-sans whitespace-nowrap">ড্যাশবোর্ড</span>
              {pendingApprovalsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse font-mono">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setShowMoreAdminMenu(false);
                onTabChange('admin-cook-report');
              }}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                activeTab === 'admin-cook-report'
                  ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span className="text-[10px] font-medium font-sans whitespace-nowrap">বাবুর্চি</span>
            </button>

            <button
              onClick={() => {
                setShowMoreAdminMenu(false);
                onTabChange('admin-bulk-meals');
              }}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                activeTab === 'admin-bulk-meals'
                  ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-[10px] font-medium font-sans whitespace-nowrap">বাল্ক মিল</span>
            </button>

            <button
              onClick={() => {
                setShowMoreAdminMenu(false);
                onTabChange('admin-users');
              }}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                activeTab === 'admin-users'
                  ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-medium font-sans whitespace-nowrap">মেম্বারস</span>
            </button>

            {/* More Admin Options Toggle Button */}
            <button
              onClick={() => setShowMoreAdminMenu((prev) => !prev)}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                ['admin-finance', 'admin-settings', 'admin-audit'].includes(activeTab) || showMoreAdminMenu
                  ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-[10px] font-medium font-sans whitespace-nowrap">আরো...</span>
            </button>
          </nav>
        </div>
      </>
    );
  }

  const userTabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: BN.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'meals', label: BN.mealDeclaration, icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'wallet', label: BN.wallet, icon: <Wallet className="w-4 h-4" /> },
    { id: 'reports', label: BN.reports, icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'public-meals', label: 'আজকের মিল', icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Navigation Bar for Regular Users */}
      <nav className="hidden md:flex glass-panel border border-slate-800/80 p-1.5 my-3 rounded-2xl max-w-7xl mx-auto items-center justify-center gap-2 shadow-xl">
        {userTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/25 font-bold'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 font-semibold'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Floating Bottom Bar for Regular Users */}
      <div className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-md">
        <nav className="glass-panel p-1.5 rounded-2xl border border-slate-700/60 shadow-2xl shadow-cyan-950/40 flex items-center justify-around bg-slate-950/95 backdrop-blur-xl">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 text-cyan-400 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px] font-medium font-sans whitespace-nowrap">{BN.dashboard}</span>
          </button>

          <button
            onClick={() => onTabChange('meals')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
              activeTab === 'meals'
                ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 text-cyan-400 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span className="text-[10px] font-medium font-sans whitespace-nowrap">{BN.mealDeclaration}</span>
          </button>

          <button
            onClick={() => onTabChange('wallet')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
              activeTab === 'wallet'
                ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 text-cyan-400 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="text-[10px] font-medium font-sans whitespace-nowrap">{BN.wallet}</span>
          </button>

          <button
            onClick={() => onTabChange('reports')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
              activeTab === 'reports'
                ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 text-cyan-400 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-[10px] font-medium font-sans whitespace-nowrap">{BN.reports}</span>
          </button>

          <button
            onClick={() => onTabChange('public-meals')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
              activeTab === 'public-meals'
                ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 text-cyan-400 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="text-[10px] font-medium font-sans whitespace-nowrap">আজকের মিল</span>
          </button>
        </nav>
      </div>
    </>
  );
};

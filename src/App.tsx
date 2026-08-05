'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Header } from './components/common/Header';
import { Navigation, TabType } from './components/common/Navigation';
import { AmbientBackground } from './components/common/AmbientBackground';
import { Footer } from './components/common/Footer';
import { AuthScreen } from './components/auth/AuthScreen';
import { UserDashboard } from './components/user/UserDashboard';
import { MealDeclaration } from './components/user/MealDeclaration';
import { WalletScreen } from './components/user/WalletScreen';
import { UserReports } from './components/user/UserReports';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CookReport } from './components/admin/CookReport';
import { BulkMealControl } from './components/admin/BulkMealControl';
import { UserManagement } from './components/admin/UserManagement';
import { AdminUserDetail } from './components/admin/AdminUserDetail';
import { SettingsPanel } from './components/admin/SettingsPanel';
import { AuditLogScreen } from './components/admin/AuditLogScreen';
import { FinancialDashboard } from './components/admin/FinancialDashboard';
import { PublicTodaysMeal } from './components/public/PublicTodaysMeal';
import { ApiService } from './services/apiService';
import { User } from './types';

// All roles that have administrative access
const ADMIN_ROLES = new Set([
  'ADMIN', 'SUPERADMIN', 'OWNER', 'FINANCE_ADMIN',
  'MEAL_MANAGER', 'HOSTEL_MANAGER', 'AUDITOR', 'SUPPORT_ADMIN', 'READONLY_ADMIN'
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s cache
      refetchOnWindowFocus: false,
    },
  },
});

const MainApplication: React.FC = () => {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [unauthView, setUnauthView] = useState<'public-meals' | 'login'>('public-meals');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load active user on mount
  useEffect(() => {
    ApiService.getCurrentUser().then((u) => {
      if (u) {
        setCurrentUser(u);
        if (ADMIN_ROLES.has(u.role)) {
          setActiveTab('admin-dashboard');
        }
      }
    });
  }, []);

  const { data: financialMetrics } = useQuery({
    queryKey: ['financialMetrics'],
    queryFn: () => ApiService.getFinancialMetrics(),
  });

  // TanStack Queries for caching & state synchronization
  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => ApiService.getUsers(),
  });

  const { data: rates, refetch: refetchRates } = useQuery({
    queryKey: ['rates'],
    queryFn: () => ApiService.getMealRates(),
  });

  const { data: declarations = [], refetch: refetchDeclarations } = useQuery({
    queryKey: ['declarations'],
    queryFn: () => ApiService.getDeclarations(),
  });

  const { data: transactions = [], refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => ApiService.getTransactions(),
  });

  const { data: emergencies = [], refetch: refetchEmergencies } = useQuery({
    queryKey: ['emergencies'],
    queryFn: () => ApiService.getEmergencies(),
  });

  const { data: specialMeals = [], refetch: refetchSpecialMeals } = useQuery({
    queryKey: ['specialMeals'],
    queryFn: () => ApiService.getSpecialMeals(),
  });

  const handleRefreshAll = () => {
    qc.invalidateQueries();
    refetchUsers();
    refetchRates();
    refetchDeclarations();
    refetchTransactions();
    refetchEmergencies();
    refetchSpecialMeals();

    if (currentUser) {
      ApiService.getUsers().then((usrs) => {
        const updatedSelf = usrs.find((u) => u.id === currentUser.id);
        if (updatedSelf) {
          setCurrentUser(updatedSelf);
          ApiService.setCurrentUser(updatedSelf);
        }
      });
    }
  };

  const handleLogout = async () => {
    await ApiService.logout();
    setCurrentUser(null);
    setSelectedUserForDetail(null);
    setActiveTab('dashboard');
  };

  const handleSwitchRole = (newRole: 'USER' | 'ADMIN') => {
    if (!currentUser) return;
    const updated: User = { 
      ...currentUser, 
      activeMode: newRole,
      isDualMode: true,
    };
    ApiService.setCurrentUser(updated);
    setCurrentUser(updated);
    if (newRole === 'ADMIN') {
      setActiveTab('admin-dashboard');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Theme Synchronization Effect
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;
  const isAdmin = !!currentUser && (
    currentUser.activeMode === 'ADMIN' ||
    (currentUser.activeMode !== 'USER' && ADMIN_ROLES.has(currentUser.role))
  );

  // Strict route protection guard for non-admin users (Must be called before any early returns to obey React Rules of Hooks)
  useEffect(() => {
    if (currentUser && !isAdmin && activeTab.startsWith('admin-')) {
      setActiveTab('dashboard');
    }
  }, [isAdmin, activeTab, currentUser]);

  if (!currentUser || currentUser.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 relative selection:bg-cyan-500 selection:text-white">
        <AmbientBackground />
        
        {/* Top persistent mode switcher bar for guest/unauthenticated users */}
        <div className="relative z-30 pt-4 px-4 max-w-7xl mx-auto flex justify-center">
          <div className="inline-flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setUnauthView('public-meals')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 flex items-center gap-2 font-display ${
                unauthView === 'public-meals'
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌐 আজকের মিল (পাবলিক)
            </button>
            <button
              onClick={() => setUnauthView('login')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 flex items-center gap-2 font-display ${
                unauthView === 'login'
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔐 অ্যাকাউন্টে লগইন
            </button>
          </div>
        </div>

        <div className="px-4 py-6">
          {unauthView === 'public-meals' ? (
            <PublicTodaysMeal
              users={users}
              declarations={declarations}
              rates={rates}
              specialMeals={specialMeals}
              onNavigateToLogin={() => setUnauthView('login')}
            />
          ) : (
            <AuthScreen
              onLoginSuccess={(u) => {
                setCurrentUser(u);
                if (ADMIN_ROLES.has(u.role)) setActiveTab('admin-dashboard');
                else setActiveTab('dashboard');
                handleRefreshAll();
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-900 selection:bg-cyan-500 selection:text-white relative transition-colors duration-300">
      {/* Background Floating Orbs */}
      <AmbientBackground />

      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Primary Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (!isAdmin && tab.startsWith('admin-')) {
            alert('অ্যাক্সেস সংরক্ষিত: শুধুমাত্র মেস ম্যানেজার/এডমিন এই পেজে প্রবেশ করতে পারবেন।');
            setActiveTab('dashboard');
            return;
          }
          setSelectedUserForDetail(null);
          setActiveTab(tab);
        }}
        isAdmin={isAdmin}
        pendingApprovalsCount={pendingCount}
      />

      {/* Main Content Area */}
      <main className="px-4 py-6 sm:px-6 relative z-10">
        
        {/* Admin Detail Overlay */}
        {selectedUserForDetail ? (
          <AdminUserDetail
            user={selectedUserForDetail}
            adminId={currentUser.id}
            transactions={transactions}
            declarations={declarations}
            rates={rates}
            onBack={() => setSelectedUserForDetail(null)}
            onRefreshData={handleRefreshAll}
          />
        ) : (
          <>
            {/* User Navigation Screens */}
            {!isAdmin && (
              <>
                {activeTab.startsWith('admin-') && (
                  <div className="max-w-md mx-auto my-12 p-8 glass-panel border border-rose-500/40 rounded-3xl text-center space-y-4 shadow-2xl animate-scale-in">
                    <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 w-fit mx-auto">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-extrabold text-white font-display">অ্যাক্সেস ডিনাইড (Access Restricted)</h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      শুধুমাত্র অনুমোদিত মেস অ্যাডমিন/ম্যানেজারগণ অ্যাডমিন প্যানেলে প্রবেশ করতে পারবেন।
                    </p>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/25 active:scale-95 font-display"
                    >
                      মাই ড্যাশবোর্ডে ফিরে যান
                    </button>
                  </div>
                )}
                {activeTab === 'dashboard' && rates && (
                  <UserDashboard
                    currentUser={currentUser}
                    rates={rates}
                    declarations={declarations}
                    transactions={transactions.filter((t) => t.userId === currentUser.id)}
                    emergencies={emergencies}
                    onNavigateTab={(tab) => setActiveTab(tab as TabType)}
                    onRefreshData={handleRefreshAll}
                  />
                )}

                {activeTab === 'meals' && rates && (
                  <MealDeclaration
                    currentUser={currentUser}
                    rates={rates}
                    declarations={declarations}
                    emergencies={emergencies}
                    specialMeals={specialMeals}
                    onRefreshData={handleRefreshAll}
                  />
                )}

                {activeTab === 'wallet' && (
                  <WalletScreen
                    currentUser={currentUser}
                    transactions={transactions.filter((t) => t.userId === currentUser.id)}
                    declarations={declarations}
                    rates={rates}
                  />
                )}

                {activeTab === 'reports' && (
                  <UserReports currentUser={currentUser} declarations={declarations} rates={rates} specialMeals={specialMeals} />
                )}

                {activeTab === 'public-meals' && (
                  <PublicTodaysMeal
                    users={users}
                    declarations={declarations}
                    rates={rates}
                    specialMeals={specialMeals}
                    currentUser={currentUser}
                    onNavigateToLogin={() => setActiveTab('dashboard')}
                  />
                )}
              </>
            )}

            {/* Admin Navigation Screens */}
            {isAdmin && rates && (
              <>
                {activeTab === 'admin-dashboard' && (
                  <AdminDashboard
                    currentAdmin={currentUser}
                    users={users}
                    rates={rates}
                    emergencies={emergencies}
                    declarations={declarations}
                    onRefreshData={handleRefreshAll}
                    onSelectUser={(u) => setSelectedUserForDetail(u)}
                  />
                )}

                {activeTab === 'admin-cook-report' && (
                  <CookReport
                    users={users}
                    declarations={declarations}
                    rates={rates}
                    specialMeals={specialMeals}
                    emergencies={emergencies}
                  />
                )}

                {activeTab === 'admin-bulk-meals' && (
                  <BulkMealControl
                    users={users}
                    declarations={declarations}
                    rates={rates}
                    specialMeals={specialMeals}
                    emergencies={emergencies}
                    currentAdmin={currentUser}
                    onRefreshData={handleRefreshAll}
                  />
                )}

                {activeTab === 'admin-finance' && financialMetrics && (
                  <FinancialDashboard
                    metrics={financialMetrics}
                    transactions={transactions}
                    users={users}
                    currentAdmin={currentUser}
                    onRefreshData={handleRefreshAll}
                  />
                )}

                {activeTab === 'admin-users' && (
                  <UserManagement
                    users={users}
                    currentAdmin={currentUser}
                    onSelectUser={(u) => setSelectedUserForDetail(u)}
                    onRefreshData={handleRefreshAll}
                  />
                )}

                {activeTab === 'admin-settings' && (
                  <SettingsPanel rates={rates} specialMeals={specialMeals} onRefreshData={handleRefreshAll} currentUser={currentUser} />
                )}

                {activeTab === 'admin-audit' && (
                  <AuditLogScreen users={users} />
                )}

                {activeTab === 'reports' && (
                  <UserReports currentUser={currentUser} declarations={declarations} rates={rates} specialMeals={specialMeals} emergencies={emergencies} />
                )}
              </>
            )}
          </>
        )}

      </main>
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApplication />
    </QueryClientProvider>
  );
};

export default App;

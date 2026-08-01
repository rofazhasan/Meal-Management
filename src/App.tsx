import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Header } from './components/common/Header';
import { Navigation, TabType } from './components/common/Navigation';
import { AmbientBackground } from './components/common/AmbientBackground';
import { AuthScreen } from './components/auth/AuthScreen';
import { UserDashboard } from './components/user/UserDashboard';
import { MealDeclaration } from './components/user/MealDeclaration';
import { WalletScreen } from './components/user/WalletScreen';
import { UserReports } from './components/user/UserReports';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CookReport } from './components/admin/CookReport';
import { UserManagement } from './components/admin/UserManagement';
import { AdminUserDetail } from './components/admin/AdminUserDetail';
import { SettingsPanel } from './components/admin/SettingsPanel';
import { AuditLogScreen } from './components/admin/AuditLogScreen';
import { FinancialDashboard } from './components/admin/FinancialDashboard';
import { MockService } from './services/mockStorage';
import { User } from './types';

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
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load active user on mount
  useEffect(() => {
    MockService.getCurrentUser().then((u) => {
      if (u) {
        setCurrentUser(u);
        if (u.role === 'ADMIN' || u.role === 'SUPERADMIN') {
          setActiveTab('admin-dashboard');
        }
      }
    });
  }, []);

  const { data: financialMetrics } = useQuery({
    queryKey: ['financialMetrics'],
    queryFn: () => MockService.getFinancialMetrics(),
  });

  // TanStack Queries for caching & state synchronization
  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => MockService.getUsers(),
  });

  const { data: rates, refetch: refetchRates } = useQuery({
    queryKey: ['rates'],
    queryFn: () => MockService.getMealRates(),
  });

  const { data: declarations = [], refetch: refetchDeclarations } = useQuery({
    queryKey: ['declarations'],
    queryFn: () => MockService.getDeclarations(),
  });

  const { data: transactions = [], refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => MockService.getTransactions(),
  });

  const { data: emergencies = [], refetch: refetchEmergencies } = useQuery({
    queryKey: ['emergencies'],
    queryFn: () => MockService.getEmergencies(),
  });

  const { data: specialMeals = [], refetch: refetchSpecialMeals } = useQuery({
    queryKey: ['specialMeals'],
    queryFn: () => MockService.getSpecialMeals(),
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
      MockService.getUsers().then((usrs) => {
        const updatedSelf = usrs.find((u) => u.id === currentUser.id);
        if (updatedSelf) {
          setCurrentUser(updatedSelf);
        }
      });
    }
  };

  const handleLogout = async () => {
    await MockService.logout();
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
    MockService.setCurrentUser(updated);
    setCurrentUser(updated);
    if (newRole === 'ADMIN') {
      setActiveTab('admin-dashboard');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  };

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;
  const isAdmin = !!currentUser && (
    currentUser.activeMode === 'ADMIN' || 
    (currentUser.activeMode !== 'USER' && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN'))
  );

  // Strict route protection guard for non-admin users (Must be called before any early returns to obey React Rules of Hooks)
  useEffect(() => {
    if (currentUser && !isAdmin && activeTab.startsWith('admin-')) {
      setActiveTab('dashboard');
    }
  }, [isAdmin, activeTab, currentUser]);

  if (!currentUser || currentUser.status === 'PENDING') {
    return (
      <>
        <AmbientBackground />
        <AuthScreen onLoginSuccess={(u) => {
          setCurrentUser(u);
          if (u.role === 'ADMIN' || u.role === 'SUPERADMIN') setActiveTab('admin-dashboard');
          else setActiveTab('dashboard');
          handleRefreshAll();
        }} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 selection:bg-cyan-500 selection:text-white relative">
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
                  />
                )}

                {activeTab === 'reports' && (
                  <UserReports currentUser={currentUser} declarations={declarations} rates={rates} specialMeals={specialMeals} />
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
                  />
                )}

                {activeTab === 'admin-finance' && financialMetrics && (
                  <FinancialDashboard
                    metrics={financialMetrics}
                    transactions={transactions}
                    users={users}
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
                  <SettingsPanel rates={rates} specialMeals={specialMeals} onRefreshData={handleRefreshAll} />
                )}

                {activeTab === 'admin-audit' && (
                  <AuditLogScreen users={users} />
                )}

                {activeTab === 'reports' && (
                  <UserReports currentUser={currentUser} declarations={declarations} rates={rates} />
                )}
              </>
            )}
          </>
        )}

      </main>
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

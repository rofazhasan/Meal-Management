import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from './components/common/Header';
import { Navigation, TabType } from './components/common/Navigation';
import { AmbientBackground } from './components/common/AmbientBackground';
import { AuthScreen } from './components/auth/AuthScreen';
import { UserDashboard } from './components/user/UserDashboard';
import { MealDeclaration } from './components/user/MealDeclaration';
import { WalletScreen } from './components/user/WalletScreen';
import { UserReports } from './components/user/UserReports';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserManagement } from './components/admin/UserManagement';
import { AdminUserDetail } from './components/admin/AdminUserDetail';
import { SettingsPanel } from './components/admin/SettingsPanel';
import { AuditLogScreen } from './components/admin/AuditLogScreen';
import { FinancialDashboard } from './components/admin/FinancialDashboard';
import { BranchManagement } from './components/admin/BranchManagement';
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
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

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

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => MockService.getBranches(),
  });

  const { data: financialMetrics } = useQuery({
    queryKey: ['financialMetrics', selectedBranchId],
    queryFn: () => MockService.getFinancialMetrics(selectedBranchId),
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

  const handleRefreshAll = () => {
    qc.invalidateQueries();
    refetchUsers();
    refetchRates();
    refetchDeclarations();
    refetchTransactions();
    refetchEmergencies();

    if (currentUser) {
      MockService.getUsers().then((usrs) => {
        const updatedSelf = usrs.find((u) => u.id === currentUser.id);
        if (updatedSelf) {
          setCurrentUser(updatedSelf);
        }
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('meal_app_current_user_v2');
    setCurrentUser(null);
  };

  const handleSwitchRole = (newRole: 'USER' | 'ADMIN') => {
    if (!currentUser) return;
    const updated: User = { ...currentUser, role: newRole as any };
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

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN' || currentUser.activeMode === 'ADMIN';

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
                  <UserReports currentUser={currentUser} declarations={declarations} />
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

                {activeTab === 'admin-finance' && financialMetrics && (
                  <FinancialDashboard
                    metrics={financialMetrics}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    onSelectBranch={(id) => setSelectedBranchId(id)}
                  />
                )}

                {activeTab === 'admin-branches' && (
                  <BranchManagement branches={branches} />
                )}

                {activeTab === 'admin-users' && (
                  <UserManagement
                    users={users}
                    onSelectUser={(u) => setSelectedUserForDetail(u)}
                    onRefreshData={handleRefreshAll}
                  />
                )}

                {activeTab === 'admin-settings' && (
                  <SettingsPanel rates={rates} onRefreshData={handleRefreshAll} />
                )}

                {activeTab === 'admin-audit' && (
                  <AuditLogScreen users={users} />
                )}

                {activeTab === 'reports' && (
                  <UserReports currentUser={currentUser} declarations={declarations} />
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

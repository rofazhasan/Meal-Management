import { 
  User, 
  MealRateConfig, 
  MealDeclaration, 
  WalletTransaction, 
  EmergencyClosure, 
  AuditLog, 
  Branch, 
  FinancialMetrics, 
  AiInsight, 
  AdvancedUserFilter 
} from '../types';

const INITIAL_BRANCHES: Branch[] = [
  { id: 'b1', code: 'CENTRAL', name: 'সেন্ট্রাল হোস্টেল ব্রাঞ্চ', address: 'ক্যাম্পাস মেইন গেট, ঢাকা', city: 'ঢাকা', isActive: true },
  { id: 'b2', code: 'NORTH', name: 'নর্থ হোস্টেল ব্লক-এ', address: 'সেক্টর ৪, উত্তরা', city: 'ঢাকা', isActive: true },
  { id: 'b3', code: 'GIRLS', name: 'গার্লস হোস্টেল ভবন', address: 'লেক রোড, ধানমণ্ডি', city: 'ঢাকা', isActive: true },
];

const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'তানভীর আহমেদ',
    phone: '01711111111',
    password: 'user',
    role: 'USER',
    userType: 'PERMANENT',
    status: 'APPROVED',
    walletBalance: 1250,
    branchId: 'b1',
    roomNo: '৩০২',
    isDualMode: false,
    activeMode: 'USER',
    createdAt: '2026-01-15T08:00:00Z',
    profile: {
      studentId: 'CSE-2024-089',
      department: 'কম্পিউটার সায়েন্স',
      batch: '৪৯তম',
      semester: '৬ষ্ঠ',
      bloodGroup: 'B+',
      emergencyContact: '01700000000',
      hostelName: 'সেন্ট্রাল হোস্টেল',
      floor: '৩য় তলা',
      seatNumber: 'B-2',
    },
  },
  {
    id: 'u2',
    name: 'হাসান আবদুল্লাহ (অ্যাডমিন)',
    phone: '01822222222',
    password: 'admin',
    role: 'SUPERADMIN',
    userType: 'PERMANENT',
    status: 'APPROVED',
    walletBalance: 2450,
    branchId: 'b1',
    roomNo: '১০১',
    isDualMode: true,
    activeMode: 'ADMIN',
    createdAt: '2026-01-01T08:00:00Z',
    profile: {
      studentId: 'ADM-2024-001',
      department: 'ইনফরমেশন টেকনোলজি',
      batch: '৪৫তম',
      bloodGroup: 'O+',
      emergencyContact: '01800000000',
      hostelName: 'সেন্ট্রাল হোস্টেল',
      floor: '১ম তলা',
      seatNumber: 'A-1',
    },
  },
  {
    id: 'u3',
    name: 'রাফি ইসলাম',
    phone: '01933333333',
    password: 'user',
    role: 'USER',
    userType: 'GUEST',
    status: 'APPROVED',
    walletBalance: 450,
    branchId: 'b2',
    roomNo: '২০৪',
    isDualMode: false,
    activeMode: 'USER',
    createdAt: '2026-02-10T08:00:00Z',
    profile: {
      studentId: 'EEE-2024-112',
      department: 'ইলেকট্রিক্যাল ইঞ্জিনিয়ারিং',
      batch: '৫০তম',
      bloodGroup: 'AB+',
      emergencyContact: '01900000000',
      hostelName: 'নর্থ হোস্টেল ব্লক-এ',
    },
  },
  {
    id: 'u4',
    name: 'সাদিয়া সুলতানা',
    phone: '01544444444',
    password: 'user',
    role: 'USER',
    userType: 'PERMANENT',
    status: 'PENDING',
    walletBalance: 0,
    branchId: 'b3',
    roomNo: '৪০৫',
    isDualMode: false,
    activeMode: 'USER',
    createdAt: '2026-07-25T10:30:00Z',
    profile: {
      studentId: 'BBA-2025-045',
      department: 'বিজনেস এডমিনিস্ট্রেশন',
      batch: '৫২তম',
      bloodGroup: 'A+',
      emergencyContact: '01500000000',
      hostelName: 'গার্লস হোস্টেল ভবন',
    },
  },
];

const INITIAL_RATES: MealRateConfig = {
  permanent: {
    breakfast: 40,
    lunch: 70,
    dinner: 70,
    monthlyCharge: 500,
  },
  guest: {
    breakfast: 50,
    lunch: 85,
    dinner: 85,
    monthlyCharge: 0,
  },
  globalMealStatus: {
    breakfast: true,
    lunch: true,
    dinner: true,
  },
  cutoffTime: '10:00',
};

const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 't1',
    userId: 'u1',
    type: 'RECHARGE',
    amount: 1500,
    balanceBefore: 0,
    balanceAfter: 1500,
    description: 'নগদ জমা (অফিস রিচার্জ)',
    date: new Date().toISOString(),
    adminId: 'u2',
  },
  {
    id: 't2',
    userId: 'u1',
    type: 'MEAL_DEDUCTION',
    amount: 180,
    balanceBefore: 1500,
    balanceAfter: 1320,
    description: 'মিল কর্তন (নাস্তা + দুপুর + রাত)',
    date: new Date().toISOString(),
  },
  {
    id: 't3',
    userId: 'u2',
    type: 'RECHARGE',
    amount: 3000,
    balanceBefore: 0,
    balanceAfter: 3000,
    description: 'অ্যাডমিন প্রাথমিক ডিপোজিট',
    date: new Date().toISOString(),
    adminId: 'u2',
  },
];

export class MockService {
  private static STORAGE_KEY_USERS = 'meal_app_v4_users';
  private static STORAGE_KEY_RATES = 'meal_app_v4_rates';
  private static STORAGE_KEY_DECLARATIONS = 'meal_app_v4_declarations';
  private static STORAGE_KEY_TRANSACTIONS = 'meal_app_v4_transactions';
  private static STORAGE_KEY_EMERGENCIES = 'meal_app_v4_emergencies';
  private static STORAGE_KEY_AUDITS = 'meal_app_v4_audits';
  private static STORAGE_KEY_BRANCHES = 'meal_app_v4_branches';

  static async getBranches(): Promise<Branch[]> {
    const data = localStorage.getItem(this.STORAGE_KEY_BRANCHES);
    if (!data) {
      localStorage.setItem(this.STORAGE_KEY_BRANCHES, JSON.stringify(INITIAL_BRANCHES));
      return INITIAL_BRANCHES;
    }
    return JSON.parse(data);
  }

  static async getUsers(): Promise<User[]> {
    const data = localStorage.getItem(this.STORAGE_KEY_USERS);
    if (!data) {
      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(data);
  }

  static async getCurrentUser(): Promise<User | null> {
    const activeId = localStorage.getItem('meal_app_active_user_id');
    const users = await this.getUsers();
    if (activeId) {
      const found = users.find((u) => u.id === activeId);
      if (found) return found;
    }
    return users[1] || users[0] || null; // Default to admin
  }

  static async setCurrentUser(user: User): Promise<void> {
    localStorage.setItem('meal_app_active_user_id', user.id);
    const users = await this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx] = user;
      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    }
  }

  static async toggleAdminUserMode(userId: string): Promise<User | null> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;

    const nextMode = user.activeMode === 'ADMIN' ? 'USER' : 'ADMIN';
    user.activeMode = nextMode;

    await this.setCurrentUser(user);
    return user;
  }

  static async searchUsersAdvanced(filter: AdvancedUserFilter): Promise<User[]> {
    const users = await this.getUsers();
    return users.filter((u) => {
      if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        const matchName = u.name.toLowerCase().includes(term);
        const matchPhone = u.phone.includes(term);
        const matchRoom = u.roomNo?.toLowerCase().includes(term);
        const matchStudentId = u.profile?.studentId?.toLowerCase().includes(term);
        const matchDept = u.profile?.department?.toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchRoom && !matchStudentId && !matchDept) return false;
      }
      if (filter.userType && filter.userType !== 'ALL' && u.userType !== filter.userType) return false;
      if (filter.role && filter.role !== 'ALL' && u.role !== filter.role) return false;
      if (filter.branchId && filter.branchId !== 'ALL' && u.branchId !== filter.branchId) return false;
      if (filter.approvalStatus && filter.approvalStatus !== 'ALL' && u.status !== filter.approvalStatus) return false;
      if (filter.minBalance !== undefined && u.walletBalance < filter.minBalance) return false;
      if (filter.maxBalance !== undefined && u.walletBalance > filter.maxBalance) return false;
      return true;
    });
  }

  static async getMealRates(): Promise<MealRateConfig> {
    const data = localStorage.getItem(this.STORAGE_KEY_RATES);
    if (!data) {
      localStorage.setItem(this.STORAGE_KEY_RATES, JSON.stringify(INITIAL_RATES));
      return INITIAL_RATES;
    }
    return JSON.parse(data);
  }

  static async updateMealRates(newRates: MealRateConfig, adminId?: string, reason?: string): Promise<MealRateConfig> {
    localStorage.setItem(this.STORAGE_KEY_RATES, JSON.stringify(newRates));
    await this.logAudit(adminId || 'admin', 'UPDATE_MEAL_RATES', undefined, `Updated meal pricing & cutoff time: ${reason || ''}`);
    return newRates;
  }

  static async getTransactions(): Promise<WalletTransaction[]> {
    const data = localStorage.getItem(this.STORAGE_KEY_TRANSACTIONS);
    if (!data) {
      localStorage.setItem(this.STORAGE_KEY_TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(data);
  }

  static async topUpWallet(adminId: string, targetUserId: string, amount: number, note: string, reason: string): Promise<WalletTransaction> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === targetUserId);
    if (!user) throw new Error('মেম্বার খুঁজে পাওয়া যায়নি');

    const balanceBefore = user.walletBalance;
    const balanceAfter = balanceBefore + amount;
    user.walletBalance = balanceAfter;

    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));

    const transactions = await this.getTransactions();
    const newTx: WalletTransaction = {
      id: 'tx_' + Date.now(),
      userId: targetUserId,
      type: 'RECHARGE',
      amount,
      balanceBefore,
      balanceAfter,
      description: note || 'অ্যাডমিন রিচার্জ',
      date: new Date().toISOString(),
      adminId,
    };
    transactions.unshift(newTx);
    localStorage.setItem(this.STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));

    await this.logAudit(adminId, 'WALLET_TOPUP', targetUserId, `Topup ৳${amount}. Reason: ${reason}`);
    return newTx;
  }

  static async getFinancialMetrics(branchId?: string): Promise<FinancialMetrics> {
    const users = await this.getUsers();
    const txs = await this.getTransactions();
    
    const filteredUsers = branchId && branchId !== 'ALL' ? users.filter(u => u.branchId === branchId) : users;
    const filteredUserIds = new Set(filteredUsers.map(u => u.id));

    const filteredTxs = txs.filter(t => filteredUserIds.has(t.userId));

    const totalWalletBalance = filteredUsers.reduce((sum, u) => sum + u.walletBalance, 0);
    const lowBalanceUsersCount = filteredUsers.filter((u) => u.walletBalance < 150).length;

    const todayCollection = filteredTxs
      .filter((t) => t.type === 'RECHARGE')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyCollection = todayCollection * 18;
    const yearlyCollection = monthlyCollection * 11;
    const todayExpenses = todayCollection * 0.45;
    const netProfit = todayCollection - todayExpenses;
    const outstandingBalance = lowBalanceUsersCount * 250;

    const permanentRevenue = filteredTxs.filter(t => t.type === 'MEAL_DEDUCTION').reduce((s, t) => s + t.amount, 0);
    const guestRevenue = permanentRevenue * 0.25;

    const topSpenders = filteredUsers
      .map((u) => ({
        name: u.name,
        amount: txs.filter((t) => t.userId === u.id && t.type === 'MEAL_DEDUCTION').reduce((s, t) => s + t.amount, 0) || 450,
        phone: u.phone,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      todayCollection,
      monthlyCollection,
      yearlyCollection,
      todayExpenses,
      netProfit,
      outstandingBalance,
      totalWalletBalance,
      totalRefunds: 850,
      permanentRevenue,
      guestRevenue,
      topSpenders,
      lowBalanceUsersCount,
    };
  }

  static async generateAiBusinessInsights(): Promise<AiInsight> {
    const users = await this.getUsers();
    const lowCount = users.filter((u) => u.walletBalance < 150).length;

    return {
      summary: `চলতি মাসে মোট মিল গ্রহণযোগ্যতা ৮৭.৪%। আগামী সপ্তাহে শুক্রবারের স্পেশাল মিলে ১৫% বাড়তি মিল চাহিদা তৈরি হতে পারে।`,
      revenueForecast: 148500,
      mealDemandForecast: 1420,
      riskLevel: lowCount > 2 ? 'MODERATE' : 'LOW',
      recommendations: [
        'লো ব্যালেন্স ইউজারদের স্বয়ংক্রিয় SMS রিমাইন্ডার পাঠাতে পারেন।',
        'আগামী ৩ দিনের মধ্যে মুরগির মাংসের পাইকারি অর্ডারে ৫% খরচ কমানো সম্ভব।',
        'শুক্রবার দুপুরের মিল বুকিং সকাল ৯:৩০ এর মধ্যে চূড়ান্ত করার নোটিশ দেওয়া দরকার।',
      ],
      lowBalanceRiskCount: lowCount,
    };
  }

  static async logAudit(adminId: string, action: string, targetUserId?: string, details?: string): Promise<AuditLog> {
    const audits = await this.getAudits();
    const newLog: AuditLog = {
      id: 'aud_' + Date.now(),
      adminId,
      action,
      targetUserId,
      details: details || '',
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.102',
      device: 'MacBook Pro / Chrome V124',
    };
    audits.unshift(newLog);
    localStorage.setItem(this.STORAGE_KEY_AUDITS, JSON.stringify(audits));
    return newLog;
  }

  static async getAudits(): Promise<AuditLog[]> {
    const data = localStorage.getItem(this.STORAGE_KEY_AUDITS);
    if (!data) return [];
    return JSON.parse(data);
  }

  static async getDeclarations(): Promise<MealDeclaration[]> {
    const data = localStorage.getItem(this.STORAGE_KEY_DECLARATIONS);
    if (!data) return [];
    return JSON.parse(data);
  }

  static async copyPreviousDayDeclaration(userId: string, targetDate: string): Promise<MealDeclaration> {
    const decs = await this.getDeclarations();
    const targetDt = new Date(targetDate);
    targetDt.setDate(targetDt.getDate() - 1);
    const prevDateStr = targetDt.toISOString().split('T')[0];

    const prevDec = decs.find((d) => d.userId === userId && d.date === prevDateStr);
    const meals = prevDec
      ? { breakfast: prevDec.breakfast, lunch: prevDec.lunch, dinner: prevDec.dinner }
      : { breakfast: true, lunch: true, dinner: true };

    const updated = await this.updateDeclaration(userId, targetDate, meals);
    updated.isAutoCopied = true;
    return updated;
  }

  static async updateDeclaration(userId: string, date: string, meals: { breakfast: boolean; lunch: boolean; dinner: boolean }): Promise<MealDeclaration> {
    const decs = await this.getDeclarations();
    const idx = decs.findIndex((d) => d.userId === userId && d.date === date);
    const updated: MealDeclaration = {
      id: idx !== -1 ? decs[idx].id : 'dec_' + Date.now(),
      userId,
      date,
      breakfast: meals.breakfast,
      lunch: meals.lunch,
      dinner: meals.dinner,
      isAutoCopied: false,
      updatedAt: new Date().toISOString(),
    };
    if (idx !== -1) decs[idx] = updated;
    else decs.push(updated);

    localStorage.setItem(this.STORAGE_KEY_DECLARATIONS, JSON.stringify(decs));
    return updated;
  }

  static async getEmergencies(): Promise<EmergencyClosure[]> {
    const data = localStorage.getItem(this.STORAGE_KEY_EMERGENCIES);
    if (!data) return [];
    return JSON.parse(data);
  }

  static async addEmergency(adminIdOrDate: string, dateOrReason: string, reasonOrClosedMeals?: any, closedMeals?: any): Promise<EmergencyClosure> {
    let adminId = 'admin';
    let date = adminIdOrDate;
    let reason = dateOrReason;
    let meals: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];

    if (Array.isArray(reasonOrClosedMeals)) {
      date = adminIdOrDate;
      reason = dateOrReason;
      meals = reasonOrClosedMeals;
    } else if (typeof reasonOrClosedMeals === 'string') {
      adminId = adminIdOrDate;
      date = dateOrReason;
      reason = reasonOrClosedMeals;
      if (Array.isArray(closedMeals)) meals = closedMeals;
    }

    const emergencies = await this.getEmergencies();
    const newEm: EmergencyClosure = {
      id: 'em_' + Date.now(),
      date,
      reason,
      closedMeals: meals,
      createdAt: new Date().toISOString(),
    };
    emergencies.unshift(newEm);
    localStorage.setItem(this.STORAGE_KEY_EMERGENCIES, JSON.stringify(emergencies));
    await this.logAudit(adminId, 'EMERGENCY_OFF', undefined, `Emergency off for ${date}: ${reason}`);
    return newEm;
  }

  static async approveUser(adminId: string, userId: string, userType: 'PERMANENT' | 'GUEST', role: string, remark: string): Promise<User> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('মেম্বার পাওয়া যায়নি');

    user.status = 'APPROVED';
    user.userType = userType;
    if (role) user.role = role as any;

    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    await this.logAudit(adminId, 'APPROVE_USER', userId, `Approved user as ${userType}. Remark: ${remark}`);
    return user;
  }

  static async updateUserStatus(arg1: string, arg2: string, arg3?: string): Promise<User> {
    const users = await this.getUsers();
    const targetId = arg3 ? arg2 : arg1;
    const newStatus = arg3 || arg2;
    const adminId = arg3 ? arg1 : 'admin';

    const user = users.find((u) => u.id === targetId);
    if (!user) throw new Error('মেম্বার পাওয়া যায়নি');

    user.status = newStatus as any;
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    await this.logAudit(adminId, 'UPDATE_USER_STATUS', targetId, `Status updated to ${newStatus}`);
    return user;
  }

  static async addWalletBalance(arg1: any, arg2: any, arg3?: any, arg4?: any): Promise<WalletTransaction> {
    let targetUserId = String(arg1);
    let amount = typeof arg2 === 'number' ? arg2 : parseFloat(arg2);
    let note = 'অ্যাডমিন রিচার্জ';
    let adminId = 'admin';

    if (typeof arg3 === 'number' || (typeof arg3 === 'string' && !isNaN(parseFloat(arg3)))) {
      targetUserId = String(arg1);
      amount = typeof arg3 === 'number' ? arg3 : parseFloat(arg3);
      adminId = String(arg2);
      if (arg4) note = String(arg4);
    }

    return this.topUpWallet(adminId, targetUserId, amount, note, 'Manual balance add');
  }

  static async updateUserType(arg1: string, arg2: string, arg3?: string): Promise<User> {
    const users = await this.getUsers();
    const targetId = arg3 ? arg2 : arg1;
    const newType = arg3 || arg2;
    const adminId = arg3 ? arg1 : 'admin';

    const user = users.find((u) => u.id === targetId);
    if (!user) throw new Error('মেম্বার পাওয়া যায়নি');

    user.userType = newType as any;
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    await this.logAudit(adminId, 'UPDATE_USER_TYPE', targetId, `User type updated to ${newType}`);
    return user;
  }

  static async login(phone: string, pass: string): Promise<User> {
    const users = await this.getUsers();
    const found = users.find((u) => u.phone === phone);
    if (!found) throw new Error('ফোন নম্বরটি সঠিক নয়');
    if (found.password && found.password !== pass) throw new Error('পাসওয়ার্ড সঠিক নয়');
    await this.setCurrentUser(found);
    return found;
  }

  static async register(data: Partial<User>): Promise<User> {
    const users = await this.getUsers();
    const exists = users.find((u) => u.phone === data.phone);
    if (exists) throw new Error('এই ফোন নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা আছে');

    const newUser: User = {
      id: 'u_' + Date.now(),
      name: data.name || 'নতুন মেম্বার',
      phone: data.phone || '',
      password: data.password || '123456',
      role: 'USER',
      userType: data.userType || 'PERMANENT',
      status: 'PENDING',
      walletBalance: 0,
      roomNo: data.roomNo,
      branchId: 'b1',
      isDualMode: false,
      activeMode: 'USER',
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    return newUser;
  }
}

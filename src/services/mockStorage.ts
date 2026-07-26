import { User, MealRateConfig, MealDeclaration, EmergencyClosure, WalletTransaction, AuditLog, MealType } from '../types';

const USERS_KEY = 'meal_app_users_v2';
const RATES_KEY = 'meal_app_rates_v2';
const DECLARATIONS_KEY = 'meal_app_declarations_v2';
const EMERGENCIES_KEY = 'meal_app_emergencies_v2';
const TRANSACTIONS_KEY = 'meal_app_transactions_v2';
const AUDITS_KEY = 'meal_app_audits_v2';
const CURRENT_USER_KEY = 'meal_app_current_user_v2';

const INITIAL_USERS: User[] = [
  {
    id: 'u-admin-1',
    name: 'মেস ম্যানেজার (অ্যাডমিন)',
    phone: '01700000000',
    password: 'admin',
    role: 'ADMIN',
    userType: 'PERMANENT',
    status: 'APPROVED',
    walletBalance: 5000,
    roomNo: 'ম্যানেজার কক্ষ',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'u-user-1',
    name: 'রফিকুল ইসলাম',
    phone: '01711111111',
    password: 'user',
    role: 'USER',
    userType: 'PERMANENT',
    status: 'APPROVED',
    walletBalance: 1250,
    roomNo: '১০২ (দ্বিতীয় তলা)',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'u-user-2',
    name: 'তানভীর আহমেদ',
    phone: '01722222222',
    password: 'user',
    role: 'USER',
    userType: 'GUEST',
    status: 'APPROVED',
    walletBalance: 600,
    roomNo: '২০৪ (তৃতীয় তলা)',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'u-user-3',
    name: 'আরিফ হোসাইন',
    phone: '01733333333',
    password: 'user',
    role: 'USER',
    userType: 'PERMANENT',
    status: 'PENDING',
    walletBalance: 0,
    roomNo: '৩০১ (চতুর্থ তলা)',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_RATES: MealRateConfig = {
  permanent: {
    breakfast: 30,
    lunch: 70,
    dinner: 60,
    monthlyCharge: 500,
  },
  guest: {
    breakfast: 40,
    lunch: 90,
    dinner: 80,
    monthlyCharge: 0,
  },
  globalMealStatus: {
    breakfast: true,
    lunch: true,
    dinner: true,
  },
  cutoffTime: '10:00',
};

const getTodayStr = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const INITIAL_DECLARATIONS: MealDeclaration[] = [
  {
    id: 'dec-1',
    userId: 'u-user-1',
    date: getTodayStr(0),
    breakfast: true,
    lunch: true,
    dinner: true,
    isAutoCopied: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dec-2',
    userId: 'u-user-1',
    date: getTodayStr(1),
    breakfast: true,
    lunch: true,
    dinner: false,
    isAutoCopied: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dec-3',
    userId: 'u-user-2',
    date: getTodayStr(0),
    breakfast: false,
    lunch: true,
    dinner: true,
    isAutoCopied: true,
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx-1',
    userId: 'u-user-1',
    type: 'RECHARGE',
    amount: 1500,
    balanceBefore: 0,
    balanceAfter: 1500,
    description: 'মেস ম্যানেজার কর্তৃক ক্যাশ রিচার্জ গ্রহণ',
    date: getTodayStr(-3),
    adminId: 'u-admin-1',
  },
  {
    id: 'tx-2',
    userId: 'u-user-1',
    type: 'MEAL_DEDUCTION',
    amount: 160,
    balanceBefore: 1500,
    balanceAfter: 1340,
    description: 'দৈনিক মিল ব্যয় (নাস্তা ৳৩০ + দুপুর ৳৭০ + রাত ৳৬০)',
    date: getTodayStr(-1),
  },
  {
    id: 'tx-3',
    userId: 'u-user-1',
    type: 'MEAL_DEDUCTION',
    amount: 90,
    balanceBefore: 1340,
    balanceAfter: 1250,
    description: 'দৈনিক মিল ব্যয় (নাস্তা ৳৩০ + রাত ৳৬০)',
    date: getTodayStr(0),
  },
  {
    id: 'tx-4',
    userId: 'u-user-2',
    type: 'RECHARGE',
    amount: 800,
    balanceBefore: 0,
    balanceAfter: 800,
    description: 'অতিথি রিচার্জ ডিপোজিট',
    date: getTodayStr(-2),
    adminId: 'u-admin-1',
  },
];

const INITIAL_EMERGENCIES: EmergencyClosure[] = [
  {
    id: 'em-1',
    date: getTodayStr(3),
    reason: 'গ্যাস লাইন জরুরি মেনটেইনেন্স ও পরিষ্কার অভিযান',
    closedMeals: ['breakfast', 'lunch', 'dinner'],
    createdAt: new Date().toISOString(),
  },
];

const getItem = <T>(key: string, defaultVal: T): T => {
  const val = localStorage.getItem(key);
  if (!val) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
};

const setItem = <T>(key: string, val: T): void => {
  localStorage.setItem(key, JSON.stringify(val));
};

export const MockService = {
  // Initialize mock data
  init() {
    getItem(USERS_KEY, INITIAL_USERS);
    getItem(RATES_KEY, INITIAL_RATES);
    getItem(DECLARATIONS_KEY, INITIAL_DECLARATIONS);
    getItem(TRANSACTIONS_KEY, INITIAL_TRANSACTIONS);
    getItem(EMERGENCIES_KEY, INITIAL_EMERGENCIES);
    getItem(AUDITS_KEY, []);
    
    // Set initial logged in user if none
    if (!localStorage.getItem(CURRENT_USER_KEY)) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(INITIAL_USERS[1])); // Default to Rafiqul (User)
    }
  },

  // Auth & Current User
  async getCurrentUser(): Promise<User | null> {
    return getItem<User | null>(CURRENT_USER_KEY, INITIAL_USERS[1]);
  },

  async setCurrentUser(user: User): Promise<User> {
    setItem(CURRENT_USER_KEY, user);
    return user;
  },

  async login(phone: string, pass: string): Promise<User> {
    const users = getItem<User[]>(USERS_KEY, INITIAL_USERS);
    const matched = users.find(u => u.phone.trim() === phone.trim() && u.password === pass);
    if (!matched) {
      throw new Error('ফোন নম্বর অথবা পাসওয়ার্ড সঠিক নয়!');
    }
    setItem(CURRENT_USER_KEY, matched);
    return matched;
  },

  async register(data: Omit<User, 'id' | 'createdAt' | 'status' | 'walletBalance'>): Promise<User> {
    const users = getItem<User[]>(USERS_KEY, INITIAL_USERS);
    if (users.some(u => u.phone.trim() === data.phone.trim())) {
      throw new Error('এই ফোন নম্বরটি ইতোমধ্যে রেজিস্টার্ড!');
    }
    const newUser: User = {
      ...data,
      id: `u-${Date.now()}`,
      status: 'PENDING',
      walletBalance: 0,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    setItem(USERS_KEY, users);
    setItem(CURRENT_USER_KEY, newUser);
    return newUser;
  },

  // Users Management
  async getUsers(): Promise<User[]> {
    return getItem<User[]>(USERS_KEY, INITIAL_USERS);
  },

  async updateUserStatus(userId: string, status: 'APPROVED' | 'REJECTED', adminId: string): Promise<User[]> {
    const users = getItem<User[]>(USERS_KEY, INITIAL_USERS);
    const updated = users.map(u => u.id === userId ? { ...u, status } : u);
    setItem(USERS_KEY, updated);
    
    // Log audit
    const audits = getItem<AuditLog[]>(AUDITS_KEY, []);
    audits.push({
      id: `audit-${Date.now()}`,
      adminId,
      action: status === 'APPROVED' ? 'USER_APPROVED' : 'USER_REJECTED',
      targetUserId: userId,
      details: `ইউজার স্ট্যাটাস পরিবর্তন: ${status}`,
      timestamp: new Date().toISOString(),
    });
    setItem(AUDITS_KEY, audits);
    return updated;
  },

  async getAudits(): Promise<AuditLog[]> {
    return getItem<AuditLog[]>(AUDITS_KEY, []);
  },

  async bulkApproveUsers(userIds: string[], adminId: string): Promise<User[]> {
    const users = getItem<User[]>(USERS_KEY, INITIAL_USERS);
    const updated = users.map(u => userIds.includes(u.id) ? { ...u, status: 'APPROVED' as const } : u);
    setItem(USERS_KEY, updated);

    const audits = getItem<AuditLog[]>(AUDITS_KEY, []);
    userIds.forEach(id => {
      audits.push({
        id: `audit-${Date.now()}-${id}`,
        adminId,
        action: 'USER_APPROVED',
        targetUserId: id,
        details: 'বাল্ক এপ্রুভাল সম্পন্ন',
        timestamp: new Date().toISOString(),
      });
    });
    setItem(AUDITS_KEY, audits);
    return updated;
  },

  async bulkAddWalletBalance(userIds: string[], amount: number, adminId: string, remarks?: string): Promise<void> {
    const users = getItem<User[]>(USERS_KEY, INITIAL_USERS);
    const txs = getItem<WalletTransaction[]>(TRANSACTIONS_KEY, INITIAL_TRANSACTIONS);

    users.forEach(u => {
      if (userIds.includes(u.id)) {
        const before = u.walletBalance;
        const after = before + amount;
        u.walletBalance = after;

        txs.unshift({
          id: `tx-${Date.now()}-${u.id}`,
          userId: u.id,
          type: 'RECHARGE',
          amount,
          balanceBefore: before,
          balanceAfter: after,
          description: remarks || `অ্যাডমিন কর্তৃক বাল্ক পার্স রিচার্জ`,
          date: new Date().toISOString(),
          adminId,
        });
      }
    });

    setItem(USERS_KEY, users);
    setItem(TRANSACTIONS_KEY, txs);
  },

  async updateUserType(userId: string, userType: 'PERMANENT' | 'GUEST'): Promise<User[]> {
    const users = getItem<User[]>(USERS_KEY, INITIAL_USERS);
    const updated = users.map(u => u.id === userId ? { ...u, userType } : u);
    setItem(USERS_KEY, updated);
    return updated;
  },

  // Wallet
  async addWalletBalance(userId: string, amount: number, adminId: string, remarks?: string): Promise<WalletTransaction> {
    const users = getItem<User[]>(USERS_KEY, INITIAL_USERS);
    const targetIndex = users.findIndex(u => u.id === userId);
    if (targetIndex === -1) throw new Error('ইউজার পাওয়া যায়নি');

    const targetUser = users[targetIndex];
    const before = targetUser.walletBalance;
    const after = before + amount;

    users[targetIndex].walletBalance = after;
    setItem(USERS_KEY, users);

    // Update active currentUser if same
    const cur = getItem<User | null>(CURRENT_USER_KEY, null);
    if (cur && cur.id === userId) {
      cur.walletBalance = after;
      setItem(CURRENT_USER_KEY, cur);
    }

    const tx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      userId,
      type: 'RECHARGE',
      amount,
      balanceBefore: before,
      balanceAfter: after,
      description: remarks || `অ্যাডমিন কর্তৃক পার্স রিচার্জ`,
      date: new Date().toISOString(),
      adminId,
    };

    const txs = getItem<WalletTransaction[]>(TRANSACTIONS_KEY, INITIAL_TRANSACTIONS);
    txs.unshift(tx);
    setItem(TRANSACTIONS_KEY, txs);
    return tx;
  },

  async getTransactions(userId?: string): Promise<WalletTransaction[]> {
    const txs = getItem<WalletTransaction[]>(TRANSACTIONS_KEY, INITIAL_TRANSACTIONS);
    if (userId) {
      return txs.filter(t => t.userId === userId);
    }
    return txs;
  },

  // Rates & Config
  async getMealRates(): Promise<MealRateConfig> {
    return getItem<MealRateConfig>(RATES_KEY, INITIAL_RATES);
  },

  async updateMealRates(config: Partial<MealRateConfig>): Promise<MealRateConfig> {
    const current = getItem<MealRateConfig>(RATES_KEY, INITIAL_RATES);
    const updated = { ...current, ...config };
    setItem(RATES_KEY, updated);
    return updated;
  },

  // Meal Declarations & Cutoff logic
  async getDeclarations(userId?: string): Promise<MealDeclaration[]> {
    const decs = getItem<MealDeclaration[]>(DECLARATIONS_KEY, INITIAL_DECLARATIONS);
    if (userId) {
      return decs.filter(d => d.userId === userId);
    }
    return decs;
  },

  async updateDeclaration(userId: string, date: string, meals: { breakfast: boolean; lunch: boolean; dinner: boolean }): Promise<MealDeclaration> {
    const decs = getItem<MealDeclaration[]>(DECLARATIONS_KEY, INITIAL_DECLARATIONS);
    const index = decs.findIndex(d => d.userId === userId && d.date === date);

    let updatedDec: MealDeclaration;
    if (index >= 0) {
      updatedDec = {
        ...decs[index],
        ...meals,
        isAutoCopied: false,
        updatedAt: new Date().toISOString(),
      };
      decs[index] = updatedDec;
    } else {
      updatedDec = {
        id: `dec-${Date.now()}`,
        userId,
        date,
        ...meals,
        isAutoCopied: false,
        updatedAt: new Date().toISOString(),
      };
      decs.push(updatedDec);
    }

    setItem(DECLARATIONS_KEY, decs);
    return updatedDec;
  },

  // Copy Previous Day Declaration Logic
  async copyPreviousDayDeclaration(userId: string, targetDate: string): Promise<MealDeclaration> {
    const decs = getItem<MealDeclaration[]>(DECLARATIONS_KEY, INITIAL_DECLARATIONS);
    
    // Calculate previous date string
    const d = new Date(targetDate);
    d.setDate(d.getDate() - 1);
    const prevDateStr = d.toISOString().split('T')[0];

    const prevDec = decs.find(d => d.userId === userId && d.date === prevDateStr);
    const meals = prevDec ? { breakfast: prevDec.breakfast, lunch: prevDec.lunch, dinner: prevDec.dinner } : { breakfast: true, lunch: true, dinner: true };

    const newDec: MealDeclaration = {
      id: `dec-${Date.now()}`,
      userId,
      date: targetDate,
      ...meals,
      isAutoCopied: true,
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = decs.findIndex(d => d.userId === userId && d.date === targetDate);
    if (existingIdx >= 0) {
      decs[existingIdx] = newDec;
    } else {
      decs.push(newDec);
    }

    setItem(DECLARATIONS_KEY, decs);
    return newDec;
  },

  // Emergency Closures
  async getEmergencies(): Promise<EmergencyClosure[]> {
    return getItem<EmergencyClosure[]>(EMERGENCIES_KEY, INITIAL_EMERGENCIES);
  },

  async addEmergency(date: string, reason: string, closedMeals: MealType[]): Promise<EmergencyClosure> {
    const ems = getItem<EmergencyClosure[]>(EMERGENCIES_KEY, INITIAL_EMERGENCIES);
    const newEm: EmergencyClosure = {
      id: `em-${Date.now()}`,
      date,
      reason,
      closedMeals,
      createdAt: new Date().toISOString(),
    };
    ems.unshift(newEm);
    setItem(EMERGENCIES_KEY, ems);
    return newEm;
  },
};

MockService.init();

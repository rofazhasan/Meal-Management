import { 
  User, 
  UserType,
  MealRateConfig, 
  MealDeclaration, 
  WalletTransaction, 
  EmergencyClosure, 
  AuditLog, 
  FinancialMetrics, 
  AiInsight, 
  AdvancedUserFilter,
  SpecialMeal,
  ArchivedUserReplica
} from '../types';
import { getBangladeshDateStr, getBangladeshTomorrowStr, getDayOfWeekFromDateStr } from '../utils/dateUtils';

const INITIAL_SPECIAL_MEALS: SpecialMeal[] = [];

const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'তানভীর আহমেদ',
    phone: '01711111111',
    password: 'user',
    role: 'USER',
    userType: 'PERMANENT',
    status: 'APPROVED',
    walletBalance: 1000,
    isDualMode: false,
    activeMode: 'USER',
    createdAt: new Date().toISOString(),
    profile: {
      studentId: 'STU-2026-001',
      department: 'কম্পিউটার সায়েন্স',
      bloodGroup: 'B+',
      emergencyContact: '01700000000',
      hostelName: 'মেস ভবন',
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
    walletBalance: 2000,
    isDualMode: true,
    activeMode: 'ADMIN',
    createdAt: new Date().toISOString(),
    profile: {
      studentId: 'ADM-2026-001',
      department: 'ইনফরমেশন টেকনোলজি',
      bloodGroup: 'O+',
      emergencyContact: '01800000000',
      hostelName: 'মেস ভবন',
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

const INITIAL_TRANSACTIONS: WalletTransaction[] = [];

export class MockService {
  private static STORAGE_KEY_USERS = 'meal_app_v5_prod_users';
  private static STORAGE_KEY_RATES = 'meal_app_v5_prod_rates';
  private static STORAGE_KEY_DECLARATIONS = 'meal_app_v5_prod_declarations';
  private static STORAGE_KEY_TRANSACTIONS = 'meal_app_v5_prod_transactions';
  private static STORAGE_KEY_EMERGENCIES = 'meal_app_v5_prod_emergencies';
  private static STORAGE_KEY_AUDITS = 'meal_app_v5_prod_audits';
  private static STORAGE_KEY_SPECIAL_MEALS = 'meal_app_v5_prod_specials';
  private static STORAGE_KEY_ARCHIVES = 'meal_app_v5_prod_archives';

  static async getArchivedReplicas(): Promise<ArchivedUserReplica[]> {
    const data = localStorage.getItem(this.STORAGE_KEY_ARCHIVES);
    if (!data) return [];
    return JSON.parse(data);
  }

  static async deleteUserWithArchive(adminId: string, userId: string): Promise<ArchivedUserReplica> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('ইউজার পাওয়া যায়নি!');

    const declarations = await this.getDeclarations();
    const userDecs = declarations.filter((d) => d.userId === userId);

    const transactions = await this.getTransactions();
    const userTxs = transactions.filter((t) => t.userId === userId);

    const totalMeals = userDecs.reduce(
      (count, d) => count + (d.breakfast ? 1 : 0) + (d.lunch ? 1 : 0) + (d.dinner ? 1 : 0),
      0
    );
    const totalSpent = userTxs
      .filter((t) => t.type === 'MEAL_DEDUCTION')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthYear = new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });

    const archive: ArchivedUserReplica = {
      id: 'arch_' + Date.now(),
      originalUserId: user.id,
      userName: user.name,
      userMobile: user.phone,
      userType: user.userType,
      walletBalanceAtDeletion: user.walletBalance,
      deletedAt: new Date().toISOString(),
      deletedByAdminId: adminId,
      monthYear,
      totalMealsCount: totalMeals,
      totalMoneySpent: totalSpent,
      declarations: userDecs,
      transactions: userTxs,
      replicaDataJson: JSON.stringify({ user, userDecs, userTxs, archivedAt: new Date().toISOString() }, null, 2),
    };

    const archives = await this.getArchivedReplicas();
    archives.unshift(archive);
    localStorage.setItem(this.STORAGE_KEY_ARCHIVES, JSON.stringify(archives));

    // Remove user from database storage ("cloud")
    const remainingUsers = users.filter((u) => u.id !== userId);
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(remainingUsers));

    // Remove user declarations & transactions from live database
    const remainingDecs = declarations.filter((d) => d.userId !== userId);
    localStorage.setItem(this.STORAGE_KEY_DECLARATIONS, JSON.stringify(remainingDecs));

    const remainingTxs = transactions.filter((t) => t.userId !== userId);
    localStorage.setItem(this.STORAGE_KEY_TRANSACTIONS, JSON.stringify(remainingTxs));

    await this.logAudit(
      adminId,
      'DELETE_USER_WITH_ARCHIVE',
      userId,
      `মেম্বার ${user.name} (${user.phone}) ক্লাউড থেকে ডিলিট করা হয়েছে এবং ফাইল আর্কাইভ সংরক্ষণ করা হয়েছে।`
    );

    return archive;
  }

  static async deleteArchivedReplica(adminId: string, replicaId: string): Promise<void> {
    const archives = await this.getArchivedReplicas();
    const filtered = archives.filter((a) => a.id !== replicaId);
    localStorage.setItem(this.STORAGE_KEY_ARCHIVES, JSON.stringify(filtered));
    await this.logAudit(adminId, 'DELETE_ARCHIVED_REPLICA', undefined, `Deleted archive replica ID: ${replicaId}`);
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
    return null; // Require explicit login
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

  static async logout(): Promise<void> {
    localStorage.removeItem('meal_app_active_user_id');
    localStorage.removeItem('meal_app_current_user_v2');
    sessionStorage.clear();
  }

  static async updateUserProfile(userId: string, data: { name?: string; password?: string }): Promise<User> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('ইউজার পাওয়া যায়নি');

    if (data.name && data.name.trim()) {
      user.name = data.name.trim();
    }
    if (data.password && data.password.trim()) {
      user.password = data.password.trim();
    }

    await this.setCurrentUser(user);
    await this.logAudit(userId, 'UPDATE_PROFILE', userId, `Updated user profile (Name: ${data.name})`);
    return user;
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
        const matchStudentId = u.profile?.studentId?.toLowerCase().includes(term);
        const matchDept = u.profile?.department?.toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchStudentId && !matchDept) return false;
      }
      if (filter.userType && filter.userType !== 'ALL' && u.userType !== filter.userType) return false;
      if (filter.role && filter.role !== 'ALL' && u.role !== filter.role) return false;
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

  static async collectMonthlyFee(
    adminId: string,
    targetUserId: string | 'ALL',
    method: 'WALLET_DEDUCTION' | 'CASH_HAND_TO_HAND',
    amount: number,
    monthYear: string
  ): Promise<number> {
    const users = await this.getUsers();
    const transactions = await this.getTransactions();
    const targetUsers = targetUserId === 'ALL' 
      ? users.filter((u) => u.status === 'APPROVED') 
      : users.filter((u) => u.id === targetUserId);

    if (targetUsers.length === 0) throw new Error('কোনো উপযুক্ত সদস্য পাওয়া যায়নি');

    let processedCount = 0;

    for (const user of targetUsers) {
      const balanceBefore = user.walletBalance;
      let balanceAfter = balanceBefore;
      let desc = '';

      if (method === 'WALLET_DEDUCTION') {
        balanceAfter = balanceBefore - amount;
        user.walletBalance = balanceAfter;
        desc = `মাসিক ফি (৳${amount}) কর্তন - ${monthYear} (ওয়ালেট থেকে সরাসরি কর্তন)`;
      } else {
        // CASH_HAND_TO_HAND: wallet balance remains untouched!
        desc = `মাসিক ফি (৳${amount}) পরিশোধ - ${monthYear} (হাতে হাতে ক্যাশ প্রদান করা হয়েছে, ওয়ালেট থেকে কর্তন নয়)`;
      }

      const newTx: WalletTransaction = {
        id: 'tx_mf_' + user.id + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        userId: user.id,
        type: method === 'WALLET_DEDUCTION' ? 'MONTHLY_CHARGE' : 'CASH_PAID',
        amount,
        balanceBefore,
        balanceAfter,
        description: desc,
        date: new Date().toISOString(),
        adminId,
      };

      transactions.unshift(newTx);
      processedCount++;
    }

    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    localStorage.setItem(this.STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));

    await this.logAudit(
      adminId,
      'COLLECT_MONTHLY_FEE',
      targetUserId === 'ALL' ? undefined : targetUserId,
      `Monthly fee ৳${amount} collected via ${method} for ${monthYear} (${processedCount} members)`
    );

    return processedCount;
  }

  static async getFinancialMetrics(): Promise<FinancialMetrics> {
    const users = await this.getUsers();
    const txs = await this.getTransactions();

    const totalWalletBalance = users.reduce((sum, u) => sum + u.walletBalance, 0);
    const lowBalanceUsersCount = users.filter((u) => u.walletBalance < 150).length;

    const todayStr = new Date().toISOString().split('T')[0];

    const todayCollection = txs
      .filter((t) => t.type === 'RECHARGE' && t.date.startsWith(todayStr))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalRecharges = txs
      .filter((t) => t.type === 'RECHARGE')
      .reduce((sum, t) => sum + t.amount, 0);

    const permanentRevenue = txs
      .filter((t) => t.type === 'MEAL_DEDUCTION')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalRefunds = txs
      .filter((t) => t.type === 'REFUND')
      .reduce((sum, t) => sum + t.amount, 0);

    const todayExpenses = txs
      .filter((t) => t.type === 'MEAL_DEDUCTION' && t.date.startsWith(todayStr))
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalRecharges - permanentRevenue;

    const topSpenders = users
      .map((u) => {
        const spent = txs
          .filter((t) => t.userId === u.id && t.type === 'MEAL_DEDUCTION')
          .reduce((s, t) => s + t.amount, 0);
        return {
          name: u.name,
          amount: spent,
          phone: u.phone,
        };
      })
      .filter(u => u.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      todayCollection,
      monthlyCollection: totalRecharges,
      yearlyCollection: totalRecharges,
      todayExpenses,
      netProfit,
      outstandingBalance: 0,
      totalWalletBalance,
      totalRefunds,
      permanentRevenue,
      guestRevenue: 0,
      topSpenders,
      lowBalanceUsersCount,
    };
  }

  static async generateAiBusinessInsights(): Promise<AiInsight> {
    const users = await this.getUsers();
    const decs = await this.getDeclarations();
    const txs = await this.getTransactions();

    const lowCount = users.filter((u) => u.walletBalance < 150).length;
    const totalMealDeductions = txs.filter((t) => t.type === 'MEAL_DEDUCTION').reduce((s, t) => s + t.amount, 0);
    const totalDeclaredMeals = decs.reduce((sum, d) => sum + (d.breakfast ? 1 : 0) + (d.lunch ? 1 : 0) + (d.dinner ? 1 : 0), 0);

    return {
      summary: `সিস্টেমে মেম্বার সংখ্যা ${users.length} জন এবং মোট ডিক্লেয়ারকৃত মিল ${totalDeclaredMeals} টি।`,
      revenueForecast: totalMealDeductions,
      mealDemandForecast: totalDeclaredMeals,
      riskLevel: lowCount > 2 ? 'MODERATE' : 'LOW',
      recommendations: [
        lowCount > 0 ? `${lowCount} জন মেম্বারের ওয়ালেট ব্যালেন্স কম রয়েছে। এডমিন রিচার্জ রিমাইন্ডার দেওয়া যেতে পারে।` : 'সকল মেম্বারের ওয়ালেট ব্যালেন্স পর্যাপ্ত রয়েছে।',
        'বাবুর্চির দৈনিক রিপোর্টের মাধ্যমে দৈনিক বাজার বাজেট নিয়ন্ত্রণ করুন।',
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
      ipAddress: window.location.hostname || '127.0.0.1',
      device: navigator.userAgent.slice(0, 30),
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

  static async toggleIndefinitePause(userId: string): Promise<User> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('মেম্বার পাওয়া যায়নি');

    const nextState = !user.isIndefinitelyPaused;
    user.isIndefinitelyPaused = nextState;

    if (nextState) {
      // Turn off upcoming 7 days meal declarations automatically
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        await this.updateDeclaration(userId, dateStr, { breakfast: false, lunch: false, dinner: false });
      }
    }

    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    await this.setCurrentUser(user);
    return user;
  }

  static async getDeclarations(): Promise<MealDeclaration[]> {
    const todayStr = getBangladeshDateStr();
    const tomorrowStr = getBangladeshTomorrowStr();

    // Auto-trigger copying previous day's declaration for today and tomorrow
    await this.ensureAutoCopiedDeclarationsForDate(todayStr);
    await this.ensureAutoCopiedDeclarationsForDate(tomorrowStr);

    const data = localStorage.getItem(this.STORAGE_KEY_DECLARATIONS);
    if (!data) return [];
    return JSON.parse(data);
  }

  static async getDeclarationsForDate(targetDate: string): Promise<MealDeclaration[]> {
    await this.ensureAutoCopiedDeclarationsForDate(targetDate);
    const decs = await this.getDeclarations();
    return decs.filter((d) => d.date === targetDate);
  }

  static async ensureAutoCopiedDeclarationsForDate(targetDate: string): Promise<MealDeclaration[]> {
    const rawData = localStorage.getItem(this.STORAGE_KEY_DECLARATIONS);
    let decs: MealDeclaration[] = rawData ? JSON.parse(rawData) : [];

    const users = await this.getUsers();
    const approvedUsers = users.filter((u) => u.status === 'APPROVED');
    const rates = await this.getMealRates();
    const emergencies = await this.getEmergencies();

    // Check if targetDate is covered by an emergency closure
    const targetEmergency = emergencies.find((em) => {
      const start = em.date;
      const end = em.endDate || em.date;
      return targetDate >= start && targetDate <= end;
    });

    let hasChanges = false;

    for (const u of approvedUsers) {
      if (u.isIndefinitelyPaused) continue;

      const existing = decs.find((dec) => dec.userId === u.id && dec.date === targetDate);
      if (!existing) {
        let meals = { breakfast: false, lunch: false, dinner: false };

        // 1. If target date is an emergency closure day, force all meals OFF
        if (targetEmergency) {
          meals = { breakfast: false, lunch: false, dinner: false };
        } else {
          const userRates = u.userType === 'PERMANENT' ? rates.permanent : rates.guest;

          // Check if any special meal exists for targetDate
          const specB = await this.getSpecialMealForDate(targetDate, 'breakfast');
          const specL = await this.getSpecialMealForDate(targetDate, 'lunch');
          const specD = await this.getSpecialMealForDate(targetDate, 'dinner');

          const bRate = specB ? specB.customRate : userRates.breakfast;
          const lRate = specL ? specL.customRate : userRates.lunch;
          const dRate = specD ? specD.customRate : userRates.dinner;

          const minRate = Math.min(bRate, lRate, dRate);

          // 2. Wallet Protection: If user money is less than minimum meal cost, auto OFF all meals (cannot go minus!)
          if (u.walletBalance < minRate) {
            meals = { breakfast: false, lunch: false, dinner: false };
          } else {
            // 3. Search backwards (up to 7 days) for the last valid active declaration day (not emergency, not all off)
            let foundMeals = null;
            const [y, m, d] = targetDate.split('-').map(Number);
            
            for (let step = 1; step <= 7; step++) {
              const checkDt = new Date(y, m - 1, d - step);
              const checkStr = getBangladeshDateStr(checkDt);

              const wasEmergency = emergencies.some((em) => {
                const start = em.date;
                const end = em.endDate || em.date;
                return checkStr >= start && checkStr <= end;
              });
              if (wasEmergency) continue;

              const prevDec = decs.find((dec) => dec.userId === u.id && dec.date === checkStr);
              if (prevDec && (prevDec.breakfast || prevDec.lunch || prevDec.dinner)) {
                foundMeals = { breakfast: prevDec.breakfast, lunch: prevDec.lunch, dinner: prevDec.dinner };
                break;
              }
            }

            meals = foundMeals ? foundMeals : { breakfast: true, lunch: true, dinner: true };

            // 4. Enforce Master Global Meal Switches
            if (rates.globalMealStatus?.breakfast === false) meals.breakfast = false;
            if (rates.globalMealStatus?.lunch === false) meals.lunch = false;
            if (rates.globalMealStatus?.dinner === false) meals.dinner = false;

            // 5. Enforce Wallet Balance Cap so wallet NEVER goes negative
            const totalCost =
              (meals.breakfast ? bRate : 0) +
              (meals.lunch ? lRate : 0) +
              (meals.dinner ? dRate : 0);

            if (totalCost > u.walletBalance) {
              let sum = 0;
              let safeB = false;
              let safeL = false;
              let safeD = false;

              if (meals.breakfast && sum + bRate <= u.walletBalance) {
                safeB = true;
                sum += bRate;
              }
              if (meals.lunch && sum + lRate <= u.walletBalance) {
                safeL = true;
                sum += lRate;
              }
              if (meals.dinner && sum + dRate <= u.walletBalance) {
                safeD = true;
                sum += dRate;
              }
              meals = { breakfast: safeB, lunch: safeL, dinner: safeD };
            }
          }
        }

        const newDec: MealDeclaration = {
          id: 'auto_dec_' + u.id + '_' + targetDate + '_' + Date.now(),
          userId: u.id,
          date: targetDate,
          breakfast: meals.breakfast,
          lunch: meals.lunch,
          dinner: meals.dinner,
          isAutoCopied: true,
          updatedAt: new Date().toISOString(),
        };

        decs.push(newDec);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      localStorage.setItem(this.STORAGE_KEY_DECLARATIONS, JSON.stringify(decs));
    }

    return decs;
  }

  static async copyPreviousDayDeclaration(userId: string, targetDate: string): Promise<MealDeclaration> {
    const decs = await this.getDeclarations();
    const [y, m, d] = targetDate.split('-').map(Number);
    const prevDt = new Date(y, m - 1, d - 1);
    const prevDateStr = prevDt.toISOString().split('T')[0];

    const prevDec = decs.find((dec) => dec.userId === userId && dec.date === prevDateStr);
    const meals = prevDec
      ? { breakfast: prevDec.breakfast, lunch: prevDec.lunch, dinner: prevDec.dinner }
      : { breakfast: true, lunch: true, dinner: true };

    const updated = await this.updateDeclaration(userId, targetDate, meals);
    updated.isAutoCopied = true;
    return updated;
  }

  static async updateDeclaration(userId: string, date: string, meals: { breakfast: boolean; lunch: boolean; dinner: boolean }): Promise<MealDeclaration> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('মেম্বার পাওয়া যায়নি');

    const rates = await this.getMealRates();
    const userRates = user.userType === 'PERMANENT' ? rates.permanent : rates.guest;
    
    const specB = await this.getSpecialMealForDate(date, 'breakfast');
    const specL = await this.getSpecialMealForDate(date, 'lunch');
    const specD = await this.getSpecialMealForDate(date, 'dinner');

    const bPrice = specB ? specB.customRate : userRates.breakfast;
    const lPrice = specL ? specL.customRate : userRates.lunch;
    const dPrice = specD ? specD.customRate : userRates.dinner;

    const totalCost = (meals.breakfast ? bPrice : 0) + (meals.lunch ? lPrice : 0) + (meals.dinner ? dPrice : 0);

    // Strict balance lock: If total cost exceeds wallet balance, prune meals to fit within balance
    if (totalCost > user.walletBalance) {
      let sum = 0;
      let safeB = false;
      let safeL = false;
      let safeD = false;

      if (meals.breakfast && sum + bPrice <= user.walletBalance) {
        safeB = true;
        sum += bPrice;
      }
      if (meals.lunch && sum + lPrice <= user.walletBalance) {
        safeL = true;
        sum += lPrice;
      }
      if (meals.dinner && sum + dPrice <= user.walletBalance) {
        safeD = true;
        sum += dPrice;
      }

      meals.breakfast = safeB;
      meals.lunch = safeL;
      meals.dinner = safeD;
    }

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

  static async addEmergency(
    adminId: string,
    startDate: string,
    endDate: string,
    reason: string,
    closedMeals?: ('breakfast' | 'lunch' | 'dinner')[]
  ): Promise<EmergencyClosure> {
    const emergencies = await this.getEmergencies();
    const newEm: EmergencyClosure = {
      id: 'em_' + Date.now(),
      date: startDate,
      endDate: endDate && endDate >= startDate ? endDate : startDate,
      reason,
      closedMeals: closedMeals || ['breakfast', 'lunch', 'dinner'],
      createdAt: new Date().toISOString(),
    };
    emergencies.unshift(newEm);
    localStorage.setItem(this.STORAGE_KEY_EMERGENCIES, JSON.stringify(emergencies));
    await this.logAudit(adminId, 'EMERGENCY_OFF', undefined, `Emergency off from ${startDate} to ${newEm.endDate}: ${reason}`);
    return newEm;
  }

  static async getSpecialMeals(): Promise<SpecialMeal[]> {
    const data = localStorage.getItem(this.STORAGE_KEY_SPECIAL_MEALS);
    if (!data) {
      localStorage.setItem(this.STORAGE_KEY_SPECIAL_MEALS, JSON.stringify(INITIAL_SPECIAL_MEALS));
      return INITIAL_SPECIAL_MEALS;
    }
    return JSON.parse(data);
  }

  static async getSpecialMealForDate(dateStr: string, mealType?: 'breakfast' | 'lunch' | 'dinner'): Promise<SpecialMeal | undefined> {
    const specials = await this.getSpecialMeals();
    const dayOfWeek = getDayOfWeekFromDateStr(dateStr);

    return specials.find((sm) => {
      if (sm.isActive === false) return false;
      if (mealType && sm.mealType !== mealType) return false;
      if (sm.date === dateStr) return true;
      if (sm.isRecurring && sm.repeatDayOfWeek === dayOfWeek) return true;
      return false;
    });
  }

  static async addSpecialMeal(
    adminId: string, 
    date: string, 
    mealType: 'breakfast' | 'lunch' | 'dinner', 
    title: string, 
    customRate: number, 
    description?: string,
    isRecurring?: boolean,
    repeatDayOfWeek?: number
  ): Promise<SpecialMeal> {
    const specials = await this.getSpecialMeals();
    const day = repeatDayOfWeek !== undefined ? repeatDayOfWeek : getDayOfWeekFromDateStr(date);

    const newSm: SpecialMeal = {
      id: 'sm_' + Date.now(),
      date,
      mealType,
      title,
      customRate,
      description,
      isRecurring: !!isRecurring,
      repeatDayOfWeek: day,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    specials.unshift(newSm);
    localStorage.setItem(this.STORAGE_KEY_SPECIAL_MEALS, JSON.stringify(specials));
    await this.logAudit(adminId, 'ADD_SPECIAL_MEAL', undefined, `Special meal ${title} on ${date} (Recurring: ${!!isRecurring}): ৳${customRate}`);
    return newSm;
  }

  static async toggleSpecialMealActive(adminId: string, id: string): Promise<SpecialMeal | null> {
    const specials = await this.getSpecialMeals();
    const sm = specials.find(s => s.id === id);
    if (!sm) return null;

    sm.isActive = sm.isActive === false ? true : false;
    localStorage.setItem(this.STORAGE_KEY_SPECIAL_MEALS, JSON.stringify(specials));
    await this.logAudit(adminId, 'TOGGLE_SPECIAL_MEAL', undefined, `Special meal ${sm.title} active state toggled to ${sm.isActive}`);
    return sm;
  }

  static async deleteSpecialMeal(adminId: string, id: string): Promise<void> {
    const specials = await this.getSpecialMeals();
    const filtered = specials.filter(s => s.id !== id);
    localStorage.setItem(this.STORAGE_KEY_SPECIAL_MEALS, JSON.stringify(filtered));
    await this.logAudit(adminId, 'DELETE_SPECIAL_MEAL', undefined, `Deleted special meal ID: ${id}`);
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

  private static FAILED_LOGINS_KEY = 'meal_app_v5_failed_logins';

  static async login(phone: string, pass: string): Promise<User> {
    const cleanPhone = (phone || '').trim();
    const cleanPass = (pass || '').trim();

    if (!cleanPhone || !cleanPass) {
      throw new Error('ফোন নম্বর এবং পাসওয়ার্ড উভয়ই প্রদান করুন');
    }

    // Rate Limiting Check
    const failedDataStr = localStorage.getItem(this.FAILED_LOGINS_KEY);
    const failedData = failedDataStr ? JSON.parse(failedDataStr) : {};
    const record = failedData[cleanPhone] || { count: 0, lockUntil: 0 };

    if (record.lockUntil && Date.now() < record.lockUntil) {
      const waitMins = Math.ceil((record.lockUntil - Date.now()) / 60000);
      throw new Error(`অনেকগুলো ভুল চেষ্টার কারণে একাউন্টটি সাময়িকভাবে লক করা হয়েছে। ${waitMins} মিনিট পর চেষ্টা করুন।`);
    }

    const users = await this.getUsers();
    const found = users.find((u) => u.phone === cleanPhone);

    if (!found) {
      this.logFailedLogin(cleanPhone, 'ভুল ফোন নম্বর');
      throw new Error('ফোন নম্বরটি সিস্টেমে নিবন্ধিত নয়');
    }

    if (found.password && found.password !== cleanPass) {
      record.count += 1;
      if (record.count >= 5) {
        record.lockUntil = Date.now() + 5 * 60 * 1000; // 5 minute lock
      }
      failedData[cleanPhone] = record;
      localStorage.setItem(this.FAILED_LOGINS_KEY, JSON.stringify(failedData));

      await this.logAudit('system', 'FAILED_LOGIN', found.id, `ভুল পাসওয়ার্ড দিয়ে লগইনের চেষ্টা (${record.count}/5)`);
      throw new Error(`পাসওয়ার্ড সঠিক নয় (${record.count}/৫ বার চেষ্টা)`);
    }

    // Reset failed counter on success
    delete failedData[cleanPhone];
    localStorage.setItem(this.FAILED_LOGINS_KEY, JSON.stringify(failedData));

    await this.setCurrentUser(found);
    await this.logAudit(found.id, 'AUTH_LOGIN_SUCCESS', found.id, `সফলভাবে লগইন করেছেন (${found.role})`);
    return found;
  }

  private static async logFailedLogin(phone: string, reason: string): Promise<void> {
    await this.logAudit('system', 'FAILED_LOGIN_UNKNOWN', undefined, `অজানা ফোন নম্বর (${phone}): ${reason}`);
  }

  static async register(data: Partial<User>): Promise<User> {
    const cleanName = (data.name || '').trim();
    const cleanPhone = (data.phone || '').trim();
    const cleanPass = (data.password || '').trim();

    if (!cleanName || cleanName.length < 2) {
      throw new Error('দয়া করে সঠিক নাম প্রদান করুন (নূন্যতম ২ অক্ষর)');
    }

    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      throw new Error('সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর দিন (যেমন: 01711111111)');
    }

    if (!cleanPass || cleanPass.length < 4) {
      throw new Error('পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে');
    }

    const users = await this.getUsers();
    const exists = users.find((u) => u.phone === cleanPhone);
    if (exists) {
      throw new Error('এই ফোন নম্বর দিয়ে ইতিমধ্যে একাউন্ট তৈরি করা আছে');
    }

    const newUser: User = {
      id: 'u_' + Date.now(),
      name: cleanName,
      phone: cleanPhone,
      password: cleanPass,
      role: 'USER',
      userType: data.userType || 'PERMANENT',
      status: 'PENDING',
      walletBalance: 0,
      isDualMode: false,
      activeMode: 'USER',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    await this.logAudit(newUser.id, 'AUTH_REGISTER_PENDING', newUser.id, `নতুন একাউন্ট নিবন্ধন আবেদন (${cleanName})`);
    return newUser;
  }

  static async updateUserRole(adminId: string, targetUserId: string, newRole: 'USER' | 'ADMIN' | 'SUPERADMIN'): Promise<User> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === targetUserId);
    if (!user) throw new Error('মেম্বার খুঁজে পাওয়া যায়নি');

    user.role = newRole as any;
    user.isDualMode = newRole === 'ADMIN' || newRole === 'SUPERADMIN';
    if (newRole === 'ADMIN' || newRole === 'SUPERADMIN') {
      user.activeMode = user.activeMode || 'ADMIN';
    } else {
      user.activeMode = 'USER';
    }

    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    await this.logAudit(adminId, 'UPDATE_USER_ROLE', targetUserId, `User role updated to ${newRole}`);
    return user;
  }

  static async createAccountByAdmin(adminId: string, data: { name: string; phone: string; password?: string; userType: UserType; initialBalance?: number; role?: 'USER' | 'ADMIN' | 'SUPERADMIN' }): Promise<User> {
    const cleanName = (data.name || '').trim();
    const cleanPhone = (data.phone || '').trim();
    const cleanPass = (data.password || '123456').trim();

    if (!cleanName || cleanName.length < 2) {
      throw new Error('দয়া করে সঠিক নাম প্রদান করুন');
    }

    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      throw new Error('সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর দিন');
    }

    const users = await this.getUsers();
    const exists = users.find((u) => u.phone === cleanPhone);
    if (exists) {
      throw new Error('এই ফোন নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা আছে');
    }

    const targetRole = data.role || 'USER';
    const isDual = targetRole === 'ADMIN' || targetRole === 'SUPERADMIN';

    const newUser: User = {
      id: 'u_' + Date.now(),
      name: cleanName,
      phone: cleanPhone,
      password: cleanPass,
      role: targetRole as any,
      userType: data.userType || 'PERMANENT',
      status: 'APPROVED',
      walletBalance: data.initialBalance || 0,
      isDualMode: isDual,
      activeMode: isDual ? 'ADMIN' : 'USER',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));

    if (data.initialBalance && data.initialBalance > 0) {
      await this.addWalletBalance(newUser.id, data.initialBalance, adminId, 'প্রারম্ভিক জামা');
    }

    await this.logAudit(adminId, 'ADMIN_CREATE_USER', newUser.id, `অ্যাডমিন নতুন (${targetRole}) একাউন্ট তৈরি করেছেন (${cleanName})`);
    return newUser;
  }

  static async purgeSystemData(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY_DECLARATIONS);
    localStorage.removeItem(this.STORAGE_KEY_TRANSACTIONS);
    localStorage.removeItem(this.STORAGE_KEY_EMERGENCIES);
    localStorage.removeItem(this.STORAGE_KEY_AUDITS);
    localStorage.removeItem(this.STORAGE_KEY_SPECIAL_MEALS);
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(this.STORAGE_KEY_RATES, JSON.stringify(INITIAL_RATES));
  }
}

import {
  User,
  WalletTransaction,
  MealDeclaration,
  EmergencyClosure,
  SpecialMeal,
  MealRateConfig,
  AuditLog,
  FinancialMetrics,
  ArchivedUserReplica,
  UserType,
  UserRole,
  ApprovalStatus,
  RechargeRequest,
  PaymentMethod,
} from '../types';
import { normalizePhoneNumber } from '../utils/phoneUtils';

const API_BASE = '/api';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(body.error ?? `Request failed: ${res.status} ${res.statusText}`);
  }
  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

/**
 * Real Database API Client
 * Every method hits a real PostgreSQL-backed endpoint.
 * No localStorage, no in-memory fallbacks.
 */
export class ApiService {
  // ---------------------------------------------------------------------------
  // SESSION — current user stored only in sessionStorage (cleared on tab close)
  // ---------------------------------------------------------------------------
  static getCurrentUserSync(): User | null {
    const json = sessionStorage.getItem('meal_app_current_user');
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  }

  static async getCurrentUser(): Promise<User | null> {
    return this.getCurrentUserSync();
  }

  static async setCurrentUser(user: User | null): Promise<void> {
    if (!user) {
      sessionStorage.removeItem('meal_app_current_user');
    } else {
      sessionStorage.setItem('meal_app_current_user', JSON.stringify(user));
    }
  }

  static async logout(): Promise<void> {
    await this.setCurrentUser(null);
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------
  static async login(phone: string, password?: string): Promise<User> {
    const cleanPhone = normalizePhoneNumber(phone);
    const user = await apiFetch<User>(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ phone: cleanPhone, password }),
    });
    await this.setCurrentUser(user);
    return user;
  }

  static async register(data: {
    name: string;
    phone: string;
    password?: string;
    userType: UserType;
    role?: UserRole;
  }): Promise<User> {
    const cleanPhone = normalizePhoneNumber(data.phone);
    return apiFetch<User>(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ ...data, phone: cleanPhone }),
    });
  }

  // ---------------------------------------------------------------------------
  // PASSWORD RESET
  // ---------------------------------------------------------------------------
  static async requestPasswordReset(phone: string): Promise<boolean> {
    // Log the request — there is no SMS/email gate yet, just an audit trail.
    await this.logAudit('user', 'PASSWORD_RESET_REQUESTED', '', `Reset requested for ${phone}`);
    return true;
  }

  static async approvePasswordReset(
    adminId: string,
    userId: string,
    newPassword = '123',
  ): Promise<User> {
    const user = await apiFetch<User>(`${API_BASE}/users/password-reset`, {
      method: 'PUT',
      body: JSON.stringify({ adminId, userId, newPassword }),
    });
    await this.logAudit(adminId, 'PASSWORD_RESET_APPROVED', userId, 'Admin reset user password');
    return user;
  }

  static async rejectPasswordReset(adminId: string, userId: string): Promise<void> {
    await this.logAudit(adminId, 'PASSWORD_RESET_REJECTED', userId, 'Password reset request rejected');
  }

  // ---------------------------------------------------------------------------
  // USERS
  // ---------------------------------------------------------------------------
  static async getUsers(): Promise<User[]> {
    return apiFetch<User[]>(`${API_BASE}/users`);
  }

  static async updateUserStatus(
    userId: string,
    status: ApprovalStatus,
    adminId: string,
  ): Promise<User> {
    const user = await apiFetch<User>(`${API_BASE}/users/status`, {
      method: 'POST',
      body: JSON.stringify({ userId, status, adminId }),
    });
    await this.logAudit(adminId, 'USER_STATUS_CHANGED', userId, `Status changed to ${status}`);
    return user;
  }

  static async updateUserRole(
    adminId: string,
    targetUserId: string,
    newRole: UserRole,
  ): Promise<User> {
    const user = await apiFetch<User>(`${API_BASE}/users/role`, {
      method: 'POST',
      body: JSON.stringify({ userId: targetUserId, role: newRole, adminId }),
    });
    await this.logAudit(adminId, 'USER_ROLE_CHANGED', targetUserId, `Role changed to ${newRole}`);
    return user;
  }

  static async updateUserType(arg1: string, arg2: string, arg3?: string): Promise<User> {
    const adminId  = arg3 ? arg1 : 'admin';
    const targetId = arg3 ? arg2 : arg1;
    const newType  = (arg3 ?? arg2) as UserType;

    const user = await apiFetch<User>(`${API_BASE}/users/type`, {
      method: 'POST',
      body: JSON.stringify({ userId: targetId, userType: newType, adminId }),
    });
    await this.logAudit(adminId, 'USER_TYPE_CHANGED', targetId, `Type changed to ${newType}`);
    return user;
  }

  static async setUserIndefinitePause(userId: string, isPaused: boolean): Promise<User> {
    const result = await apiFetch<{ success: boolean; userId: string; isPaused: boolean }>(
      `${API_BASE}/users/pause`,
      { method: 'POST', body: JSON.stringify({ userId, isPaused }) },
    );
    return { id: userId, isIndefinitelyPaused: result.isPaused } as User;
  }

  static async toggleIndefinitePause(userId: string): Promise<User> {
    const users = await this.getUsers();
    const user  = users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');
    return this.setUserIndefinitePause(userId, !user.isIndefinitelyPaused);
  }

  static async deleteUserWithArchive(adminId: string, userId: string): Promise<void> {
    await apiFetch<{ success: boolean }>(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
    await this.logAudit(adminId, 'USER_DELETED', userId, 'User account soft-deleted');
  }

  static async createAccountByAdmin(adminId: string, data: {
    name: string;
    phone: string;
    password?: string;
    userType?: UserType;
    role?: UserRole;
    initialBalance?: number;
  }): Promise<User> {
    const newUser = await this.register({
      name: data.name,
      phone: data.phone,
      password: data.password ?? '123456',
      userType: data.userType ?? 'PERMANENT',
      role: data.role ?? 'USER',
    });
    if (data.initialBalance && data.initialBalance > 0) {
      await this.addWalletBalance(
        adminId,
        newUser.id,
        data.initialBalance,
        'RECHARGE',
        'প্রারম্ভিক অ্যাকাউন্ট ব্যালেন্স জমা',
      );
      newUser.walletBalance = data.initialBalance;
    }
    await this.logAudit(adminId, 'USER_CREATED_BY_ADMIN', newUser.id, `Admin created account for ${newUser.name}`);
    return newUser;
  }

  /** No-ops kept for API surface compatibility — not used in production. */
  static async seed300TestUsers(): Promise<number> { return 0; }
  static async deleteAllTestUsersExceptAdmin(): Promise<number> { return 0; }

  static async updateUserProfile(userId: string, profile: Record<string, unknown>): Promise<User> {
    const result = await apiFetch<{ id: string; profile: Record<string, unknown> }>(
      `${API_BASE}/users/profile/${userId}`,
      { method: 'PUT', body: JSON.stringify(profile) },
    );
    // Merge the updated profile into the current user session if it matches
    const current = await this.getCurrentUser();
    if (current?.id === userId) {
      const merged = { ...current, profile: { ...current.profile, ...result.profile } };
      await this.setCurrentUser(merged);
      return merged;
    }
    return { id: userId, profile: result.profile } as unknown as User;
  }

  // ---------------------------------------------------------------------------
  // MEAL RATES
  // ---------------------------------------------------------------------------
  static async getMealRates(): Promise<MealRateConfig> {
    return apiFetch<MealRateConfig>(`${API_BASE}/rates`);
  }

  static async updateMealRates(rates: MealRateConfig, adminId?: string): Promise<MealRateConfig> {
    const updated = await apiFetch<MealRateConfig>(`${API_BASE}/rates`, {
      method: 'PUT',
      body: JSON.stringify({ ...rates, adminId }),
    });
    await this.logAudit(adminId ?? 'admin', 'MEAL_RATES_UPDATED', '', 'Meal rates updated');
    return updated;
  }

  // ---------------------------------------------------------------------------
  // MEAL DECLARATIONS
  // ---------------------------------------------------------------------------
  static async getDeclarations(): Promise<MealDeclaration[]> {
    return apiFetch<MealDeclaration[]>(`${API_BASE}/declarations`);
  }

  static async getDeclarationsForDate(date: string): Promise<MealDeclaration[]> {
    return apiFetch<MealDeclaration[]>(`${API_BASE}/declarations?date=${date}`);
  }

  static async updateDeclaration(
    userId: string,
    date: string,
    meals: { breakfast: boolean; lunch: boolean; dinner: boolean },
    isAdminOverride = false,
  ): Promise<MealDeclaration> {
    const res = await apiFetch<MealDeclaration & { walletBalance?: number }>(`${API_BASE}/declarations`, {
      method: 'POST',
      body: JSON.stringify({ userId, date, ...meals, isAdminOverride }),
    });

    const current = await this.getCurrentUser();
    if (current?.id === userId && res.walletBalance !== undefined) {
      const updatedUser = { ...current, walletBalance: res.walletBalance };
      await this.setCurrentUser(updatedUser);
    }

    return res;
  }

  static async bulkUpdateDeclarations(
    updates: { userId: string; date: string; meals: { breakfast: boolean; lunch: boolean; dinner: boolean } }[],
    isAdminOverride = true,
  ): Promise<void> {
    await apiFetch<{ success: boolean; count: number }>(`${API_BASE}/declarations/bulk`, {
      method: 'POST',
      body: JSON.stringify({ updates, isAdminOverride }),
    });
  }

  static async copyPreviousDayDeclaration(userId: string, targetDate: string): Promise<MealDeclaration> {
    const targetDt = new Date(`${targetDate}T12:00:00`);
    targetDt.setDate(targetDt.getDate() - 1);
    const yesterdayStr = targetDt.toISOString().split('T')[0];

    const allDecls = await this.getDeclarations();
    const prevDecl = allDecls.find((d) => d.userId === userId && d.date === yesterdayStr);

    const mealsToCopy = prevDecl
      ? { breakfast: prevDecl.breakfast, lunch: prevDecl.lunch, dinner: prevDecl.dinner }
      : { breakfast: true, lunch: true, dinner: true };

    return this.updateDeclaration(userId, targetDate, mealsToCopy, false);
  }

  // ---------------------------------------------------------------------------
  // WALLET & TRANSACTIONS
  // ---------------------------------------------------------------------------
  static async getTransactions(): Promise<WalletTransaction[]> {
    return apiFetch<WalletTransaction[]>(`${API_BASE}/transactions`);
  }

  /**
   * Unified wallet top-up.
   * Supports three calling conventions used across the codebase:
   *   addWalletBalance(adminId, userId, amount, type?, note?)
   *   addWalletBalance(userId, amount, adminId?, note?)
   *   addWalletBalance({ userId, amount, note?, adminId? })
   */
  static async addWalletBalance(...args: unknown[]): Promise<WalletTransaction> {
    let targetUserId = '';
    let amount = 0;
    let adminId = 'admin';
    let note = 'অ্যাডমিন রিচার্জ';

    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      const obj = args[0] as Record<string, unknown>;
      targetUserId = String(obj.userId ?? '');
      amount       = Number(obj.amount ?? 0);
      note         = String(obj.note ?? note);
      adminId      = String(obj.adminId ?? adminId);
    } else if (typeof args[2] === 'number') {
      // (adminId, userId, amount, type?, note?)
      adminId      = String(args[0] ?? 'admin');
      targetUserId = String(args[1] ?? '');
      amount       = args[2];
      // args[3] may be the legacy TransactionType string — skip it, args[4] = note
      if (args[4]) note = String(args[4]);
      else if (args[3] && typeof args[3] === 'string' && !['RECHARGE','MEAL_DEDUCTION','MONTHLY_CHARGE','REFUND','PENALTY','DISCOUNT','CASH_PAID'].includes(args[3] as string)) {
        note = String(args[3]);
      }
    } else if (typeof args[1] === 'number') {
      // (userId, amount, adminId?, note?)
      targetUserId = String(args[0] ?? '');
      amount       = args[1];
      if (args[2]) adminId = String(args[2]);
      if (args[3]) note    = String(args[3]);
    }

    const tx = await apiFetch<{ id: string; userId: string; amount: number; type: string; balanceBefore: number; balanceAfter: number; date: string; description: string }>(
      `${API_BASE}/wallets/topup`,
      { method: 'POST', body: JSON.stringify({ adminId, userId: targetUserId, amount, note }) },
    );

    const current = await this.getCurrentUser();
    if (current?.id === targetUserId && tx.balanceAfter !== undefined) {
      const updatedUser = { ...current, walletBalance: tx.balanceAfter };
      await this.setCurrentUser(updatedUser);
    }

    return {
      id:            tx.id,
      userId:        targetUserId,
      type:          (tx.type as any) || (amount >= 0 ? 'RECHARGE' : 'DEBIT'),
      amount:        tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter:  tx.balanceAfter,
      description:   tx.description ?? note,
      date:          tx.date ?? new Date().toISOString(),
      adminId,
    };
  }

  // ---------------------------------------------------------------------------
  // RECHARGE REQUESTS
  // ---------------------------------------------------------------------------
  static async getRechargeRequests(): Promise<RechargeRequest[]> {
    return apiFetch<RechargeRequest[]>(`${API_BASE}/recharge-requests`);
  }

  static async createRechargeRequest(data: {
    userId: string;
    userName: string;
    userPhone: string;
    amount: number;
    paymentMethod: PaymentMethod;
    trxId?: string;
    note?: string;
  }): Promise<RechargeRequest> {
    const created = await apiFetch<RechargeRequest>(`${API_BASE}/recharge-requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await this.logAudit(
      data.userId,
      'RECHARGE_REQUEST_CREATED',
      data.userId,
      `Requested ৳${data.amount} via ${data.paymentMethod} (TrxID: ${data.trxId ?? 'N/A'})`,
    );
    return created;
  }

  static async approveRechargeRequest(
    requestId: string,
    adminId: string,
  ): Promise<{ request: RechargeRequest; transaction: WalletTransaction }> {
    const result = await apiFetch<{ request: RechargeRequest; transaction: WalletTransaction }>(
      `${API_BASE}/recharge-requests`,
      {
        method: 'PATCH',
        body: JSON.stringify({ requestId, adminId, status: 'APPROVED' }),
      },
    );
    await this.logAudit(
      adminId,
      'RECHARGE_REQUEST_APPROVED',
      result.request.userId,
      `Approved ৳${result.request.amount} for ${result.request.userName}`,
    );
    return result;
  }

  static async rejectRechargeRequest(
    requestId: string,
    adminId: string,
    reason?: string,
  ): Promise<RechargeRequest> {
    const result = await apiFetch<{ request: RechargeRequest }>(
      `${API_BASE}/recharge-requests`,
      {
        method: 'PATCH',
        body: JSON.stringify({ requestId, adminId, status: 'REJECTED', rejectionReason: reason }),
      },
    );
    await this.logAudit(
      adminId,
      'RECHARGE_REQUEST_REJECTED',
      result.request.userId,
      `Rejected ৳${result.request.amount}. Reason: ${result.request.rejectionReason ?? reason}`,
    );
    return result.request;
  }

  static async collectMonthlyFee(
    adminId: string,
    targetUserId: string,
    method: string,
    amount: number,
    monthYear: string,
  ): Promise<number> {
    const { count } = await apiFetch<{ count: number }>(`${API_BASE}/monthly-fees`, {
      method: 'POST',
      body: JSON.stringify({ adminId, targetUserId, method, amount, monthYear }),
    });
    await this.logAudit(
      adminId,
      'MONTHLY_FEE_COLLECTED',
      targetUserId,
      `Collected ৳${amount} monthly fee for ${count} user(s) (${monthYear})`,
    );
    return count;
  }

  // ---------------------------------------------------------------------------
  // EMERGENCIES
  // ---------------------------------------------------------------------------
  static async getEmergencies(): Promise<EmergencyClosure[]> {
    const rows = await apiFetch<Record<string, unknown>[]>(`${API_BASE}/emergencies`);
    return rows.map((r) => ({
      id:       String(r.id),
      date:     r.date as string,
      endDate:  (r.endDate as string) ?? (r.date as string),
      reason:   (r.reason as string) ?? 'Emergency closure',
      closedMeals: Array.isArray(r.closedMeals) && r.closedMeals.length > 0
        ? (r.closedMeals as ('breakfast' | 'lunch' | 'dinner')[])
        : ['breakfast', 'lunch', 'dinner'],
      createdAt: (r.createdAt as string) ?? new Date().toISOString(),
    }));
  }

  static async addEmergency(data: {
    date: string;
    endDate?: string;
    reason?: string;
    closedMeals?: string[];
  }): Promise<EmergencyClosure> {
    const raw = await apiFetch<Record<string, unknown>>(`${API_BASE}/emergencies`, {
      method: 'POST',
      body: JSON.stringify({
        date: data.date,
        endDate: data.endDate ?? data.date,
        reason: data.reason ?? 'Emergency closure',
        closedMeals: data.closedMeals ?? ['breakfast', 'lunch', 'dinner'],
      }),
    });
    return {
      id:         String(raw.id),
      date:       (raw.date as string) ?? data.date,
      endDate:    (raw.endDate as string) ?? data.endDate ?? data.date,
      reason:     (raw.reason as string) ?? data.reason ?? 'Emergency closure',
      closedMeals: Array.isArray(raw.closedMeals) && raw.closedMeals.length > 0
        ? (raw.closedMeals as ('breakfast' | 'lunch' | 'dinner')[])
        : ['breakfast', 'lunch', 'dinner'],
      createdAt: new Date().toISOString(),
    };
  }

  static async removeEmergency(id: string): Promise<void> {
    await apiFetch<{ success: boolean }>(`${API_BASE}/emergencies/${id}`, { method: 'DELETE' });
  }

  // ---------------------------------------------------------------------------
  // SPECIAL MEALS
  // ---------------------------------------------------------------------------
  static async getSpecialMeals(): Promise<SpecialMeal[]> {
    return apiFetch<SpecialMeal[]>(`${API_BASE}/special-meals`);
  }

  static async getSpecialMealForDate(
    date: string,
    type: 'breakfast' | 'lunch' | 'dinner',
  ): Promise<SpecialMeal | null> {
    const meals = await this.getSpecialMeals();
    return (
      meals.find(
        (item) =>
          item.isActive !== false &&
          item.mealType === type &&
          (item.date === date ||
            (item.isRecurring &&
              item.repeatDayOfWeek === new Date(`${date}T12:00:00`).getDay())),
      ) ?? null
    );
  }

  static async addSpecialMeal(data: {
    adminId?: string;
    date: string;
    mealType: string;
    title: string;
    customRate: number;
    description?: string;
    isRecurring?: boolean;
    repeatDayOfWeek?: number;
  }): Promise<SpecialMeal> {
    return apiFetch<SpecialMeal>(`${API_BASE}/special-meals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async toggleSpecialMealActive(
    adminIdOrId: string,
    id?: string,
    currentState?: boolean,
  ): Promise<SpecialMeal> {
    const resolvedId      = id ?? adminIdOrId;
    const resolvedCurrent = currentState;
    return apiFetch<SpecialMeal>(`${API_BASE}/special-meals`, {
      method: 'PATCH',
      body: JSON.stringify({
        id: resolvedId,
        isActive: resolvedCurrent === undefined ? false : !resolvedCurrent,
      }),
    });
  }

  static async deleteSpecialMeal(adminIdOrId: string, id?: string): Promise<void> {
    const resolvedId = id ?? adminIdOrId;
    await apiFetch<void>(`${API_BASE}/special-meals?id=${encodeURIComponent(resolvedId)}`, {
      method: 'DELETE',
    });
  }

  // ---------------------------------------------------------------------------
  // FINANCIAL METRICS  (server-side aggregated)
  // ---------------------------------------------------------------------------
  static async getFinancialMetrics(): Promise<FinancialMetrics> {
    return apiFetch<FinancialMetrics>(`${API_BASE}/financial-metrics`);
  }

  // ---------------------------------------------------------------------------
  // AUDIT LOGS
  // ---------------------------------------------------------------------------
  static async getAuditLogs(): Promise<AuditLog[]> {
    return apiFetch<AuditLog[]>(`${API_BASE}/audits`);
  }

  /** Alias used by some admin screens. */
  static async getAudits(): Promise<AuditLog[]> {
    return this.getAuditLogs();
  }

  static async logAudit(
    adminId: string,
    action: string,
    targetUserId: string,
    details: string,
  ): Promise<void> {
    try {
      await apiFetch<AuditLog>(`${API_BASE}/audits`, {
        method: 'POST',
        body: JSON.stringify({ adminId, action, targetUserId, details }),
      });
    } catch (err) {
      // Audit failures must never break user-facing flows — log and continue.
      console.warn('[audit] write failed:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // ARCHIVED REPLICAS  (not yet implemented server-side — returns empty)
  // ---------------------------------------------------------------------------
  static async getArchivedReplicas(): Promise<ArchivedUserReplica[]> {
    return [];
  }

  // ---------------------------------------------------------------------------
  // SYSTEM RESET
  // ---------------------------------------------------------------------------
  static async purgeSystemData(adminId?: string): Promise<void> {
    await apiFetch<{ success: boolean }>(`${API_BASE}/system/reset`, {
      method: 'POST',
      body: JSON.stringify({ adminId, confirmReset: true }),
    });
  }
}



export type UserRole = 'USER' | 'ADMIN';
export type UserType = 'PERMANENT' | 'GUEST';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface User {
  id: string;
  name: string;
  phone: string;
  password?: string;
  role: UserRole;
  userType: UserType;
  status: ApprovalStatus;
  walletBalance: number;
  roomNo?: string;
  createdAt: string;
}

export interface MealRates {
  breakfast: number;
  lunch: number;
  dinner: number;
  monthlyCharge: number;
}

export interface MealRateConfig {
  permanent: MealRates;
  guest: MealRates;
  globalMealStatus: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  cutoffTime: string; // "10:00"
}

export interface MealDeclaration {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  isAutoCopied?: boolean;
  updatedAt: string;
}

export interface EmergencyClosure {
  id: string;
  date: string; // YYYY-MM-DD
  reason: string;
  closedMeals: MealType[];
  createdAt: string;
}

export type TransactionType = 'RECHARGE' | 'MEAL_DEDUCTION' | 'MONTHLY_CHARGE' | 'REFUND';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  date: string; // ISO String or YYYY-MM-DD
  adminId?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  details: string;
  timestamp: string;
}

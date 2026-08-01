export type UserRole = 
  | 'SUPERADMIN'
  | 'OWNER'
  | 'FINANCE_ADMIN'
  | 'MEAL_MANAGER'
  | 'HOSTEL_MANAGER'
  | 'AUDITOR'
  | 'SUPPORT_ADMIN'
  | 'READONLY_ADMIN'
  | 'USER'
  | 'ADMIN'; // backwards compatibility

export type UserType = 'PERMANENT' | 'GUEST';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface RichProfile {
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  nationalId?: string;
  studentId?: string;
  department?: string;
  batch?: string;
  semester?: string;
  rollNumber?: string;
  hostelName?: string;
  building?: string;
  floor?: string;
  roomNumber?: string;
  seatNumber?: string;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: UserRole;
  userType: UserType;
  status: ApprovalStatus;
  walletBalance: number;
  roomNo?: string;
  profile?: RichProfile;
  isDualMode?: boolean;
  activeMode?: 'ADMIN' | 'USER';
  isIndefinitelyPaused?: boolean;
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

export interface SpecialMeal {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  title: string;
  customRate: number;
  description?: string;
  isRecurring?: boolean;
  repeatDayOfWeek?: number; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  isActive?: boolean;
  createdAt: string;
}

export type TransactionType = 
  | 'RECHARGE' 
  | 'MEAL_DEDUCTION' 
  | 'MONTHLY_CHARGE' 
  | 'REFUND' 
  | 'PENALTY' 
  | 'DISCOUNT'
  | 'CASH_PAID';

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
  ipAddress?: string;
  device?: string;
  reason?: string;
}

export interface ArchivedUserReplica {
  id: string;
  originalUserId: string;
  userName: string;
  userMobile: string;
  userRoom?: string;
  userType: 'PERMANENT' | 'GUEST';
  walletBalanceAtDeletion: number;
  deletedAt: string;
  deletedByAdminId: string;
  monthYear: string;
  totalMealsCount: number;
  totalMoneySpent: number;
  declarations: MealDeclaration[];
  transactions: WalletTransaction[];
  replicaDataJson: string;
}

export interface FinancialMetrics {
  todayCollection: number;
  monthlyCollection: number;
  yearlyCollection: number;
  todayExpenses: number;
  netProfit: number;
  outstandingBalance: number;
  totalWalletBalance: number;
  totalRefunds: number;
  permanentRevenue: number;
  guestRevenue: number;
  topSpenders: { name: string; amount: number; phone: string }[];
  lowBalanceUsersCount: number;
}

export interface AiInsight {
  summary: string;
  revenueForecast: number;
  mealDemandForecast: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  recommendations: string[];
  lowBalanceRiskCount: number;
}

export interface AdvancedUserFilter {
  searchTerm?: string;
  userType?: UserType | 'ALL';
  role?: UserRole | 'ALL';
  approvalStatus?: ApprovalStatus | 'ALL';
  minBalance?: number;
  maxBalance?: number;
  department?: string;
  batch?: string;
}


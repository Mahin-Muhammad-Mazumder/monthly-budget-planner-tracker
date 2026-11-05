export type CategoryType = 'FIXED' | 'VARIABLE';

export type CurrencyCode = 'BDT' | 'USD';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  allocated: number;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface ArchivedCategorySummary {
  id: string;
  name: string;
  type: CategoryType;
  allocated: number;
  spent: number;
}

export interface MonthlyArchiveSnapshot {
  id: string;
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g., "July 2026"
  closedAt: string;
  masterBudget: number;
  totalSpent: number;
  fixedSpent: number;
  variableSpent: number;
  savingsAllocated: number;
  unspentVariableSurplus: number;
  surplusRolledOver: boolean;
  finalSavingsAdded: number;
  cumulativeSavingsAfterClose: number;
  finalSavingsRatePercent: number;
  healthScore: number;
  categories: ArchivedCategorySummary[];
  transactions: Transaction[];
}

export interface WealthState {
  version: number;
  user: string;
  currency: CurrencyCode;
  activeMonthKey: string; // YYYY-MM, e.g., "2026-10"
  activeMonthLabel: string; // e.g., "October 2026"
  currentDayOverride?: number | null; // Optional simulation override; null uses real calendar day
  masterBudget: number;
  savingsAllocated: number;
  cumulativeSavingsReserve: number;
  categories: Category[];
  transactions: Transaction[];
  archives: MonthlyArchiveSnapshot[];
}

export interface CategoryMetrics extends Category {
  spent: number;
  remaining: number;
  utilizationPercent: number;
  txCount: number;
  status: 'NOMINAL' | 'NEAR_LIMIT' | 'OVER_BUDGET';
}

export interface DerivedMetrics {
  // Macro metrics
  masterBudget: number;
  totalAllocatedCategories: number;
  fixedAllocatedTotal: number;
  variableAllocatedTotal: number;
  savingsAllocated: number;
  unallocatedCapital: number;
  totalSpent: number;
  fixedSpentTotal: number;
  variableSpentTotal: number;
  remainingBalance: number;
  cumulativeSavingsReserve: number;

  // Time & Velocity
  daysInMonth: number;
  currentDayOfMonth: number;
  daysLeftInMonth: number;
  remainingVariableAllocation: number;
  dailySafeToSpend: number;
  expectedVariableSpendToDate: number;
  variableBurnDelta: number; // Actual - Expected (positive = over pace, negative = under pace)
  variableBurnPacePercent: number; // Percentage over (+) or under (-) expected pace
  isVariableOverPace: boolean;
  variableDailyBurnStatusString: string; // e.g., "UNDER_PACE_BY_8.4_PERCENT" or "OVER_PACE_BY_14.2_PERCENT"

  // Health Score (0-100)
  variablePaceScore: number; // out of 40
  savingsEfficiencyScore: number; // out of 30
  fixedAdherenceScore: number; // out of 30
  financialHealthScore: number; // 0-100 rounded integer

  // Enriched categories
  categoryMetrics: CategoryMetrics[];
  topOverspentCategories: {
    name: string;
    type: CategoryType;
    allocated: number;
    spent: number;
    overage: number;
  }[];
}

export interface WarrenPayload {
  user: string;
  total_budget: number;
  total_spent: number;
  remaining_balance: number;
  unallocated_capital: number;
  days_left_in_month: number;
  daily_safe_to_spend: number;
  variable_daily_burn_status: string;
  savings_allocated: number;
  financial_health_score: number;
  top_overspent_categories: {
    name: string;
    type: CategoryType;
    allocated: number;
    spent: number;
    overage: number;
  }[];
  user_message: string;
}

export interface WarrenMessage {
  id: string;
  role: 'user' | 'warren';
  content: string;
  timestamp: string;
  isAudit?: boolean;
  source?: 'gemini' | 'deterministic';
}

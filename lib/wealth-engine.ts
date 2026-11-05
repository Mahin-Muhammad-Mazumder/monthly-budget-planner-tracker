import {
  Category,
  CategoryMetrics,
  CurrencyCode,
  DerivedMetrics,
  MonthlyArchiveSnapshot,
  Transaction,
  WarrenPayload,
  WealthState,
} from './wealth-types';

export const STORAGE_KEY = 'apex_wealth_v1';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  options?: { showDecimals?: boolean; showSign?: boolean }
): string {
  const symbol = currency === 'BDT' ? '৳' : '$';
  const absVal = Math.abs(amount);
  const decimals = options?.showDecimals ? 2 : 0;

  const formattedNumber = absVal.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (amount < 0) {
    return `-${symbol}${formattedNumber}`;
  }
  if (options?.showSign && amount > 0) {
    return `+${symbol}${formattedNumber}`;
  }
  return `${symbol}${formattedNumber}`;
}

export function getDaysInMonth(monthKey: string): number {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10) || 2026;
  const month = parseInt(monthStr, 10) || 10;
  return new Date(year, month, 0).getDate();
}

export function getCurrentDayForMonth(
  monthKey: string,
  overrideDay?: number | null
): number {
  const daysInMonth = getDaysInMonth(monthKey);
  if (typeof overrideDay === 'number' && overrideDay >= 1) {
    return clamp(overrideDay, 1, daysInMonth);
  }
  const now = new Date();
  const realDay = now.getDate();
  return clamp(realDay, 1, daysInMonth);
}

/**
 * Core deterministic financial calculation engine
 */
export function calculateDerivedMetrics(state: WealthState): DerivedMetrics {
  const masterBudget = Math.max(0, state.masterBudget);
  const savingsAllocated = Math.max(0, state.savingsAllocated);

  // Spend per category
  const spendMap = new Map<string, { spent: number; count: number }>();
  for (const tx of state.transactions) {
    const current = spendMap.get(tx.categoryId) || { spent: 0, count: 0 };
    spendMap.set(tx.categoryId, {
      spent: current.spent + tx.amount,
      count: current.count + 1,
    });
  }

  let fixedAllocatedTotal = 0;
  let variableAllocatedTotal = 0;
  let fixedSpentTotal = 0;
  let variableSpentTotal = 0;

  const categoryMetrics: CategoryMetrics[] = state.categories.map((cat) => {
    const txStat = spendMap.get(cat.id) || { spent: 0, count: 0 };
    const spent = txStat.spent;
    const remaining = cat.allocated - spent;
    const utilizationPercent =
      cat.allocated > 0
        ? (spent / cat.allocated) * 100
        : spent > 0
        ? 100
        : 0;

    if (cat.type === 'FIXED') {
      fixedAllocatedTotal += cat.allocated;
      fixedSpentTotal += spent;
    } else {
      variableAllocatedTotal += cat.allocated;
      variableSpentTotal += spent;
    }

    let status: 'NOMINAL' | 'NEAR_LIMIT' | 'OVER_BUDGET' = 'NOMINAL';
    if (spent > cat.allocated) {
      status = 'OVER_BUDGET';
    } else if (utilizationPercent >= 85) {
      status = 'NEAR_LIMIT';
    }

    return {
      ...cat,
      spent,
      remaining,
      utilizationPercent,
      txCount: txStat.count,
      status,
    };
  });

  // Also include any orphaned transactions if a category was deleted
  const totalSpent = state.transactions.reduce((acc, tx) => acc + tx.amount, 0);
  const totalAllocatedCategories = fixedAllocatedTotal + variableAllocatedTotal;
  const unallocatedCapital =
    masterBudget - totalAllocatedCategories - savingsAllocated;
  const remainingBalance = masterBudget - totalSpent - savingsAllocated;

  // Velocity & Calendar math
  const daysInMonth = getDaysInMonth(state.activeMonthKey);
  const currentDayOfMonth = getCurrentDayForMonth(
    state.activeMonthKey,
    state.currentDayOverride
  );
  // Inclusive of remaining days in the month (at least 1 so division never explodes)
  const daysLeftInMonth = Math.max(1, daysInMonth - currentDayOfMonth);

  const remainingVariableAllocation =
    variableAllocatedTotal - variableSpentTotal;
  const dailySafeToSpend =
    Math.max(0, remainingVariableAllocation) / Math.max(1, daysLeftInMonth);

  const expectedVariableSpendToDate =
    (variableAllocatedTotal / Math.max(1, daysInMonth)) * currentDayOfMonth;

  const variableBurnDelta = variableSpentTotal - expectedVariableSpendToDate;
  const variableBurnPacePercent =
    expectedVariableSpendToDate > 0
      ? (variableBurnDelta / expectedVariableSpendToDate) * 100
      : 0;

  const isVariableOverPace = variableBurnDelta > 0.01;
  const absPacePct = Math.abs(variableBurnPacePercent).toFixed(1);
  const variableDailyBurnStatusString = isVariableOverPace
    ? `OVER_PACE_BY_${absPacePct}_PERCENT`
    : `UNDER_PACE_BY_${absPacePct}_PERCENT`;

  // Deterministic Financial Health Index (0–100 Score)
  // 1. Variable Pace Control (40 pts):
  // 40 * Clamp(1 - ((ActualVariableSpend - ExpectedVariableSpend) / Max(1, TotalVariableBudget)), 0, 1.25) (capped at 40)
  const rawVariablePaceRatio = clamp(
    1 -
      (variableSpentTotal - expectedVariableSpendToDate) /
        Math.max(1, variableAllocatedTotal),
    0,
    1.25
  );
  const variablePaceScore = Math.min(40, 40 * rawVariablePaceRatio);

  // 2. Savings Rate Efficiency (30 pts):
  // Target is 20% of Master Budget. 30 * Min(1, (SavingsAllocated / Max(1, TotalMasterBudget)) / 0.20)
  const savingsEfficiencyScore =
    30 *
    Math.min(1, savingsAllocated / Math.max(1, masterBudget) / 0.2);

  // 3. Fixed Budget Adherence (30 pts):
  // Starts at 30; deducts proportional points for any Fixed Category where ActualSpend > AllocatedBudget.
  const fixedCategories = categoryMetrics.filter((c) => c.type === 'FIXED');
  let fixedOveragePenaltyRatio = 0;
  if (fixedCategories.length > 0) {
    let totalFixedOverage = 0;
    for (const fc of fixedCategories) {
      if (fc.spent > fc.allocated) {
        totalFixedOverage += fc.spent - fc.allocated;
      }
    }
    // Proportional penalty relative to total fixed budget (plus a base penalty per breached fixed category)
    const breachedCount = fixedCategories.filter(
      (fc) => fc.spent > fc.allocated
    ).length;
    const overageRatio =
      totalFixedOverage / Math.max(1, fixedAllocatedTotal);
    const categoryBreachWeight =
      (breachedCount / fixedCategories.length) * 0.35;
    fixedOveragePenaltyRatio = clamp(
      overageRatio * 1.5 + categoryBreachWeight,
      0,
      1
    );
  }
  const fixedAdherenceScore = clamp(
    30 * (1 - fixedOveragePenaltyRatio),
    0,
    30
  );

  const financialHealthScore = clamp(
    Math.round(
      variablePaceScore + savingsEfficiencyScore + fixedAdherenceScore
    ),
    0,
    100
  );

  const topOverspentCategories = categoryMetrics
    .filter((c) => c.spent > c.allocated)
    .map((c) => ({
      name: c.name,
      type: c.type,
      allocated: c.allocated,
      spent: c.spent,
      overage: c.spent - c.allocated,
    }))
    .sort((a, b) => b.overage - a.overage);

  return {
    masterBudget,
    totalAllocatedCategories,
    fixedAllocatedTotal,
    variableAllocatedTotal,
    savingsAllocated,
    unallocatedCapital,
    totalSpent,
    fixedSpentTotal,
    variableSpentTotal,
    remainingBalance,
    cumulativeSavingsReserve: state.cumulativeSavingsReserve,
    daysInMonth,
    currentDayOfMonth,
    daysLeftInMonth,
    remainingVariableAllocation,
    dailySafeToSpend,
    expectedVariableSpendToDate,
    variableBurnDelta,
    variableBurnPacePercent,
    isVariableOverPace,
    variableDailyBurnStatusString,
    variablePaceScore: Number(variablePaceScore.toFixed(1)),
    savingsEfficiencyScore: Number(savingsEfficiencyScore.toFixed(1)),
    fixedAdherenceScore: Number(fixedAdherenceScore.toFixed(1)),
    financialHealthScore,
    categoryMetrics,
    topOverspentCategories,
  };
}

export function buildWarrenPayload(
  state: WealthState,
  metrics: DerivedMetrics,
  userMessage: string
): WarrenPayload {
  return {
    user: state.user || 'M. Mahin',
    total_budget: metrics.masterBudget,
    total_spent: metrics.totalSpent,
    remaining_balance: metrics.remainingBalance,
    unallocated_capital: metrics.unallocatedCapital,
    days_left_in_month: metrics.daysLeftInMonth,
    daily_safe_to_spend: Number(metrics.dailySafeToSpend.toFixed(2)),
    variable_daily_burn_status: metrics.variableDailyBurnStatusString,
    savings_allocated: metrics.savingsAllocated,
    financial_health_score: metrics.financialHealthScore,
    top_overspent_categories: metrics.topOverspentCategories,
    user_message: userMessage,
  };
}

/**
 * Cold, hyper-rational deterministic fallback engine for Warren when offline
 */
export function generateDeterministicWarrenResponse(
  payload: WarrenPayload,
  currency: CurrencyCode
): string {
  const sym = currency === 'BDT' ? '৳' : '$';
  const savingsRate =
    payload.total_budget > 0
      ? ((payload.savings_allocated / payload.total_budget) * 100).toFixed(1)
      : '0.0';
  const burnRatio =
    payload.total_budget > 0
      ? ((payload.total_spent / payload.total_budget) * 100).toFixed(1)
      : '0.0';

  const isOverPace = payload.variable_daily_burn_status.startsWith('OVER_PACE');
  const paceNumber =
    payload.variable_daily_burn_status
      .replace('OVER_PACE_BY_', '')
      .replace('UNDER_PACE_BY_', '')
      .replace('_PERCENT', '') || '0.0';

  const overspentSummary =
    payload.top_overspent_categories.length > 0
      ? payload.top_overspent_categories
          .map(
            (c) =>
              `${c.name} (${c.type}: +${sym}${c.overage.toLocaleString()} over allocation)`
          )
          .join('; ')
      : 'None. Zero category ceiling breaches recorded.';

  const unallocatedAlert =
    payload.unallocated_capital > 0
      ? `Idle Unallocated Capital detected: ${sym}${payload.unallocated_capital.toLocaleString()}. Zero-based discipline requires every unit of capital to have an explicit mandate. Sweep idle liquidity into Cumulative Savings immediately.`
      : payload.unallocated_capital < 0
      ? `CRITICAL DEFICIT: Category + Savings allocations exceed Master Budget by ${sym}${Math.abs(
          payload.unallocated_capital
        ).toLocaleString()}. Trim variable allocations immediately to restore zero-based equilibrium.`
      : `Zero-Based Equilibrium verified (${sym}0 unallocated).`;

  const annualizedSavings = payload.savings_allocated * 12;
  const tenYearCompounded = Math.round(annualizedSavings * 14.486); // ~8% CAGR annuity factor

  return [
    `### CAPITAL ALLOCATION AUDIT // ${payload.user.toUpperCase()}`,
    `**Composite Health Index:** \`${payload.financial_health_score}/100\` | **Capital Utilization:** \`${burnRatio}%\` | **Savings Rate:** \`${savingsRate}%\``,
    ``,
    `#### 1. VELOCITY & PACE DIAGNOSTIC`,
    `- **Variable Burn Status:** \`${payload.variable_daily_burn_status}\` (${
      isOverPace
        ? `Exceeding linear time-weighted trajectory by ${paceNumber}%`
        : `Operating ${paceNumber}% below linear variable ceiling`
    }).`,
    `- **Daily Safe-to-Spend Ceiling:** \`${sym}${payload.daily_safe_to_spend.toLocaleString(
      'en-US',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}/day\` across the remaining \`${payload.days_left_in_month}\` calendar days.`,
    `- **Category Breaches:** ${overspentSummary}`,
    ``,
    `#### 2. ZERO-BASED & RESERVE EFFICIENCY`,
    `- **Allocation Integrity:** ${unallocatedAlert}`,
    `- **Compounding Opportunity Cost:** Your current monthly reserve commitment of \`${sym}${payload.savings_allocated.toLocaleString()}\` (\`${savingsRate}%\` of Master Budget) compounds to \`${sym}${tenYearCompounded.toLocaleString()}\` over 10 years at an 8% institutional return. Every \`${sym}1,000\` leaked into discretionary variable overrun destroys \`${sym}2,159\` of 10-year terminal wealth.`,
    ``,
    `#### 3. DIRECTIVE FOR REMAINING ${payload.days_left_in_month} DAYS`,
    isOverPace
      ? `1. **Enforce Variable Freeze:** Cap daily discretionary outflow strictly below \`${sym}${Math.floor(
          payload.daily_safe_to_spend * 0.85
        ).toLocaleString()}/day\` for the next 5 days to mean-revert your variable burn curve.\n2. **Eliminate Leakage:** Audit Food & Nutrition and Transport entries before authorizing any further non-essential spend.`
      : `1. **Preserve Margin of Safety:** Maintain daily variable spend below \`${sym}${payload.daily_safe_to_spend.toLocaleString(
          'en-US',
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}/day\`.\n2. **Month-End Rollover:** On month close, sweep 100% of unspent variable surplus into the Cumulative Savings Reserve.`,
  ].join('\n');
}

/**
 * Pre-seeded rich initial state:
 * - 3 Historical Months (July, August, September 2026)
 * - Active Month (October 2026) with 15 realistic transactions across Fixed & Variable categories
 */
export const INITIAL_WEALTH_STATE: WealthState = {
  version: 1,
  user: 'M. Mahin',
  currency: 'BDT',
  activeMonthKey: '2026-10',
  activeMonthLabel: 'October 2026',
  currentDayOverride: 23,
  masterBudget: 45000,
  savingsAllocated: 9000, // 20% target savings rate
  cumulativeSavingsReserve: 31450, // Accumulated from July-September + prior reserve
  categories: [
    {
      id: 'cat-rent',
      name: 'Rent & Housing',
      type: 'FIXED',
      allocated: 12500,
    },
    {
      id: 'cat-tuition',
      name: 'Tuition & Academic',
      type: 'FIXED',
      allocated: 6000,
    },
    {
      id: 'cat-mobile',
      name: 'Mobile & Broadband',
      type: 'FIXED',
      allocated: 1500,
    },
    {
      id: 'cat-bazar',
      name: 'Bazar & Groceries',
      type: 'VARIABLE',
      allocated: 6500,
    },
    {
      id: 'cat-food',
      name: 'Food & Nutrition',
      type: 'VARIABLE',
      allocated: 5000,
    },
    {
      id: 'cat-transport',
      name: 'Transport & Commute',
      type: 'VARIABLE',
      allocated: 3000,
    },
    {
      id: 'cat-personal',
      name: 'Books & Essentials',
      type: 'VARIABLE',
      allocated: 1500,
    },
  ],
  transactions: [
    {
      id: 'tx-101',
      title: 'Monthly Apartment Rent (October)',
      amount: 12500,
      categoryId: 'cat-rent',
      date: '2026-10-02',
      notes: 'Bank transfer to landlord',
    },
    {
      id: 'tx-102',
      title: 'Fiber Optic ISP & Mobile Data Pack',
      amount: 1450,
      categoryId: 'cat-mobile',
      date: '2026-10-03',
      notes: '100 Mbps broadband + 30-day bundle',
    },
    {
      id: 'tx-103',
      title: 'Weekly Raw Bazar (Rice, Fish, Vegetables)',
      amount: 1850,
      categoryId: 'cat-bazar',
      date: '2026-10-04',
      notes: 'Karwan Bazar morning run',
    },
    {
      id: 'tx-104',
      title: 'Semester Lab & Tuition Installment',
      amount: 6000,
      categoryId: 'cat-tuition',
      date: '2026-10-05',
      notes: 'Autumn term installment',
    },
    {
      id: 'tx-105',
      title: 'Metro Rail Pass Top-Up & Rickshaw',
      amount: 750,
      categoryId: 'cat-transport',
      date: '2026-10-06',
      notes: 'MRT Rapid Pass recharge',
    },
    {
      id: 'tx-106',
      title: 'Protein, Eggs, Oats & Milk Supply',
      amount: 1320,
      categoryId: 'cat-food',
      date: '2026-10-08',
      notes: '2-week nutrition restock',
    },
    {
      id: 'tx-107',
      title: 'Campus Lunch & Espresso',
      amount: 580,
      categoryId: 'cat-food',
      date: '2026-10-10',
      notes: 'Post-seminar meal',
    },
    {
      id: 'tx-108',
      title: 'Mid-Month Fresh Produce & Chicken',
      amount: 1920,
      categoryId: 'cat-bazar',
      date: '2026-10-12',
      notes: 'Weekly household bazar',
    },
    {
      id: 'tx-109',
      title: 'Quantitative Finance Reference Book',
      amount: 820,
      categoryId: 'cat-personal',
      date: '2026-10-14',
      notes: 'Nilkhet academic bookstore',
    },
    {
      id: 'tx-110',
      title: 'Ride Share — Late Evening Return',
      amount: 640,
      categoryId: 'cat-transport',
      date: '2026-10-15',
      notes: 'Pathao ride during rain',
    },
    {
      id: 'tx-111',
      title: 'Post-Workout Nutrition & Almonds',
      amount: 940,
      categoryId: 'cat-food',
      date: '2026-10-17',
      notes: 'Nuts, yogurt, and fruit',
    },
    {
      id: 'tx-112',
      title: 'Weekly Bazar — Spices, Oil & Greens',
      amount: 1480,
      categoryId: 'cat-bazar',
      date: '2026-10-19',
      notes: 'Household kitchen essentials',
    },
    {
      id: 'tx-113',
      title: 'Campus Commute & Rickshaw Fares',
      amount: 590,
      categoryId: 'cat-transport',
      date: '2026-10-20',
      notes: '5-day local transit',
    },
    {
      id: 'tx-114',
      title: 'Group Study Dinner & Grilled Chicken',
      amount: 760,
      categoryId: 'cat-food',
      date: '2026-10-22',
      notes: 'Project milestone dinner',
    },
    {
      id: 'tx-115',
      title: 'Pharmacy & Daily Multivitamins',
      amount: 390,
      categoryId: 'cat-personal',
      date: '2026-10-23',
      notes: 'Essential health supplies',
    },
  ],
  archives: [
    {
      id: 'arch-2026-07',
      monthKey: '2026-07',
      monthLabel: 'July 2026',
      closedAt: '2026-07-31T23:59:00Z',
      masterBudget: 42000,
      totalSpent: 32850,
      fixedSpent: 19400,
      variableSpent: 13450,
      savingsAllocated: 8000,
      unspentVariableSurplus: 1150,
      surplusRolledOver: true,
      finalSavingsAdded: 9150,
      cumulativeSavingsAfterClose: 9150,
      finalSavingsRatePercent: 21.8,
      healthScore: 86,
      categories: [
        {
          id: 'cat-rent',
          name: 'Rent & Housing',
          type: 'FIXED',
          allocated: 12000,
          spent: 12000,
        },
        {
          id: 'cat-tuition',
          name: 'Tuition & Academic',
          type: 'FIXED',
          allocated: 6000,
          spent: 6000,
        },
        {
          id: 'cat-mobile',
          name: 'Mobile & Broadband',
          type: 'FIXED',
          allocated: 1400,
          spent: 1400,
        },
        {
          id: 'cat-bazar',
          name: 'Bazar & Groceries',
          type: 'VARIABLE',
          allocated: 6200,
          spent: 5750,
        },
        {
          id: 'cat-food',
          name: 'Food & Nutrition',
          type: 'VARIABLE',
          allocated: 4400,
          spent: 4100,
        },
        {
          id: 'cat-transport',
          name: 'Transport & Commute',
          type: 'VARIABLE',
          allocated: 2600,
          spent: 2450,
        },
        {
          id: 'cat-personal',
          name: 'Books & Essentials',
          type: 'VARIABLE',
          allocated: 1400,
          spent: 1150,
        },
      ],
      transactions: [
        {
          id: 'jul-1',
          title: 'July Apartment Rent',
          amount: 12000,
          categoryId: 'cat-rent',
          date: '2026-07-02',
        },
        {
          id: 'jul-2',
          title: 'Tuition Fee — Summer Term',
          amount: 6000,
          categoryId: 'cat-tuition',
          date: '2026-07-05',
        },
        {
          id: 'jul-3',
          title: 'Monthly Bazar & Groceries',
          amount: 5750,
          categoryId: 'cat-bazar',
          date: '2026-07-14',
        },
        {
          id: 'jul-4',
          title: 'Food & Nutrition Aggregate',
          amount: 4100,
          categoryId: 'cat-food',
          date: '2026-07-21',
        },
        {
          id: 'jul-5',
          title: 'Transit, Broadband & Essentials',
          amount: 5000,
          categoryId: 'cat-transport',
          date: '2026-07-28',
        },
      ],
    },
    {
      id: 'arch-2026-08',
      monthKey: '2026-08',
      monthLabel: 'August 2026',
      closedAt: '2026-08-31T23:59:00Z',
      masterBudget: 44000,
      totalSpent: 35600,
      fixedSpent: 19950,
      variableSpent: 15650,
      savingsAllocated: 8500,
      unspentVariableSurplus: 0,
      surplusRolledOver: false,
      finalSavingsAdded: 8500,
      cumulativeSavingsAfterClose: 17650,
      finalSavingsRatePercent: 19.3,
      healthScore: 76,
      categories: [
        {
          id: 'cat-rent',
          name: 'Rent & Housing',
          type: 'FIXED',
          allocated: 12500,
          spent: 12500,
        },
        {
          id: 'cat-tuition',
          name: 'Tuition & Academic',
          type: 'FIXED',
          allocated: 6000,
          spent: 6000,
        },
        {
          id: 'cat-mobile',
          name: 'Mobile & Broadband',
          type: 'FIXED',
          allocated: 1500,
          spent: 1450,
        },
        {
          id: 'cat-bazar',
          name: 'Bazar & Groceries',
          type: 'VARIABLE',
          allocated: 6300,
          spent: 6600,
        },
        {
          id: 'cat-food',
          name: 'Food & Nutrition',
          type: 'VARIABLE',
          allocated: 4800,
          spent: 5150,
        },
        {
          id: 'cat-transport',
          name: 'Transport & Commute',
          type: 'VARIABLE',
          allocated: 2900,
          spent: 2700,
        },
        {
          id: 'cat-personal',
          name: 'Books & Essentials',
          type: 'VARIABLE',
          allocated: 1500,
          spent: 1200,
        },
      ],
      transactions: [
        {
          id: 'aug-1',
          title: 'August Apartment Rent',
          amount: 12500,
          categoryId: 'cat-rent',
          date: '2026-08-02',
        },
        {
          id: 'aug-2',
          title: 'Academic Term Installment',
          amount: 6000,
          categoryId: 'cat-tuition',
          date: '2026-08-06',
        },
        {
          id: 'aug-3',
          title: 'Bazar & Wholesale Staples',
          amount: 6600,
          categoryId: 'cat-bazar',
          date: '2026-08-15',
        },
        {
          id: 'aug-4',
          title: 'Food & Nutrition Total',
          amount: 5150,
          categoryId: 'cat-food',
          date: '2026-08-22',
        },
        {
          id: 'aug-5',
          title: 'Commute, ISP & Essentials',
          amount: 5350,
          categoryId: 'cat-transport',
          date: '2026-08-29',
        },
      ],
    },
    {
      id: 'arch-2026-09',
      monthKey: '2026-09',
      monthLabel: 'September 2026',
      closedAt: '2026-09-30T23:59:00Z',
      masterBudget: 45000,
      totalSpent: 34200,
      fixedSpent: 19950,
      variableSpent: 14250,
      savingsAllocated: 9000,
      unspentVariableSurplus: 1750,
      surplusRolledOver: true,
      finalSavingsAdded: 10750,
      cumulativeSavingsAfterClose: 31450,
      finalSavingsRatePercent: 23.9,
      healthScore: 92,
      categories: [
        {
          id: 'cat-rent',
          name: 'Rent & Housing',
          type: 'FIXED',
          allocated: 12500,
          spent: 12500,
        },
        {
          id: 'cat-tuition',
          name: 'Tuition & Academic',
          type: 'FIXED',
          allocated: 6000,
          spent: 6000,
        },
        {
          id: 'cat-mobile',
          name: 'Mobile & Broadband',
          type: 'FIXED',
          allocated: 1500,
          spent: 1450,
        },
        {
          id: 'cat-bazar',
          name: 'Bazar & Groceries',
          type: 'VARIABLE',
          allocated: 6500,
          spent: 5900,
        },
        {
          id: 'cat-food',
          name: 'Food & Nutrition',
          type: 'VARIABLE',
          allocated: 5000,
          spent: 4450,
        },
        {
          id: 'cat-transport',
          name: 'Transport & Commute',
          type: 'VARIABLE',
          allocated: 3000,
          spent: 2650,
        },
        {
          id: 'cat-personal',
          name: 'Books & Essentials',
          type: 'VARIABLE',
          allocated: 1500,
          spent: 1250,
        },
      ],
      transactions: [
        {
          id: 'sep-1',
          title: 'September Apartment Rent',
          amount: 12500,
          categoryId: 'cat-rent',
          date: '2026-09-02',
        },
        {
          id: 'sep-2',
          title: 'University Tuition & Lab Fee',
          amount: 6000,
          categoryId: 'cat-tuition',
          date: '2026-09-05',
        },
        {
          id: 'sep-3',
          title: 'September Bazar & Groceries',
          amount: 5900,
          categoryId: 'cat-bazar',
          date: '2026-09-14',
        },
        {
          id: 'sep-4',
          title: 'Food & Nutrition Aggregate',
          amount: 4450,
          categoryId: 'cat-food',
          date: '2026-09-21',
        },
        {
          id: 'sep-5',
          title: 'Transit, Broadband & Books',
          amount: 5350,
          categoryId: 'cat-transport',
          date: '2026-09-28',
        },
      ],
    },
  ],
};

export function createBlankSlateState(currency: CurrencyCode = 'BDT'): WealthState {
  const defaultCategories: Category[] = [
    { id: 'cat-rent', name: 'Rent & Housing', type: 'FIXED', allocated: 0 },
    { id: 'cat-tuition', name: 'Tuition & Academic', type: 'FIXED', allocated: 0 },
    { id: 'cat-mobile', name: 'Mobile & Broadband', type: 'FIXED', allocated: 0 },
    { id: 'cat-bazar', name: 'Bazar & Groceries', type: 'VARIABLE', allocated: 0 },
    { id: 'cat-food', name: 'Food & Nutrition', type: 'VARIABLE', allocated: 0 },
    { id: 'cat-transport', name: 'Transport & Commute', type: 'VARIABLE', allocated: 0 },
  ];

  return {
    version: 1,
    user: 'M. Mahin',
    currency,
    activeMonthKey: '2026-10',
    activeMonthLabel: 'October 2026',
    currentDayOverride: null,
    masterBudget: 0,
    savingsAllocated: 0,
    cumulativeSavingsReserve: 0,
    categories: defaultCategories,
    transactions: [],
    archives: [],
  };
}

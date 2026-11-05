'use client';

import React, { useState } from 'react';
import {
  Category,
  CategoryMetrics,
  CategoryType,
  CurrencyCode,
  DerivedMetrics,
} from '@/lib/wealth-types';
import { formatCurrency } from '@/lib/wealth-engine';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  ArrowUpRight,
  Scale,
} from 'lucide-react';

interface CommandCenterTabProps {
  currency: CurrencyCode;
  activeMonthLabel: string;
  metrics: DerivedMetrics;
  onUpdateMasterBudget: (newBudget: number, newSavings: number) => void;
  onUpdateDayOverride: (day: number | null) => void;
  currentDayOverride?: number | null;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Omit<Category, 'id'>>) => void;
  onDeleteCategory: (id: string) => void;
  onOpenQuickExpenseForCategory: (categoryId: string) => void;
}

const DONUT_COLORS = {
  FIXED: '#3b82f6', // Electric Blue
  VARIABLE: '#06b6d4', // Cyan
  SAVINGS: '#10b981', // Emerald
  UNALLOCATED: '#4b5563', // Neutral Slate
};

const CATEGORY_PALETTE = [
  '#3b82f6',
  '#2563eb',
  '#1d4ed8',
  '#06b6d4',
  '#0891b2',
  '#22d3ee',
  '#14b8a6',
  '#10b981',
];

export default function CommandCenterTab({
  currency,
  activeMonthLabel,
  metrics,
  onUpdateMasterBudget,
  onUpdateDayOverride,
  currentDayOverride,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onOpenQuickExpenseForCategory,
}: CommandCenterTabProps) {
  // Inline macro budget editing state
  const [editingMacro, setEditingMacro] = useState(false);
  const [draftMaster, setDraftMaster] = useState(String(metrics.masterBudget));
  const [draftSavings, setDraftSavings] = useState(
    String(metrics.savingsAllocated)
  );

  // Donut breakdown mode: macro (Fixed / Variable / Savings) vs granular categories
  const [donutMode, setDonutMode] = useState<'MACRO' | 'GRANULAR'>('MACRO');

  // Category table filter
  const [typeFilter, setTypeFilter] = useState<'ALL' | CategoryType>('ALL');

  // Inline category editing
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatType, setEditCatType] = useState<CategoryType>('VARIABLE');
  const [editCatAllocated, setEditCatAllocated] = useState('');

  // Inline add category
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<CategoryType>('VARIABLE');
  const [newCatAllocated, setNewCatAllocated] = useState('');

  const handleStartEditMacro = () => {
    setDraftMaster(String(metrics.masterBudget));
    setDraftSavings(String(metrics.savingsAllocated));
    setEditingMacro(true);
  };

  const handleSaveMacro = () => {
    const parsedMaster = Math.max(0, Number(draftMaster) || 0);
    const parsedSavings = Math.max(0, Number(draftSavings) || 0);
    onUpdateMasterBudget(parsedMaster, parsedSavings);
    setEditingMacro(false);
  };

  const handleStartEditCat = (cat: CategoryMetrics) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatType(cat.type);
    setEditCatAllocated(String(cat.allocated));
  };

  const handleSaveEditCat = (id: string) => {
    if (!editCatName.trim()) return;
    onUpdateCategory(id, {
      name: editCatName.trim(),
      type: editCatType,
      allocated: Math.max(0, Number(editCatAllocated) || 0),
    });
    setEditingCatId(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory({
      name: newCatName.trim(),
      type: newCatType,
      allocated: Math.max(0, Number(newCatAllocated) || 0),
    });
    setNewCatName('');
    setNewCatAllocated('');
    setIsAddingCat(false);
  };

  const handleSweepUnallocatedToSavings = () => {
    if (metrics.unallocatedCapital <= 0) return;
    onUpdateMasterBudget(
      metrics.masterBudget,
      metrics.savingsAllocated + metrics.unallocatedCapital
    );
  };

  // Prepare Donut Chart Data
  const macroDonutData = [
    {
      name: 'Fixed Allocations',
      value: metrics.fixedAllocatedTotal,
      spent: metrics.fixedSpentTotal,
      color: DONUT_COLORS.FIXED,
      type: 'Fixed',
    },
    {
      name: 'Variable Allocations',
      value: metrics.variableAllocatedTotal,
      spent: metrics.variableSpentTotal,
      color: DONUT_COLORS.VARIABLE,
      type: 'Variable',
    },
    {
      name: 'Savings Deposit',
      value: metrics.savingsAllocated,
      spent: metrics.savingsAllocated,
      color: DONUT_COLORS.SAVINGS,
      type: 'Reserve',
    },
    ...(metrics.unallocatedCapital > 0
      ? [
          {
            name: 'Unallocated Capital',
            value: metrics.unallocatedCapital,
            spent: 0,
            color: DONUT_COLORS.UNALLOCATED,
            type: 'Idle',
          },
        ]
      : []),
  ].filter((d) => d.value > 0);

  const granularDonutData = [
    ...metrics.categoryMetrics.map((c, idx) => ({
      name: c.name,
      value: c.allocated,
      spent: c.spent,
      color:
        c.type === 'FIXED'
          ? idx % 2 === 0
            ? '#3b82f6'
            : '#2563eb'
          : CATEGORY_PALETTE[(idx + 3) % CATEGORY_PALETTE.length],
      type: c.type === 'FIXED' ? 'Fixed' : 'Variable',
    })),
    ...(metrics.savingsAllocated > 0
      ? [
          {
            name: 'Monthly Savings Deposit',
            value: metrics.savingsAllocated,
            spent: metrics.savingsAllocated,
            color: '#10b981',
            type: 'Reserve',
          },
        ]
      : []),
  ].filter((d) => d.value > 0);

  const activeDonutData =
    donutMode === 'MACRO' ? macroDonutData : granularDonutData;

  const filteredCategories = metrics.categoryMetrics.filter((c) =>
    typeFilter === 'ALL' ? true : c.type === typeFilter
  );

  const savingsPercentOfMaster =
    metrics.masterBudget > 0
      ? ((metrics.savingsAllocated / metrics.masterBudget) * 100).toFixed(1)
      : '0.0';

  const spentPercentOfMaster =
    metrics.masterBudget > 0
      ? ((metrics.totalSpent / metrics.masterBudget) * 100).toFixed(1)
      : '0.0';

  const variableExpectedRatio =
    metrics.variableAllocatedTotal > 0
      ? Math.min(
          100,
          (metrics.expectedVariableSpendToDate /
            metrics.variableAllocatedTotal) *
            100
        )
      : 0;

  const variableActualRatio =
    metrics.variableAllocatedTotal > 0
      ? Math.min(
          100,
          (metrics.variableSpentTotal / metrics.variableAllocatedTotal) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* SECTION A: MACRO SUMMARY & ZERO-BASED CHECK */}
      <section aria-label="Macro Capital Summary">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-white">
              Macro Capital Allocation & Zero-Based Check
            </h2>
            <p className="text-xs text-gray-400">
              {activeMonthLabel} · Day {metrics.currentDayOfMonth} of{' '}
              {metrics.daysInMonth} · {metrics.daysLeftInMonth} days remaining
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!editingMacro ? (
              <button
                onClick={handleStartEditMacro}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-200 bg-[#111827] hover:bg-[#1f2937] border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                Adjust Master Budget & Savings
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 bg-[#111827] border border-cyan-500/40 rounded-lg p-1.5">
                <div className="flex items-center gap-1.5 px-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    Master:
                  </span>
                  <input
                    type="number"
                    value={draftMaster}
                    onChange={(e) => setDraftMaster(e.target.value)}
                    className="w-24 bg-[#0b0f17] border border-white/15 rounded px-2 py-1 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="flex items-center gap-1.5 px-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    Savings:
                  </span>
                  <input
                    type="number"
                    value={draftSavings}
                    onChange={(e) => setDraftSavings(e.target.value)}
                    className="w-24 bg-[#0b0f17] border border-white/15 rounded px-2 py-1 text-xs font-mono tabular-nums text-emerald-400 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <button
                  onClick={handleSaveMacro}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors whitespace-nowrap shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  Apply
                </button>
                <button
                  onClick={() => setEditingMacro(false)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 hover:text-white rounded transition-colors whitespace-nowrap shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Master Budget */}
          <div className="bg-[#111827] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Total Master Budget</span>
              <button
                onClick={handleStartEditMacro}
                className="text-gray-400 hover:text-white transition-colors"
                title="Edit Master Budget"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-white tracking-tight">
              {formatCurrency(metrics.masterBudget, currency)}
            </div>
            <div className="mt-2 text-xs text-gray-400 font-mono tabular-nums">
              Fixed {formatCurrency(metrics.fixedAllocatedTotal, currency)} ·
              Var {formatCurrency(metrics.variableAllocatedTotal, currency)}
            </div>
          </div>

          {/* Card 2: Total Spent to Date */}
          <div className="bg-[#111827] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Total Spent to Date</span>
              <span className="font-mono tabular-nums text-gray-300">
                {spentPercentOfMaster}%
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-white tracking-tight">
              {formatCurrency(metrics.totalSpent, currency)}
            </div>
            <div className="mt-2 text-xs text-gray-400 font-mono tabular-nums">
              Fixed {formatCurrency(metrics.fixedSpentTotal, currency)} · Var{' '}
              {formatCurrency(metrics.variableSpentTotal, currency)}
            </div>
          </div>

          {/* Card 3: Total Remaining Balance */}
          <div className="bg-[#111827] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Remaining Spendable</span>
              <span className="font-mono tabular-nums text-cyan-400">
                Excl. Savings
              </span>
            </div>
            <div
              className={`mt-2 text-2xl font-bold font-mono tabular-nums tracking-tight ${
                metrics.remainingBalance < 0 ? 'text-red-400' : 'text-cyan-400'
              }`}
            >
              {formatCurrency(metrics.remainingBalance, currency)}
            </div>
            <div className="mt-2 text-xs text-gray-400 font-mono tabular-nums">
              Var Pool Left:{' '}
              {formatCurrency(metrics.remainingVariableAllocation, currency)}
            </div>
          </div>

          {/* Card 4: Monthly Savings Deposit */}
          <div className="bg-[#111827] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Monthly Savings Deposit</span>
              <span className="font-mono tabular-nums text-emerald-400">
                {savingsPercentOfMaster}% Rate
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-400 tracking-tight">
              {formatCurrency(metrics.savingsAllocated, currency)}
            </div>
            <div className="mt-2 text-xs text-gray-400 font-mono tabular-nums">
              Cumulative Reserve:{' '}
              <span className="text-emerald-300">
                {formatCurrency(metrics.cumulativeSavingsReserve, currency)}
              </span>
            </div>
          </div>

          {/* Card 5: Unallocated Capital (Zero-Based Check) */}
          <div
            className={`bg-[#111827] rounded-xl p-4 flex flex-col justify-between border ${
              metrics.unallocatedCapital === 0
                ? 'border-emerald-500/30'
                : metrics.unallocatedCapital > 0
                ? 'border-amber-500/40'
                : 'border-red-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Unallocated Capital</span>
              <Scale className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div
              className={`mt-2 text-2xl font-bold font-mono tabular-nums tracking-tight ${
                metrics.unallocatedCapital === 0
                  ? 'text-emerald-400'
                  : metrics.unallocatedCapital > 0
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {formatCurrency(metrics.unallocatedCapital, currency, {
                showSign: metrics.unallocatedCapital !== 0,
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              {metrics.unallocatedCapital === 0 ? (
                <span className="text-emerald-400">
                  Zero-Based Equilibrium
                </span>
              ) : metrics.unallocatedCapital > 0 ? (
                <button
                  onClick={handleSweepUnallocatedToSavings}
                  className="text-amber-300 hover:text-amber-200 underline underline-offset-2 flex items-center gap-1 whitespace-nowrap"
                >
                  Sweep to Savings
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-red-400">
                  Over-Allocated vs Master
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B: FIXED VS. VARIABLE VELOCITY ENGINE & DONUT CHART */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Fixed vs. Variable Velocity Engine */}
        <div className="lg:col-span-7 bg-[#111827] border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Fixed vs. Variable Velocity Engine
                </h3>
                <p className="text-xs text-gray-400">
                  Fixed bills are excluded from daily burn velocity · Variable
                  categories govern daily allowance
                </p>
              </div>

              {/* Day of Month Simulator / Controller */}
              <div className="flex items-center gap-2 bg-[#0b0f17] border border-white/10 rounded-lg px-2.5 py-1">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  Active Day:
                </span>
                <input
                  type="number"
                  min={1}
                  max={metrics.daysInMonth}
                  value={metrics.currentDayOfMonth}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      onUpdateDayOverride(val);
                    }
                  }}
                  className="w-12 bg-transparent text-xs font-mono tabular-nums text-cyan-300 text-center focus:outline-none"
                />
                <span className="text-xs text-gray-500 font-mono tabular-nums">
                  / {metrics.daysInMonth}
                </span>
                {currentDayOverride !== null &&
                  currentDayOverride !== undefined && (
                    <button
                      onClick={() => onUpdateDayOverride(null)}
                      className="text-[11px] text-gray-400 hover:text-white underline ml-1 whitespace-nowrap"
                      title="Reset to system calendar day"
                    >
                      Auto
                    </button>
                  )}
              </div>
            </div>

            {/* Hero Safe-to-Spend & Expected vs Actual Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
              {/* Primary Metric: Daily Safe-to-Spend */}
              <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-4">
                <div className="text-xs text-gray-400">
                  Daily Safe-to-Spend Rate
                </div>
                <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-cyan-400">
                  {formatCurrency(metrics.dailySafeToSpend, currency, {
                    showDecimals: true,
                  })}
                  <span className="text-xs font-normal text-gray-400">
                    /day
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-gray-400 font-mono tabular-nums">
                  {formatCurrency(
                    Math.max(0, metrics.remainingVariableAllocation),
                    currency
                  )}{' '}
                  ÷ {metrics.daysLeftInMonth}d left
                </div>
              </div>

              {/* Expected Variable Spend to Date */}
              <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-4">
                <div className="text-xs text-gray-400">
                  Expected Variable Spend
                </div>
                <div className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-gray-200">
                  {formatCurrency(
                    metrics.expectedVariableSpendToDate,
                    currency,
                    { showDecimals: true }
                  )}
                </div>
                <div className="mt-1.5 text-[11px] text-gray-400 font-mono tabular-nums">
                  Linear pace at Day {metrics.currentDayOfMonth}
                </div>
              </div>

              {/* Actual Variable Spend to Date */}
              <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-4">
                <div className="text-xs text-gray-400">
                  Actual Variable Spend
                </div>
                <div
                  className={`mt-1.5 text-xl font-semibold font-mono tabular-nums ${
                    metrics.isVariableOverPace
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(metrics.variableSpentTotal, currency, {
                    showDecimals: true,
                  })}
                </div>
                <div className="mt-1.5 text-[11px] text-gray-400 font-mono tabular-nums">
                  Of {formatCurrency(metrics.variableAllocatedTotal, currency)}{' '}
                  variable pool
                </div>
              </div>
            </div>

            {/* Daily Burn Meter */}
            <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {metrics.isVariableOverPace ? (
                    <TrendingUp className="w-4 h-4 text-red-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="text-xs font-medium text-gray-200">
                    Daily Variable Burn Meter
                  </span>
                </div>

                <div
                  className={`text-xs font-mono tabular-nums font-semibold ${
                    metrics.isVariableOverPace
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {metrics.isVariableOverPace ? (
                    <span>
                      OVER PACE BY{' '}
                      {Math.abs(metrics.variableBurnPacePercent).toFixed(1)}% (
                      {formatCurrency(metrics.variableBurnDelta, currency, {
                        showSign: true,
                        showDecimals: true,
                      })}
                      )
                    </span>
                  ) : (
                    <span>
                      UNDER PACE BY{' '}
                      {Math.abs(metrics.variableBurnPacePercent).toFixed(1)}% (
                      {formatCurrency(metrics.variableBurnDelta, currency, {
                        showSign: true,
                        showDecimals: true,
                      })}
                      )
                    </span>
                  )}
                </div>
              </div>

              {/* Dual-Track Progress Comparison */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1 font-mono tabular-nums">
                    <span>Expected Time-Weighted Trajectory</span>
                    <span>{variableExpectedRatio.toFixed(1)}% of Variable Pool</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400 transition-all duration-150"
                      style={{ width: `${variableExpectedRatio}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1 font-mono tabular-nums">
                    <span>Actual Variable Burn</span>
                    <span>{variableActualRatio.toFixed(1)}% of Variable Pool</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        metrics.isVariableOverPace
                          ? 'bg-red-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${variableActualRatio}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Lump-Sum Summary Footer */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400">
            <div>
              <span>Fixed Obligations (Lump-Sum): </span>
              <span className="font-mono tabular-nums text-blue-400 font-medium">
                {formatCurrency(metrics.fixedSpentTotal, currency)}
              </span>
              <span> paid of </span>
              <span className="font-mono tabular-nums text-gray-200">
                {formatCurrency(metrics.fixedAllocatedTotal, currency)}
              </span>
            </div>
            <div className="font-mono tabular-nums">
              Health Index:{' '}
              <span
                className={
                  metrics.financialHealthScore >= 80
                    ? 'text-emerald-400 font-semibold'
                    : metrics.financialHealthScore >= 60
                    ? 'text-amber-400 font-semibold'
                    : 'text-red-400 font-semibold'
                }
              >
                {metrics.financialHealthScore}/100
              </span>{' '}
              (Pace {metrics.variablePaceScore}/40 · Sav{' '}
              {metrics.savingsEfficiencyScore}/30 · Fix{' '}
              {metrics.fixedAdherenceScore}/30)
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Category Breakdown Interactive Donut Chart */}
        <div className="lg:col-span-5 bg-[#111827] border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-semibold text-white">
                Capital Structure Breakdown
              </h3>
              <p className="text-xs text-gray-400">
                Fixed, Variable & Savings share of Master Budget
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#0b0f17] border border-white/10 rounded-lg">
              <button
                onClick={() => setDonutMode('MACRO')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  donutMode === 'MACRO'
                    ? 'bg-[#1f2937] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Macro
              </button>
              <button
                onClick={() => setDonutMode('GRANULAR')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  donutMode === 'GRANULAR'
                    ? 'bg-[#1f2937] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                By Category
              </button>
            </div>
          </div>

          <div className="h-56 w-full my-2 relative">
            {activeDonutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="rgba(11,15,23,0.8)"
                    strokeWidth={2}
                  >
                    {activeDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      const share =
                        metrics.masterBudget > 0
                          ? ((item.value / metrics.masterBudget) * 100).toFixed(
                              1
                            )
                          : '0.0';
                      return (
                        <div className="bg-[#0b0f17] border border-white/15 rounded-lg p-3 shadow-xl text-xs">
                          <div className="font-semibold text-white">
                            {item.name}
                          </div>
                          <div className="text-gray-400 mt-0.5">
                            Class: {item.type}
                          </div>
                          <div className="mt-1.5 font-mono tabular-nums text-cyan-300">
                            Allocated: {formatCurrency(item.value, currency)} (
                            {share}%)
                          </div>
                          <div className="font-mono tabular-nums text-gray-300">
                            Actual/Used: {formatCurrency(item.spent, currency)}
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                No budget allocations configured yet.
              </div>
            )}

            {/* Center Donut Readout */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] text-gray-400">Master Pool</span>
              <span className="text-base font-bold font-mono tabular-nums text-white">
                {formatCurrency(metrics.masterBudget, currency)}
              </span>
            </div>
          </div>

          {/* Legend Breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-xs">
            <div className="bg-[#0b0f17] border border-white/5 rounded-lg p-2.5">
              <div className="text-blue-400 font-medium">Fixed Share</div>
              <div className="font-mono tabular-nums text-white font-semibold mt-0.5">
                {formatCurrency(metrics.fixedAllocatedTotal, currency)}
              </div>
              <div className="text-[11px] text-gray-400 font-mono tabular-nums">
                {metrics.masterBudget > 0
                  ? (
                      (metrics.fixedAllocatedTotal / metrics.masterBudget) *
                      100
                    ).toFixed(1)
                  : '0.0'}
                % of budget
              </div>
            </div>

            <div className="bg-[#0b0f17] border border-white/5 rounded-lg p-2.5">
              <div className="text-cyan-400 font-medium">Variable Share</div>
              <div className="font-mono tabular-nums text-white font-semibold mt-0.5">
                {formatCurrency(metrics.variableAllocatedTotal, currency)}
              </div>
              <div className="text-[11px] text-gray-400 font-mono tabular-nums">
                {metrics.masterBudget > 0
                  ? (
                      (metrics.variableAllocatedTotal / metrics.masterBudget) *
                      100
                    ).toFixed(1)
                  : '0.0'}
                % of budget
              </div>
            </div>

            <div className="bg-[#0b0f17] border border-white/5 rounded-lg p-2.5">
              <div className="text-emerald-400 font-medium">Savings Target</div>
              <div className="font-mono tabular-nums text-white font-semibold mt-0.5">
                {formatCurrency(metrics.savingsAllocated, currency)}
              </div>
              <div className="text-[11px] text-gray-400 font-mono tabular-nums">
                {savingsPercentOfMaster}% of budget
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C: INTERACTIVE CATEGORY MANAGEMENT TABLE */}
      <section className="bg-[#111827] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Interactive Category Allocation & Utilization Matrix
            </h3>
            <p className="text-xs text-gray-400">
              Auto-summed from active ledger · Amber warning &gt;85% · Crimson
              alert &gt;100%
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Segmented Filter */}
            <div className="flex items-center gap-1 p-1 bg-[#0b0f17] border border-white/10 rounded-lg">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  typeFilter === 'ALL'
                    ? 'bg-[#1f2937] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All ({metrics.categoryMetrics.length})
              </button>
              <button
                onClick={() => setTypeFilter('FIXED')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  typeFilter === 'FIXED'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Fixed (
                {
                  metrics.categoryMetrics.filter((c) => c.type === 'FIXED')
                    .length
                }
                )
              </button>
              <button
                onClick={() => setTypeFilter('VARIABLE')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  typeFilter === 'VARIABLE'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Variable (
                {
                  metrics.categoryMetrics.filter((c) => c.type === 'VARIABLE')
                    .length
                }
                )
              </button>
            </div>

            <button
              onClick={() => setIsAddingCat((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </button>
          </div>
        </div>

        {/* Inline Add Category Form */}
        {isAddingCat && (
          <form
            onSubmit={handleCreateCategory}
            className="p-4 bg-[#0b0f17] border-b border-white/10 flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] text-gray-400 mb-1">
                Category Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Medical & Supplements"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full bg-[#111827] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="w-40">
              <label className="block text-[11px] text-gray-400 mb-1">
                Velocity Class
              </label>
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as CategoryType)}
                className="w-full bg-[#111827] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="VARIABLE">VARIABLE (Daily Burn)</option>
                <option value="FIXED">FIXED (Lump-Sum)</option>
              </select>
            </div>

            <div className="w-40">
              <label className="block text-[11px] text-gray-400 mb-1">
                Allocated Budget
              </label>
              <input
                type="number"
                min={0}
                step="any"
                required
                placeholder="0"
                value={newCatAllocated}
                onChange={(e) => setNewCatAllocated(e.target.value)}
                className="w-full bg-[#111827] border border-white/15 rounded-lg px-3 py-1.5 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Save Category
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCat(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0b0f17]/60 text-[11px] font-medium text-gray-400">
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4 text-right">Allocated Budget</th>
                <th className="py-3 px-4 text-right">Actual Spend</th>
                <th className="py-3 px-4 text-right">Remaining Balance</th>
                <th className="py-3 px-4 w-56">Utilization Progress</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-xs">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-gray-500 text-xs"
                  >
                    No categories match the current filter. Click &ldquo;Add
                    Category&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const isEditing = editingCatId === cat.id;
                  const clampedBarWidth = Math.min(100, cat.utilizationPercent);

                  let barColor =
                    cat.type === 'FIXED' ? 'bg-blue-500' : 'bg-cyan-500';
                  let statusTextColor =
                    cat.type === 'FIXED' ? 'text-blue-400' : 'text-cyan-400';

                  if (cat.status === 'OVER_BUDGET') {
                    barColor = 'bg-red-500';
                    statusTextColor = 'text-red-400';
                  } else if (cat.status === 'NEAR_LIMIT') {
                    barColor = 'bg-amber-500';
                    statusTextColor = 'text-amber-400';
                  }

                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-[#1f2937]/60 transition-colors"
                    >
                      {/* Category Name */}
                      <td className="py-3 px-4 font-medium text-white">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="bg-[#0b0f17] border border-white/20 rounded px-2 py-1 text-xs text-white w-full focus:outline-none focus:border-cyan-400"
                          />
                        ) : (
                          <div>
                            <span>{cat.name}</span>
                            <span className="text-gray-500 ml-2 font-mono tabular-nums text-[11px]">
                              · {cat.txCount} tx
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Type (Clean unboxed typography per design guidelines) */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            value={editCatType}
                            onChange={(e) =>
                              setEditCatType(e.target.value as CategoryType)
                            }
                            className="bg-[#0b0f17] border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                          >
                            <option value="FIXED">FIXED</option>
                            <option value="VARIABLE">VARIABLE</option>
                          </select>
                        ) : (
                          <span
                            className={`font-mono text-[11px] font-semibold ${
                              cat.type === 'FIXED'
                                ? 'text-blue-400'
                                : 'text-cyan-400'
                            }`}
                          >
                            {cat.type}
                          </span>
                        )}
                      </td>

                      {/* Allocated Budget */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-200">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={editCatAllocated}
                            onChange={(e) =>
                              setEditCatAllocated(e.target.value)
                            }
                            className="bg-[#0b0f17] border border-white/20 rounded px-2 py-1 text-xs font-mono tabular-nums text-white text-right w-28 focus:outline-none focus:border-cyan-400"
                          />
                        ) : (
                          formatCurrency(cat.allocated, currency)
                        )}
                      </td>

                      {/* Actual Spend */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-white">
                        {formatCurrency(cat.spent, currency)}
                      </td>

                      {/* Remaining Balance */}
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          cat.remaining < 0
                            ? 'text-red-400'
                            : cat.remaining === 0
                            ? 'text-gray-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {formatCurrency(cat.remaining, currency, {
                          showSign: cat.remaining < 0,
                        })}
                      </td>

                      {/* Utilization Progress Bar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1">
                          <span className={statusTextColor}>
                            {cat.utilizationPercent.toFixed(1)}%
                          </span>
                          <span className="text-gray-500">
                            {cat.status === 'OVER_BUDGET'
                              ? 'Over Limit'
                              : cat.status === 'NEAR_LIMIT'
                              ? 'Near Limit'
                              : 'Nominal'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-150 ${barColor}`}
                            style={{ width: `${clampedBarWidth}%` }}
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleSaveEditCat(cat.id)}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingCatId(null)}
                              className="p-1.5 text-gray-400 hover:bg-white/10 rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() =>
                                onOpenQuickExpenseForCategory(cat.id)
                              }
                              className="px-2 py-1 text-[11px] font-medium text-cyan-300 hover:text-white hover:bg-cyan-500/20 rounded transition-colors whitespace-nowrap shrink-0"
                              title="Log expense in this category"
                            >
                              + Log
                            </button>
                            <button
                              onClick={() => handleStartEditCat(cat)}
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                              title="Edit category"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteCategory(cat.id)}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Delete category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-[#0b0f17]/80 font-mono tabular-nums text-xs font-semibold text-white">
                <td className="py-3 px-4">Total Category Allocations</td>
                <td className="py-3 px-4 text-gray-400 font-normal">
                  {metrics.categoryMetrics.length} categories
                </td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(metrics.totalAllocatedCategories, currency)}
                </td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(metrics.totalSpent, currency)}
                </td>
                <td
                  className={`py-3 px-4 text-right ${
                    metrics.totalAllocatedCategories - metrics.totalSpent < 0
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(
                    metrics.totalAllocatedCategories - metrics.totalSpent,
                    currency
                  )}
                </td>
                <td colSpan={2} className="py-3 px-4 text-right text-gray-400">
                  Savings Reserve:{' '}
                  <span className="text-emerald-400">
                    {formatCurrency(metrics.savingsAllocated, currency)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

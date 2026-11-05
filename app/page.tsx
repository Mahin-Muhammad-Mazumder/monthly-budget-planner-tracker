'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Category,
  CurrencyCode,
  MonthlyArchiveSnapshot,
  Transaction,
  WealthState,
} from '@/lib/wealth-types';
import {
  STORAGE_KEY,
  INITIAL_WEALTH_STATE,
  createBlankSlateState,
  calculateDerivedMetrics,
  formatCurrency,
} from '@/lib/wealth-engine';
import CommandCenterTab from '@/components/CommandCenterTab';
import CalendarHeatmapTab from '@/components/CalendarHeatmapTab';
import AnalyticsArchivesTab from '@/components/AnalyticsArchivesTab';
import TransactionLedgerTab from '@/components/TransactionLedgerTab';
import {
  QuickTransactionModal,
  StartNewMonthModal,
  DataSettingsModal,
} from '@/components/Modals';
import WarrenDrawer from '@/components/WarrenDrawer';
import {
  Plus,
  CalendarCheck2,
  Database,
  LayoutDashboard,
  CalendarDays,
  LineChart,
  ReceiptText,
} from 'lucide-react';

type ActiveTab = 'COMMAND' | 'CALENDAR' | 'ANALYTICS' | 'LEDGER';

export default function ApexWealthManagerPage() {
  const [state, setState] = useState<WealthState>(INITIAL_WEALTH_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('COMMAND');

  // Modal states
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const [quickTxInitialCategory, setQuickTxInitialCategory] = useState<
    string | null
  >(null);
  const [quickTxInitialDate, setQuickTxInitialDate] = useState<string | null>(
    null
  );
  const [isNewMonthOpen, setIsNewMonthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Hydrate from localStorage ('apex_wealth_v1') on first load; seed if empty
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.masterBudget === 'number' &&
          Array.isArray(parsed.categories) &&
          Array.isArray(parsed.transactions)
        ) {
          setState(parsed);
        } else {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(INITIAL_WEALTH_STATE)
          );
          setState(INITIAL_WEALTH_STATE);
        }
      } else {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(INITIAL_WEALTH_STATE)
        );
        setState(INITIAL_WEALTH_STATE);
      }
    } catch {
      setState(INITIAL_WEALTH_STATE);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist to localStorage on every state change after hydration
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state, isHydrated]);

  // Global keyboard shortcut: Ctrl+N or Cmd+N to open Quick Transaction Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setQuickTxInitialCategory(null);
        setQuickTxInitialDate(null);
        setIsQuickTxOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Synchronously compute all financial & velocity metrics
  const metrics = useMemo(() => calculateDerivedMetrics(state), [state]);

  // Handlers
  const handleToggleCurrency = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currency: prev.currency === 'BDT' ? 'USD' : 'BDT',
    }));
  }, []);

  const handleSetCurrency = useCallback((currency: CurrencyCode) => {
    setState((prev) => ({
      ...prev,
      currency,
    }));
  }, []);

  const handleUpdateMasterBudget = useCallback(
    (newBudget: number, newSavings: number) => {
      setState((prev) => ({
        ...prev,
        masterBudget: newBudget,
        savingsAllocated: newSavings,
      }));
    },
    []
  );

  const handleUpdateDayOverride = useCallback((day: number | null) => {
    setState((prev) => ({
      ...prev,
      currentDayOverride: day,
    }));
  }, []);

  const handleAddCategory = useCallback((cat: Omit<Category, 'id'>) => {
    const newId = `cat-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, { ...cat, id: newId }],
    }));
  }, []);

  const handleUpdateCategory = useCallback(
    (id: string, updates: Partial<Omit<Category, 'id'>>) => {
      setState((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));
    },
    []
  );

  const handleDeleteCategory = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      transactions: prev.transactions.filter((tx) => tx.categoryId !== id),
    }));
  }, []);

  const handleAddTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));
  }, []);

  const handleUpdateTransaction = useCallback(
    (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          tx.id === id ? { ...tx, ...updates } : tx
        ),
      }));
    },
    []
  );

  const handleDeleteTransaction = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((tx) => tx.id !== id),
    }));
  }, []);

  const handleOpenQuickExpenseForCategory = useCallback(
    (categoryId: string) => {
      setQuickTxInitialCategory(categoryId);
      setQuickTxInitialDate(null);
      setIsQuickTxOpen(true);
    },
    []
  );

  const handleOpenQuickExpenseForDate = useCallback((dateStr: string) => {
    setQuickTxInitialDate(dateStr);
    setQuickTxInitialCategory(null);
    setIsQuickTxOpen(true);
  }, []);

  const handleConfirmNewMonth = useCallback(
    (options: {
      rolloverSurplus: boolean;
      nextMonthKey: string;
      nextMonthLabel: string;
      nextMasterBudget: number;
      nextSavingsAllocated: number;
    }) => {
      setState((prev) => {
        const currentMetrics = calculateDerivedMetrics(prev);
        const unspentVariableSurplus = Math.max(
          0,
          currentMetrics.remainingVariableAllocation
        );
        const finalSavingsAdded =
          currentMetrics.savingsAllocated +
          (options.rolloverSurplus ? unspentVariableSurplus : 0);
        const newCumulativeReserve =
          prev.cumulativeSavingsReserve + finalSavingsAdded;
        const finalSavingsRatePercent =
          currentMetrics.masterBudget > 0
            ? (finalSavingsAdded / currentMetrics.masterBudget) * 100
            : 0;

        const snapshot: MonthlyArchiveSnapshot = {
          id: `arch-${prev.activeMonthKey}-${Date.now()}`,
          monthKey: prev.activeMonthKey,
          monthLabel: prev.activeMonthLabel,
          closedAt: new Date().toISOString(),
          masterBudget: currentMetrics.masterBudget,
          totalSpent: currentMetrics.totalSpent,
          fixedSpent: currentMetrics.fixedSpentTotal,
          variableSpent: currentMetrics.variableSpentTotal,
          savingsAllocated: currentMetrics.savingsAllocated,
          unspentVariableSurplus,
          surplusRolledOver: options.rolloverSurplus,
          finalSavingsAdded,
          cumulativeSavingsAfterClose: newCumulativeReserve,
          finalSavingsRatePercent: Number(finalSavingsRatePercent.toFixed(1)),
          healthScore: currentMetrics.financialHealthScore,
          categories: currentMetrics.categoryMetrics.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            allocated: c.allocated,
            spent: c.spent,
          })),
          transactions: [...prev.transactions],
        };

        return {
          ...prev,
          activeMonthKey: options.nextMonthKey,
          activeMonthLabel: options.nextMonthLabel,
          currentDayOverride: 1,
          masterBudget: options.nextMasterBudget,
          savingsAllocated: options.nextSavingsAllocated,
          cumulativeSavingsReserve: newCumulativeReserve,
          transactions: [],
          archives: [...prev.archives, snapshot],
        };
      });
    },
    []
  );

  const handleDeleteArchive = useCallback((archiveId: string) => {
    setState((prev) => ({
      ...prev,
      archives: prev.archives.filter((a) => a.id !== archiveId),
    }));
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 flex flex-col">
      {/* TOP BAR CONTRACT: 3 Zones (1-line Brand Wordmark | 4 Single-Line Nav Links | 1 Primary CTA) */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('COMMAND');
          }}
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Apex Wealth Manager
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('COMMAND')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'COMMAND'
                ? 'text-white border-cyan-400'
                : 'text-gray-400 hover:text-white border-transparent'
            }`}
          >
            Command Center
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CALENDAR')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'CALENDAR'
                ? 'text-white border-cyan-400'
                : 'text-gray-400 hover:text-white border-transparent'
            }`}
          >
            Calendar Heatmap
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ANALYTICS')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'ANALYTICS'
                ? 'text-white border-cyan-400'
                : 'text-gray-400 hover:text-white border-transparent'
            }`}
          >
            Analytics &amp; Archives
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LEDGER')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'LEDGER'
                ? 'text-white border-cyan-400'
                : 'text-gray-400 hover:text-white border-transparent'
            }`}
          >
            Transaction Ledger
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setQuickTxInitialCategory(null);
              setQuickTxInitialDate(null);
              setIsQuickTxOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Expense (Ctrl+N)
          </button>
        </div>
      </header>

      {/* WORKSPACE CONTEXT & UTILITY TOOLBAR */}
      <div className="border-b border-white/10 bg-[#111827]/70 px-6 py-2.5">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left: Operator Identity & Live Safe-to-Spend Telemetry */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span className="font-semibold text-gray-200">{state.user}</span>
            <span aria-hidden="true">·</span>
            <span>{state.activeMonthLabel}</span>
            <span aria-hidden="true">·</span>
            <span>
              Safe-to-Spend:{' '}
              <strong className="font-mono tabular-nums text-cyan-300">
                {formatCurrency(metrics.dailySafeToSpend, state.currency, {
                  showDecimals: true,
                })}
                /day
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Health Score:{' '}
              <strong
                className={`font-mono tabular-nums ${
                  metrics.financialHealthScore >= 80
                    ? 'text-emerald-400'
                    : metrics.financialHealthScore >= 60
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {metrics.financialHealthScore}/100
              </strong>
            </span>
          </div>

          {/* Right: 1-Click Currency Switcher, Start New Month, and Data Settings */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1-Click Currency Switcher */}
            <div className="flex items-center p-0.5 bg-[#0b0f17] border border-white/10 rounded-lg">
              <button
                type="button"
                onClick={() => handleSetCurrency('BDT')}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  state.currency === 'BDT'
                    ? 'bg-[#1f2937] text-cyan-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                ৳ BDT
              </button>
              <button
                type="button"
                onClick={() => handleSetCurrency('USD')}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  state.currency === 'USD'
                    ? 'bg-[#1f2937] text-cyan-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                $ USD
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsNewMonthOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              Start New Month
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-[#0b0f17] hover:bg-[#1f2937] border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              Data Settings
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher (visible on < md screens) */}
        <div className="flex md:hidden items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('COMMAND')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 ${
              activeTab === 'COMMAND'
                ? 'bg-[#1f2937] text-white'
                : 'text-gray-400'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Command Center
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CALENDAR')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 ${
              activeTab === 'CALENDAR'
                ? 'bg-[#1f2937] text-white'
                : 'text-gray-400'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Calendar Heatmap
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ANALYTICS')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 ${
              activeTab === 'ANALYTICS'
                ? 'bg-[#1f2937] text-white'
                : 'text-gray-400'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            Analytics &amp; Archives
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LEDGER')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 ${
              activeTab === 'LEDGER'
                ? 'bg-[#1f2937] text-white'
                : 'text-gray-400'
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5" />
            Ledger ({state.transactions.length})
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE VIEWPORT */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-6 pb-20">
        {activeTab === 'COMMAND' && (
          <CommandCenterTab
            currency={state.currency}
            activeMonthLabel={state.activeMonthLabel}
            metrics={metrics}
            onUpdateMasterBudget={handleUpdateMasterBudget}
            onUpdateDayOverride={handleUpdateDayOverride}
            currentDayOverride={state.currentDayOverride}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onOpenQuickExpenseForCategory={handleOpenQuickExpenseForCategory}
          />
        )}

        {activeTab === 'CALENDAR' && (
          <CalendarHeatmapTab
            activeMonthKey={state.activeMonthKey}
            activeMonthLabel={state.activeMonthLabel}
            currency={state.currency}
            metrics={metrics}
            categories={state.categories}
            transactions={state.transactions}
            onOpenQuickExpenseForDate={handleOpenQuickExpenseForDate}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'ANALYTICS' && (
          <AnalyticsArchivesTab
            currency={state.currency}
            activeMonthKey={state.activeMonthKey}
            activeMonthLabel={state.activeMonthLabel}
            metrics={metrics}
            archives={state.archives}
            onDeleteArchive={handleDeleteArchive}
            onOpenNewMonthModal={() => setIsNewMonthOpen(true)}
          />
        )}

        {activeTab === 'LEDGER' && (
          <TransactionLedgerTab
            currency={state.currency}
            activeMonthLabel={state.activeMonthLabel}
            categories={state.categories}
            transactions={state.transactions}
            onOpenQuickExpense={() => {
              setQuickTxInitialCategory(null);
              setQuickTxInitialDate(null);
              setIsQuickTxOpen(true);
            }}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}
      </main>

      {/* MODALS */}
      <QuickTransactionModal
        isOpen={isQuickTxOpen}
        onClose={() => setIsQuickTxOpen(false)}
        currency={state.currency}
        activeMonthKey={state.activeMonthKey}
        currentDayOfMonth={metrics.currentDayOfMonth}
        categories={state.categories}
        metrics={metrics}
        initialCategoryId={quickTxInitialCategory}
        initialDate={quickTxInitialDate}
        onAddTransaction={handleAddTransaction}
      />

      <StartNewMonthModal
        isOpen={isNewMonthOpen}
        onClose={() => setIsNewMonthOpen(false)}
        state={state}
        metrics={metrics}
        onConfirmNewMonth={handleConfirmNewMonth}
      />

      <DataSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        state={state}
        onImportState={(imported) => setState(imported)}
        onResetToDemoSeed={() => setState(INITIAL_WEALTH_STATE)}
        onResetToBlankSlate={() =>
          setState(createBlankSlateState(state.currency))
        }
      />

      {/* FLOATING WARREN AI TERMINAL DRAWER */}
      <WarrenDrawer state={state} metrics={metrics} />
    </div>
  );
}

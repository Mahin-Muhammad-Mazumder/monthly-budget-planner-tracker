'use client';

import React, { useState, useEffect } from 'react';
import {
  Category,
  CurrencyCode,
  DerivedMetrics,
  Transaction,
  WealthState,
} from '@/lib/wealth-types';
import { formatCurrency } from '@/lib/wealth-engine';
import {
  X,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';

/* ============================================================================
 * 1. QUICK TRANSACTION MODAL (Ctrl + N) WITH LIVE IMPACT PREVIEW
 * ========================================================================== */
interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  activeMonthKey: string;
  currentDayOfMonth: number;
  categories: Category[];
  metrics: DerivedMetrics;
  initialCategoryId?: string | null;
  initialDate?: string | null;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
}

export function QuickTransactionModal({
  isOpen,
  onClose,
  currency,
  activeMonthKey,
  currentDayOfMonth,
  categories,
  metrics,
  initialCategoryId,
  initialDate,
  onAddTransaction,
}: QuickTransactionModalProps) {
  const defaultDate =
    initialDate ||
    `${activeMonthKey}-${String(currentDayOfMonth).padStart(2, '0')}`;

  const defaultCatId =
    initialCategoryId ||
    categories.find((c) => c.type === 'VARIABLE')?.id ||
    categories[0]?.id ||
    '';

  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCatId);
  const [date, setDate] = useState(defaultDate);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCost('');
      setNotes('');
      setCategoryId(
        initialCategoryId ||
          categories.find((c) => c.type === 'VARIABLE')?.id ||
          categories[0]?.id ||
          ''
      );
      setDate(
        initialDate ||
          `${activeMonthKey}-${String(currentDayOfMonth).padStart(2, '0')}`
      );
    }
  }, [
    isOpen,
    initialCategoryId,
    initialDate,
    activeMonthKey,
    currentDayOfMonth,
    categories,
  ]);

  if (!isOpen) return null;

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const parsedCost = Math.max(0, Number(cost) || 0);
  const isVariable = selectedCategory?.type === 'VARIABLE';

  // Live Impact Preview math for Variable category expenses
  const daysLeft = Math.max(1, metrics.daysLeftInMonth);
  const currentSafeToSpend = metrics.dailySafeToSpend;
  const newRemainingVarPool = Math.max(
    0,
    metrics.remainingVariableAllocation - parsedCost
  );
  const newSafeToSpend = newRemainingVarPool / daysLeft;
  const dailyReduction = Math.max(0, currentSafeToSpend - newSafeToSpend);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || parsedCost <= 0 || !categoryId) return;
    onAddTransaction({
      title: title.trim(),
      amount: parsedCost,
      categoryId,
      date,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-white/15 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0b0f17]">
          <div>
            <h3 className="text-base font-semibold text-white">
              Log Expense Entry
            </h3>
            <p className="text-xs text-gray-400">
              Shortcut: <span className="font-mono text-cyan-300">Ctrl+N</span>{' '}
              · Live Safe-to-Spend velocity impact preview
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Item / Activity Description
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g., Fresh Fish & Vegetables at Bazar"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0b0f17] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Cost ({currency === 'BDT' ? '৳' : '$'})
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full bg-[#0b0f17] border border-white/15 rounded-lg px-3.5 py-2 text-sm font-mono tabular-nums text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#0b0f17] border border-white/15 rounded-lg px-3.5 py-2 text-sm font-mono tabular-nums text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Target Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-[#0b0f17] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — [{c.type}]
                </option>
              ))}
            </select>
          </div>

          {/* LIVE IMPACT PREVIEW BOX */}
          <div
            className={`rounded-lg p-3.5 border text-xs ${
              isVariable
                ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-100'
                : 'bg-blue-950/30 border-blue-500/30 text-blue-100'
            }`}
          >
            {isVariable ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-cyan-300">
                  <TrendingDown className="w-4 h-4 shrink-0" />
                  <span>
                    This expense will reduce your Daily Safe-to-Spend by{' '}
                    <span className="font-mono tabular-nums font-bold text-white">
                      {formatCurrency(dailyReduction, currency, {
                        showDecimals: true,
                      })}
                      /day
                    </span>
                    .
                  </span>
                </div>
                <div className="text-[11px] text-gray-300 font-mono tabular-nums flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10">
                  <span>
                    Current Safe Rate:{' '}
                    {formatCurrency(currentSafeToSpend, currency, {
                      showDecimals: true,
                    })}
                    /day
                  </span>
                  <span>→</span>
                  <span
                    className={
                      newSafeToSpend <= 0 ? 'text-red-400 font-bold' : 'text-emerald-300 font-bold'
                    }
                  >
                    New Safe Rate:{' '}
                    {formatCurrency(newSafeToSpend, currency, {
                      showDecimals: true,
                    })}
                    /day ({daysLeft}d left)
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-blue-200">
                <span className="font-semibold text-blue-300">
                  Fixed Category Selected:
                </span>{' '}
                Tracked strictly against its lump-sum allocation. Excluded from
                Daily Variable Safe-to-Spend velocity.
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Optional Note
            </label>
            <input
              type="text"
              placeholder="Merchant, payment method, or context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0b0f17] border border-white/15 rounded-lg px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Commit Expense to Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
 * 2. START NEW MONTH WORKFLOW (ROLLOVER & ARCHIVE SNAPSHOT MODAL)
 * ========================================================================== */
interface StartNewMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: WealthState;
  metrics: DerivedMetrics;
  onConfirmNewMonth: (options: {
    rolloverSurplus: boolean;
    nextMonthKey: string;
    nextMonthLabel: string;
    nextMasterBudget: number;
    nextSavingsAllocated: number;
  }) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function computeNextMonth(activeMonthKey: string): {
  key: string;
  label: string;
} {
  const [yStr, mStr] = activeMonthKey.split('-');
  let year = parseInt(yStr, 10) || 2026;
  let month = parseInt(mStr, 10) || 10;
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const label = `${MONTH_NAMES[month - 1]} ${year}`;
  return { key, label };
}

export function StartNewMonthModal({
  isOpen,
  onClose,
  state,
  metrics,
  onConfirmNewMonth,
}: StartNewMonthModalProps) {
  const nextMonthDefault = computeNextMonth(state.activeMonthKey);
  const unspentVariableSurplus = Math.max(
    0,
    metrics.remainingVariableAllocation
  );

  const [rolloverSurplus, setRolloverSurplus] = useState(true);
  const [nextMonthKey, setNextMonthKey] = useState(nextMonthDefault.key);
  const [nextMonthLabel, setNextMonthLabel] = useState(nextMonthDefault.label);
  const [nextMasterBudget, setNextMasterBudget] = useState(
    String(state.masterBudget)
  );
  const [nextSavingsAllocated, setNextSavingsAllocated] = useState(
    String(state.savingsAllocated)
  );

  useEffect(() => {
    if (isOpen) {
      const next = computeNextMonth(state.activeMonthKey);
      setNextMonthKey(next.key);
      setNextMonthLabel(next.label);
      setNextMasterBudget(String(state.masterBudget));
      setNextSavingsAllocated(String(state.savingsAllocated));
      setRolloverSurplus(true);
    }
  }, [isOpen, state.activeMonthKey, state.masterBudget, state.savingsAllocated]);

  if (!isOpen) return null;

  const totalSavingsAddedThisMonth =
    metrics.savingsAllocated + (rolloverSurplus ? unspentVariableSurplus : 0);
  const projectedCumulativeReserve =
    metrics.cumulativeSavingsReserve + totalSavingsAddedThisMonth;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmNewMonth({
      rolloverSurplus,
      nextMonthKey: nextMonthKey.trim() || nextMonthDefault.key,
      nextMonthLabel: nextMonthLabel.trim() || nextMonthDefault.label,
      nextMasterBudget: Math.max(0, Number(nextMasterBudget) || 0),
      nextSavingsAllocated: Math.max(0, Number(nextSavingsAllocated) || 0),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-white/15 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0b0f17]">
          <div>
            <h3 className="text-base font-semibold text-white">
              Close {state.activeMonthLabel} &amp; Roll Over to New Month
            </h3>
            <p className="text-xs text-gray-400">
              Snapshots current ledger &amp; metrics into Historical Archives
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-5">
          {/* Closing Month Summary */}
          <div className="bg-[#0b0f17] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
              <span className="font-semibold text-white">
                Closing Summary: {state.activeMonthLabel}
              </span>
              <span className="font-mono tabular-nums text-cyan-400">
                Final Health Score: {metrics.financialHealthScore}/100
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
              <div>
                <div className="text-gray-400 font-sans text-[11px]">
                  Total Spent
                </div>
                <div className="text-white font-semibold mt-0.5">
                  {formatCurrency(metrics.totalSpent, state.currency)}
                </div>
              </div>

              <div>
                <div className="text-gray-400 font-sans text-[11px]">
                  Base Savings Deposit
                </div>
                <div className="text-emerald-400 font-semibold mt-0.5">
                  {formatCurrency(metrics.savingsAllocated, state.currency)}
                </div>
              </div>

              <div>
                <div className="text-gray-400 font-sans text-[11px]">
                  Unspent Variable Surplus
                </div>
                <div className="text-cyan-300 font-bold mt-0.5">
                  {formatCurrency(unspentVariableSurplus, state.currency)}
                </div>
              </div>
            </div>
          </div>

          {/* Rollover Checkbox Prompt */}
          <label className="flex items-start gap-3 p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/40 cursor-pointer">
            <input
              type="checkbox"
              checked={rolloverSurplus}
              onChange={(e) => setRolloverSurplus(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-emerald-500 text-emerald-500 focus:ring-emerald-500"
            />
            <div className="text-xs">
              <div className="font-semibold text-emerald-300">
                Roll over unspent variable surplus (
                {formatCurrency(unspentVariableSurplus, state.currency)}) into
                Cumulative Savings Reserve?
              </div>
              <div className="text-gray-300 mt-1 font-mono tabular-nums">
                New Cumulative Savings Reserve:{' '}
                <span className="text-white font-bold">
                  {formatCurrency(projectedCumulativeReserve, state.currency)}
                </span>{' '}
                (+{formatCurrency(totalSavingsAddedThisMonth, state.currency)}{' '}
                this month)
              </div>
            </div>
          </label>

          {/* New Month Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                New Month Label
              </label>
              <input
                type="text"
                required
                value={nextMonthLabel}
                onChange={(e) => setNextMonthLabel(e.target.value)}
                className="w-full bg-[#0b0f17] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Month Key (YYYY-MM)
              </label>
              <input
                type="text"
                required
                pattern="\d{4}-\d{2}"
                value={nextMonthKey}
                onChange={(e) => setNextMonthKey(e.target.value)}
                className="w-full bg-[#0b0f17] border border-white/15 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Next Month Master Budget
              </label>
              <input
                type="number"
                required
                min={0}
                value={nextMasterBudget}
                onChange={(e) => setNextMasterBudget(e.target.value)}
                className="w-full bg-[#0b0f17] border border-white/15 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Next Month Savings Deposit
              </label>
              <input
                type="number"
                required
                min={0}
                value={nextSavingsAllocated}
                onChange={(e) => setNextSavingsAllocated(e.target.value)}
                className="w-full bg-[#0b0f17] border border-white/15 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-emerald-400 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              Archive {state.activeMonthLabel} &amp; Start {nextMonthLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
 * 3. DATA & STORAGE SETTINGS MODAL (JSON EXPORT / IMPORT / RESET)
 * ========================================================================== */
interface DataSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: WealthState;
  onImportState: (newState: WealthState) => void;
  onResetToDemoSeed: () => void;
  onResetToBlankSlate: () => void;
}

export function DataSettingsModal({
  isOpen,
  onClose,
  state,
  onImportState,
  onResetToDemoSeed,
  onResetToBlankSlate,
}: DataSettingsModalProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'SUCCESS' | 'ERROR';
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmBlank, setConfirmBlank] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setJsonInput('');
      setStatusMessage(null);
      setConfirmBlank(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadJSON = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex_wealth_v1_${state.activeMonthKey}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({
      type: 'SUCCESS',
      text: 'Exported full state snapshot as JSON file.',
    });
  };

  const handleCopyJSON = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleImportJSON = () => {
    if (!jsonInput.trim()) {
      setStatusMessage({
        type: 'ERROR',
        text: 'Paste a valid Apex Wealth Manager JSON payload first.',
      });
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      if (
        !parsed ||
        typeof parsed.masterBudget !== 'number' ||
        !Array.isArray(parsed.categories) ||
        !Array.isArray(parsed.transactions)
      ) {
        throw new Error(
          'Invalid schema: missing masterBudget, categories, or transactions array.'
        );
      }
      onImportState(parsed as WealthState);
      setStatusMessage({
        type: 'SUCCESS',
        text: 'Successfully imported state into localStorage (apex_wealth_v1).',
      });
      setJsonInput('');
    } catch (err) {
      setStatusMessage({
        type: 'ERROR',
        text:
          err instanceof Error
            ? err.message
            : 'Invalid JSON format. Could not parse.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setJsonInput(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-white/15 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0b0f17]">
          <div>
            <h3 className="text-base font-semibold text-white">
              Local Persistence &amp; Data Management
            </h3>
            <p className="text-xs text-gray-400">
              Storage Key: <span className="font-mono text-cyan-300">apex_wealth_v1</span> · Export, Import, or Reset Workspace
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                statusMessage.type === 'SUCCESS'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Export Section */}
          <div className="bg-[#0b0f17] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-white">
              1. Backup &amp; Export State (JSON)
            </div>
            <p className="text-xs text-gray-400">
              Export your complete Master Budget, Categories, Active Ledger, and
              Historical Archives.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleDownloadJSON}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download JSON Backup
              </button>
              <button
                onClick={handleCopyJSON}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#111827] hover:bg-[#1f2937] border border-white/10 text-gray-200 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    Copy Raw JSON
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-[#0b0f17] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                2. Import / Restore JSON Snapshot
              </span>
              <label className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer underline">
                Upload .json file
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              rows={4}
              placeholder="Paste apex_wealth_v1 JSON content here..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full bg-[#111827] border border-white/15 rounded-lg p-3 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleImportJSON}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Import &amp; Overwrite State
            </button>
          </div>

          {/* Reset Controls */}
          <div className="bg-[#0b0f17] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-white">
              3. Workspace Initialization &amp; Reset
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  onResetToDemoSeed();
                  setStatusMessage({
                    type: 'SUCCESS',
                    text: 'Restored rich 3-month historical archive + active month demo seed.',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#111827] hover:bg-[#1f2937] border border-white/15 text-gray-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                Restore Demo Seed Data
              </button>

              {!confirmBlank ? (
                <button
                  onClick={() => setConfirmBlank(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-300 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset to Blank Slate
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onResetToBlankSlate();
                      setConfirmBlank(false);
                      setStatusMessage({
                        type: 'SUCCESS',
                        text: 'Workspace reset to a clean blank slate.',
                      });
                    }}
                    className="px-3.5 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                  >
                    Confirm Wipe to Blank Slate
                  </button>
                  <button
                    onClick={() => setConfirmBlank(false)}
                    className="px-2.5 py-2 text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

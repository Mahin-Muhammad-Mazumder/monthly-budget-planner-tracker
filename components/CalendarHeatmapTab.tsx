'use client';

import React, { useState, useMemo } from 'react';
import {
  Category,
  CurrencyCode,
  DerivedMetrics,
  Transaction,
} from '@/lib/wealth-types';
import { formatCurrency } from '@/lib/wealth-engine';
import {
  Calendar as CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';

interface CalendarHeatmapTabProps {
  activeMonthKey: string; // YYYY-MM
  activeMonthLabel: string;
  currency: CurrencyCode;
  metrics: DerivedMetrics;
  categories: Category[];
  transactions: Transaction[];
  onOpenQuickExpenseForDate: (dateStr: string) => void;
  onUpdateTransaction: (
    id: string,
    updates: Partial<Omit<Transaction, 'id'>>
  ) => void;
  onDeleteTransaction: (id: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarHeatmapTab({
  activeMonthKey,
  activeMonthLabel,
  currency,
  metrics,
  categories,
  transactions,
  onOpenQuickExpenseForDate,
  onUpdateTransaction,
  onDeleteTransaction,
}: CalendarHeatmapTabProps) {
  const defaultSelectedDate = `${activeMonthKey}-${String(
    metrics.currentDayOfMonth
  ).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string>(defaultSelectedDate);

  // Inline transaction editing in the side panel
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  // Group transactions by date (YYYY-MM-DD)
  const dailyDataMap = useMemo(() => {
    const map = new Map<
      string,
      {
        totalSpend: number;
        variableSpend: number;
        fixedSpend: number;
        txs: Transaction[];
      }
    >();

    for (const tx of transactions) {
      const cat = categoryMap.get(tx.categoryId);
      const isFixed = cat?.type === 'FIXED';
      const entry = map.get(tx.date) || {
        totalSpend: 0,
        variableSpend: 0,
        fixedSpend: 0,
        txs: [],
      };
      entry.totalSpend += tx.amount;
      if (isFixed) {
        entry.fixedSpend += tx.amount;
      } else {
        entry.variableSpend += tx.amount;
      }
      entry.txs.push(tx);
      map.set(tx.date, entry);
    }
    return map;
  }, [transactions, categoryMap]);

  // Compute calendar grid cells for activeMonthKey
  const calendarCells = useMemo(() => {
    const [yearStr, monthStr] = activeMonthKey.split('-');
    const year = parseInt(yearStr, 10) || 2026;
    const month = parseInt(monthStr, 10) || 10;
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const totalDays = metrics.daysInMonth;

    const cells: Array<{
      day: number | null;
      dateStr: string | null;
    }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${activeMonthKey}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [activeMonthKey, metrics.daysInMonth]);

  const safeThreshold = Math.max(1, metrics.dailySafeToSpend);

  const selectedDayInfo = dailyDataMap.get(selectedDate) || {
    totalSpend: 0,
    variableSpend: 0,
    fixedSpend: 0,
    txs: [],
  };

  const handleStartEditTx = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditTitle(tx.title);
    setEditAmount(String(tx.amount));
    setEditCategoryId(tx.categoryId);
  };

  const handleSaveEditTx = (id: string) => {
    if (!editTitle.trim()) return;
    onUpdateTransaction(id, {
      title: editTitle.trim(),
      amount: Math.max(0, Number(editAmount) || 0),
      categoryId: editCategoryId,
    });
    setEditingTxId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 8 Columns: Monthly Heatmap Grid */}
      <div className="lg:col-span-8 bg-[#111827] border border-white/10 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">
              {activeMonthLabel} Expenditure Heatmap
            </h2>
            <p className="text-xs text-gray-400">
              Color-coded against Daily Safe-to-Spend threshold (
              <span className="font-mono tabular-nums text-cyan-300">
                {formatCurrency(metrics.dailySafeToSpend, currency, {
                  showDecimals: true,
                })}
                /day
              </span>
              ) · Click any date to inspect
            </p>
          </div>

          {/* Heatmap Intensity Key */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#0b0f17] border border-white/10 inline-block" />
              Zero Spend
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />
              Under Safe Rate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40 inline-block" />
              1x–2x Rate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500/25 border border-red-500/50 inline-block" />
              High / Over Threshold
            </span>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mt-4 mb-2 text-center text-xs font-medium text-gray-400">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, index) => {
            if (!cell.day || !cell.dateStr) {
              return (
                <div
                  key={`empty-${index}`}
                  className="h-24 rounded-lg bg-[#0b0f17]/40 border border-white/5"
                />
              );
            }

            const dayData = dailyDataMap.get(cell.dateStr);
            const totalSpend = dayData?.totalSpend || 0;
            const variableSpend = dayData?.variableSpend || 0;
            const fixedSpend = dayData?.fixedSpend || 0;
            const txCount = dayData?.txs.length || 0;
            const isSelected = selectedDate === cell.dateStr;
            const isCurrentSimDay = cell.day === metrics.currentDayOfMonth;

            // Intensity calculation against Daily Safe-to-Spend
            let cellStyle =
              'bg-[#0b0f17] border-white/10 hover:border-white/30 text-gray-300';
            let spendTextStyle = 'text-gray-500';

            if (totalSpend > 0) {
              if (variableSpend === 0 && fixedSpend > 0) {
                // Strictly Fixed obligation day
                cellStyle =
                  'bg-blue-950/40 border-blue-500/40 hover:border-blue-400 text-blue-200';
                spendTextStyle = 'text-blue-400';
              } else if (variableSpend <= safeThreshold) {
                // Under Daily Safe-to-Spend
                cellStyle =
                  'bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400 text-emerald-200';
                spendTextStyle = 'text-emerald-400';
              } else if (variableSpend <= safeThreshold * 2) {
                // 1x - 2x Safe-to-Spend
                cellStyle =
                  'bg-amber-950/40 border-amber-500/40 hover:border-amber-400 text-amber-200';
                spendTextStyle = 'text-amber-400';
              } else {
                // Heavy variable spend day (> 2x Daily Safe-to-Spend)
                cellStyle =
                  'bg-red-950/45 border-red-500/50 hover:border-red-400 text-red-200';
                spendTextStyle = 'text-red-400';
              }
            }

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => setSelectedDate(cell.dateStr!)}
                className={`h-24 rounded-lg p-2.5 border text-left flex flex-col justify-between transition-all ${cellStyle} ${
                  isSelected
                    ? 'ring-2 ring-cyan-400 border-cyan-400'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-mono tabular-nums font-semibold ${
                      isCurrentSimDay ? 'text-cyan-300 underline' : ''
                    }`}
                  >
                    {String(cell.day).padStart(2, '0')}
                  </span>
                  {txCount > 0 && (
                    <span className="text-[10px] font-mono tabular-nums text-gray-400">
                      {txCount} tx
                    </span>
                  )}
                </div>

                <div>
                  <div
                    className={`text-xs font-mono tabular-nums font-bold truncate ${spendTextStyle}`}
                  >
                    {totalSpend > 0
                      ? formatCurrency(totalSpend, currency)
                      : '—'}
                  </div>
                  {totalSpend > 0 && (
                    <div className="text-[10px] font-mono tabular-nums text-gray-400 truncate">
                      {variableSpend > 0
                        ? `Var ${formatCurrency(variableSpend, currency)}`
                        : 'Fixed Bill'}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right 4 Columns: Day Inspector Side Panel */}
      <div className="lg:col-span-4 bg-[#111827] border border-white/10 rounded-xl p-5 sticky top-6">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-semibold text-white font-mono tabular-nums">
                {selectedDate}
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Daily Ledger Inspector · {selectedDayInfo.txs.length} transactions
            </p>
          </div>

          <button
            onClick={() => onOpenQuickExpenseForDate(selectedDate)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Log on Date
          </button>
        </div>

        {/* Selected Date Summary Metrics */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-3">
            <div className="text-[11px] text-gray-400">Day Total Outflow</div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums text-white">
              {formatCurrency(selectedDayInfo.totalSpend, currency)}
            </div>
          </div>

          <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-3">
            <div className="text-[11px] text-gray-400">
              Variable vs Safe Rate
            </div>
            <div
              className={`mt-1 text-lg font-bold font-mono tabular-nums ${
                selectedDayInfo.variableSpend > metrics.dailySafeToSpend
                  ? 'text-red-400'
                  : 'text-emerald-400'
              }`}
            >
              {formatCurrency(selectedDayInfo.variableSpend, currency)}
            </div>
          </div>
        </div>

        {/* Transactions List for Selected Date */}
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {selectedDayInfo.txs.length === 0 ? (
            <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-6 text-center">
              <p className="text-xs text-gray-400">
                Zero transactions recorded on {selectedDate}.
              </p>
              <button
                onClick={() => onOpenQuickExpenseForDate(selectedDate)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Expense for {selectedDate}
              </button>
            </div>
          ) : (
            selectedDayInfo.txs.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const isEditing = editingTxId === tx.id;

              return (
                <div
                  key={tx.id}
                  className="bg-[#0b0f17] border border-white/10 rounded-lg p-3.5 hover:border-white/20 transition-colors"
                >
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-[#111827] border border-white/20 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="flex-1 bg-[#111827] border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.type})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-28 bg-[#111827] border border-white/20 rounded px-2 py-1 text-xs font-mono tabular-nums text-white text-right focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSaveEditTx(tx.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                        >
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button
                          onClick={() => setEditingTxId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">
                          {tx.title}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                          <span
                            className={
                              cat?.type === 'FIXED'
                                ? 'text-blue-400 font-medium'
                                : 'text-cyan-400 font-medium'
                            }
                          >
                            {cat?.name || 'Uncategorized'}
                          </span>
                          <span>·</span>
                          <span className="font-mono">{cat?.type || 'VAR'}</span>
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-gray-500 mt-1 truncate">
                            {tx.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <div className="text-xs font-mono tabular-nums font-bold text-white">
                          {formatCurrency(tx.amount, currency)}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <button
                            onClick={() => handleStartEditTx(tx)}
                            className="p-1 text-gray-400 hover:text-white rounded transition-colors"
                            title="Edit transaction"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

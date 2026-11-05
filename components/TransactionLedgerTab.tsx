'use client';

import React, { useState, useMemo } from 'react';
import {
  Category,
  CategoryType,
  CurrencyCode,
  Transaction,
} from '@/lib/wealth-types';
import { formatCurrency } from '@/lib/wealth-engine';
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  Check,
  X,
  ArrowUpDown,
} from 'lucide-react';

interface TransactionLedgerTabProps {
  currency: CurrencyCode;
  activeMonthLabel: string;
  categories: Category[];
  transactions: Transaction[];
  onOpenQuickExpense: () => void;
  onUpdateTransaction: (
    id: string,
    updates: Partial<Omit<Transaction, 'id'>>
  ) => void;
  onDeleteTransaction: (id: string) => void;
}

export default function TransactionLedgerTab({
  currency,
  activeMonthLabel,
  categories,
  transactions,
  onOpenQuickExpense,
  onUpdateTransaction,
  onDeleteTransaction,
}: TransactionLedgerTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<'ALL' | CategoryType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<
    'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'
  >('DATE_DESC');

  // Inline transaction editing state
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        const cat = categoryMap.get(tx.categoryId);
        if (classFilter !== 'ALL' && cat?.type !== classFilter) {
          return false;
        }
        if (categoryFilter !== 'ALL' && tx.categoryId !== categoryFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = tx.title.toLowerCase().includes(q);
          const matchNotes = (tx.notes || '').toLowerCase().includes(q);
          const matchCat = (cat?.name || '').toLowerCase().includes(q);
          if (!matchTitle && !matchNotes && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'DATE_DESC') return b.date.localeCompare(a.date);
        if (sortOrder === 'DATE_ASC') return a.date.localeCompare(b.date);
        if (sortOrder === 'AMOUNT_DESC') return b.amount - a.amount;
        return a.amount - b.amount;
      });
  }, [transactions, categoryMap, classFilter, categoryFilter, searchQuery, sortOrder]);

  const filteredSum = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => acc + tx.amount, 0);
  }, [filteredTransactions]);

  const handleStartEdit = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditTitle(tx.title);
    setEditAmount(String(tx.amount));
    setEditCategoryId(tx.categoryId);
    setEditDate(tx.date);
    setEditNotes(tx.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    onUpdateTransaction(id, {
      title: editTitle.trim(),
      amount: Math.max(0, Number(editAmount) || 0),
      categoryId: editCategoryId,
      date: editDate,
      notes: editNotes.trim() || undefined,
    });
    setEditingTxId(null);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Item/Activity', 'Category', 'Class', 'Amount', 'Notes'];
    const rows = filteredTransactions.map((tx) => {
      const cat = categoryMap.get(tx.categoryId);
      return [
        tx.date,
        `"${tx.title.replace(/"/g, '""')}"`,
        `"${(cat?.name || 'Uncategorized').replace(/"/g, '""')}"`,
        cat?.type || 'VARIABLE',
        tx.amount,
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `apex_wealth_ledger_${activeMonthLabel.replace(/\s+/g, '_').toLowerCase()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl overflow-hidden">
      {/* Header & Controls Bar */}
      <div className="p-5 border-b border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Active Month Transaction Ledger ({activeMonthLabel})
            </h2>
            <p className="text-xs text-gray-400 font-mono tabular-nums">
              Showing {filteredTransactions.length} of {transactions.length}{' '}
              entries · Filtered Total:{' '}
              <span className="text-cyan-300 font-semibold">
                {formatCurrency(filteredSum, currency)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-200 bg-[#0b0f17] hover:bg-[#1f2937] border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Export CSV
            </button>

            <button
              onClick={onOpenQuickExpense}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Expense (Ctrl+N)
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search item, category, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b0f17] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#0b0f17] border border-white/10 rounded-lg">
            <button
              onClick={() => setClassFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                classFilter === 'ALL'
                  ? 'bg-[#1f2937] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Classes
            </button>
            <button
              onClick={() => setClassFilter('FIXED')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                classFilter === 'FIXED'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Fixed
            </button>
            <button
              onClick={() => setClassFilter('VARIABLE')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                classFilter === 'VARIABLE'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Variable
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#0b0f17] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0b0f17] border border-white/10 rounded-lg px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(
                  e.target.value as
                    | 'DATE_DESC'
                    | 'DATE_ASC'
                    | 'AMOUNT_DESC'
                    | 'AMOUNT_ASC'
                )
              }
              className="bg-transparent text-xs text-gray-200 focus:outline-none"
            >
              <option value="DATE_DESC" className="bg-[#0b0f17]">
                Date: Newest First
              </option>
              <option value="DATE_ASC" className="bg-[#0b0f17]">
                Date: Oldest First
              </option>
              <option value="AMOUNT_DESC" className="bg-[#0b0f17]">
                Amount: High to Low
              </option>
              <option value="AMOUNT_ASC" className="bg-[#0b0f17]">
                Amount: Low to High
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0b0f17]/70 border-b border-white/10 text-[11px] font-medium text-gray-400">
              <th className="py-3 px-4 w-32">Date</th>
              <th className="py-3 px-4">Item / Activity</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Velocity Class</th>
              <th className="py-3 px-4">Notes</th>
              <th className="py-3 px-4 text-right">Cost</th>
              <th className="py-3 px-4 text-right w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-xs">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  No transactions match your current filters.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const cat = categoryMap.get(tx.categoryId);
                const isEditing = editingTxId === tx.id;

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-[#1f2937]/60 transition-colors"
                  >
                    {/* Date */}
                    <td className="py-3 px-4 font-mono tabular-nums text-gray-300">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="bg-[#0b0f17] border border-white/20 rounded px-2 py-1 text-xs font-mono text-white"
                        />
                      ) : (
                        tx.date
                      )}
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 font-medium text-white">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-[#0b0f17] border border-white/20 rounded px-2 py-1 text-xs text-white"
                        />
                      ) : (
                        tx.title
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-gray-200">
                      {isEditing ? (
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="bg-[#0b0f17] border border-white/20 rounded px-2 py-1 text-xs text-white"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        cat?.name || 'Uncategorized'
                      )}
                    </td>

                    {/* Class */}
                    <td className="py-3 px-4 font-mono text-[11px] font-semibold">
                      <span
                        className={
                          cat?.type === 'FIXED'
                            ? 'text-blue-400'
                            : 'text-cyan-400'
                        }
                      >
                        {cat?.type || 'VARIABLE'}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-gray-400">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Optional note"
                          className="w-full bg-[#0b0f17] border border-white/20 rounded px-2 py-1 text-xs text-white"
                        />
                      ) : (
                        tx.notes || '—'
                      )}
                    </td>

                    {/* Cost */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-white">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-28 bg-[#0b0f17] border border-white/20 rounded px-2 py-1 text-xs font-mono tabular-nums text-white text-right"
                        />
                      ) : (
                        formatCurrency(tx.amount, currency)
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleSaveEdit(tx.id)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingTxId(null)}
                            className="p-1.5 text-gray-400 hover:bg-white/10 rounded"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(tx)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Edit entry"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete entry"
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
        </table>
      </div>
    </div>
  );
}

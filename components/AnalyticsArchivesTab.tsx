'use client';

import React, { useState, useMemo } from 'react';
import {
  CurrencyCode,
  DerivedMetrics,
  MonthlyArchiveSnapshot,
} from '@/lib/wealth-types';
import { formatCurrency } from '@/lib/wealth-engine';
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Archive,
  TrendingUp,
  CheckCircle2,
  Eye,
  Trash2,
  Calendar,
} from 'lucide-react';

interface AnalyticsArchivesTabProps {
  currency: CurrencyCode;
  activeMonthKey: string;
  activeMonthLabel: string;
  metrics: DerivedMetrics;
  archives: MonthlyArchiveSnapshot[];
  onDeleteArchive: (archiveId: string) => void;
  onOpenNewMonthModal: () => void;
}

export default function AnalyticsArchivesTab({
  currency,
  activeMonthKey,
  activeMonthLabel,
  metrics,
  archives,
  onDeleteArchive,
  onOpenNewMonthModal,
}: AnalyticsArchivesTabProps) {
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(
    archives.length > 0 ? archives[archives.length - 1].id : null
  );

  // Build multi-month trajectory dataset (Archived Months + Active Month)
  const trajectoryData = useMemo(() => {
    const historicalRows = archives.map((arch) => ({
      name: arch.monthLabel.replace(' 2026', " '26"),
      fullLabel: arch.monthLabel,
      totalBudget: arch.masterBudget,
      actualSpend: arch.totalSpent,
      fixedSpend: arch.fixedSpent,
      variableSpend: arch.variableSpent,
      monthlySavings: arch.finalSavingsAdded,
      cumulativeSavings: arch.cumulativeSavingsAfterClose,
      healthScore: arch.healthScore,
      isCurrent: false,
    }));

    const projectedCurrentCumulative =
      metrics.cumulativeSavingsReserve + metrics.savingsAllocated;

    const currentRow = {
      name: `${activeMonthLabel.replace(' 2026', " '26")} (Active)`,
      fullLabel: `${activeMonthLabel} (Active)`,
      totalBudget: metrics.masterBudget,
      actualSpend: metrics.totalSpent,
      fixedSpend: metrics.fixedSpentTotal,
      variableSpend: metrics.variableSpentTotal,
      monthlySavings: metrics.savingsAllocated,
      cumulativeSavings: projectedCurrentCumulative,
      healthScore: metrics.financialHealthScore,
      isCurrent: true,
    };

    return [...historicalRows, currentRow];
  }, [archives, activeMonthLabel, metrics]);

  const selectedArchive = useMemo(() => {
    if (!selectedArchiveId) return archives[archives.length - 1] || null;
    return (
      archives.find((a) => a.id === selectedArchiveId) ||
      archives[archives.length - 1] ||
      null
    );
  }, [archives, selectedArchiveId]);

  const avgHealthScore = useMemo(() => {
    if (trajectoryData.length === 0) return 0;
    const sum = trajectoryData.reduce((acc, r) => acc + r.healthScore, 0);
    return Math.round(sum / trajectoryData.length);
  }, [trajectoryData]);

  const totalHistoricalSaved = useMemo(() => {
    return (
      metrics.cumulativeSavingsReserve + metrics.savingsAllocated
    );
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Top Multi-Month Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-gray-400">Archived Closed Months</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-white">
            {archives.length} Months
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Plus active {activeMonthKey} cycle
          </div>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-gray-400">
            Cumulative Reserve Balance
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-400">
            {formatCurrency(metrics.cumulativeSavingsReserve, currency)}
          </div>
          <div className="mt-1 text-xs text-gray-400 font-mono tabular-nums">
            Proj. EOM: {formatCurrency(totalHistoricalSaved, currency)}
          </div>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-gray-400">
            Multi-Month Avg Health Score
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-cyan-400">
            {avgHealthScore}/100
          </div>
          <div className="mt-1 text-xs text-gray-400 font-mono tabular-nums">
            Current Month: {metrics.financialHealthScore}/100
          </div>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-gray-400">Month-End Rollover Engine</div>
          <p className="text-xs text-gray-300 my-1">
            Close {activeMonthLabel} &amp; sweep surplus into reserve
          </p>
          <button
            onClick={onOpenNewMonthModal}
            className="w-full py-1.5 px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Start New Month Snapshot
          </button>
        </div>
      </div>

      {/* Charts Row: Inter-Month Trajectory + Fixed vs Variable Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Inter-Month Trajectory Chart */}
        <div className="lg:col-span-7 bg-[#111827] border border-white/10 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-semibold text-white">
                Inter-Month Capital Trajectory
              </h2>
              <p className="text-xs text-gray-400">
                Comparing Total Master Budget, Actual Spend, and Cumulative
                Savings Reserve
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                Total Budget
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" />
                Actual Spend
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
                Cumulative Savings
              </span>
            </div>
          </div>

          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trajectoryData}
                margin={{ top: 10, right: 16, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="cumSavingsGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) =>
                    `${currency === 'BDT' ? '৳' : '$'}${
                      val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                    }`
                  }
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="bg-[#0b0f17] border border-white/15 rounded-lg p-3.5 shadow-xl text-xs space-y-1.5">
                        <div className="font-semibold text-white border-b border-white/10 pb-1">
                          {row.fullLabel}
                        </div>
                        <div className="flex justify-between gap-6 font-mono tabular-nums text-blue-400">
                          <span>Total Budget:</span>
                          <span>
                            {formatCurrency(row.totalBudget, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-6 font-mono tabular-nums text-cyan-300">
                          <span>Actual Spend:</span>
                          <span>
                            {formatCurrency(row.actualSpend, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-6 font-mono tabular-nums text-emerald-400">
                          <span>Cumulative Savings:</span>
                          <span>
                            {formatCurrency(row.cumulativeSavings, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-6 font-mono tabular-nums text-gray-400 pt-1 border-t border-white/10">
                          <span>Health Score:</span>
                          <span className="text-white">
                            {row.healthScore}/100
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeSavings"
                  name="Cumulative Savings"
                  fill="url(#cumSavingsGrad)"
                  stroke="#10b981"
                  strokeWidth={2}
                />
                <Bar
                  dataKey="actualSpend"
                  name="Actual Spend"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="totalBudget"
                  name="Total Budget"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3b82f6' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 5 Cols: Fixed vs Variable vs Monthly Savings Composition */}
        <div className="lg:col-span-5 bg-[#111827] border border-white/10 rounded-xl p-5">
          <div className="pb-4 border-b border-white/10">
            <h2 className="text-base font-semibold text-white">
              Monthly Fixed vs. Variable vs. Savings Split
            </h2>
            <p className="text-xs text-gray-400">
              Structural capital deployment across historical &amp; active
              periods
            </p>
          </div>

          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trajectoryData}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) =>
                    `${currency === 'BDT' ? '৳' : '$'}${
                      val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                    }`
                  }
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="bg-[#0b0f17] border border-white/15 rounded-lg p-3 shadow-xl text-xs space-y-1">
                        <div className="font-semibold text-white mb-1">
                          {row.fullLabel}
                        </div>
                        <div className="font-mono tabular-nums text-blue-400">
                          Fixed Outflow:{' '}
                          {formatCurrency(row.fixedSpend, currency)}
                        </div>
                        <div className="font-mono tabular-nums text-cyan-400">
                          Variable Outflow:{' '}
                          {formatCurrency(row.variableSpend, currency)}
                        </div>
                        <div className="font-mono tabular-nums text-emerald-400">
                          Net Saved + Rollover:{' '}
                          {formatCurrency(row.monthlySavings, currency)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="fixedSpend"
                  stackId="a"
                  fill="#3b82f6"
                  name="Fixed Spend"
                />
                <Bar
                  dataKey="variableSpend"
                  stackId="a"
                  fill="#06b6d4"
                  name="Variable Spend"
                />
                <Bar
                  dataKey="monthlySavings"
                  stackId="a"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  name="Savings Added"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Historical Archives Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Archive List Cards (5 Cols) */}
        <div className="lg:col-span-5 bg-[#111827] border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">
                Historical Month Snapshots
              </h3>
            </div>
            <span className="text-xs font-mono tabular-nums text-gray-400">
              {archives.length} stored
            </span>
          </div>

          {archives.length === 0 ? (
            <div className="p-6 text-center bg-[#0b0f17] border border-white/10 rounded-lg">
              <p className="text-xs text-gray-400">
                No archived months yet. Click &ldquo;Start New Month&rdquo; to
                snapshot the current month into the archives.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...archives].reverse().map((arch) => {
                const isSelected = selectedArchive?.id === arch.id;
                return (
                  <div
                    key={arch.id}
                    onClick={() => setSelectedArchiveId(arch.id)}
                    className={`cursor-pointer rounded-xl p-4 border transition-all ${
                      isSelected
                        ? 'bg-[#1f2937] border-cyan-500/60'
                        : 'bg-[#0b0f17] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-sm font-semibold text-white">
                          {arch.monthLabel}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold ${
                          arch.healthScore >= 80
                            ? 'text-emerald-400'
                            : arch.healthScore >= 65
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        Score: {arch.healthScore}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-mono tabular-nums">
                      <div>
                        <div className="text-[10px] text-gray-400 font-sans">
                          Budget
                        </div>
                        <div className="text-gray-200">
                          {formatCurrency(arch.masterBudget, currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-sans">
                          Total Spent
                        </div>
                        <div className="text-white font-medium">
                          {formatCurrency(arch.totalSpent, currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-sans">
                          Net Saved
                        </div>
                        <div className="text-emerald-400 font-medium">
                          +{formatCurrency(arch.finalSavingsAdded, currency)} (
                          {arch.finalSavingsRatePercent.toFixed(1)}%)
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                      <span>
                        {arch.surplusRolledOver &&
                        arch.unspentVariableSurplus > 0 ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Rolled over{' '}
                            {formatCurrency(
                              arch.unspentVariableSurplus,
                              currency
                            )}{' '}
                            var surplus
                          </span>
                        ) : (
                          <span>Standard monthly close</span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1 text-cyan-300">
                        <Eye className="w-3 h-3" /> Inspect
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Archive Snapshot Deep-Dive (7 Cols) */}
        <div className="lg:col-span-7 bg-[#111827] border border-white/10 rounded-xl p-5">
          {selectedArchive ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Archive Snapshot: {selectedArchive.monthLabel}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono tabular-nums">
                    Closed {selectedArchive.closedAt.slice(0, 10)} · Savings
                    Rate {selectedArchive.finalSavingsRatePercent.toFixed(1)}% ·
                    Health Score {selectedArchive.healthScore}/100
                  </p>
                </div>

                <button
                  onClick={() => onDeleteArchive(selectedArchive.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 bg-[#0b0f17] hover:bg-red-500/10 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Snapshot
                </button>
              </div>

              {/* Snapshot KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-3">
                  <div className="text-gray-400">Master Budget</div>
                  <div className="mt-1 text-base font-bold font-mono tabular-nums text-white">
                    {formatCurrency(selectedArchive.masterBudget, currency)}
                  </div>
                </div>
                <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-3">
                  <div className="text-gray-400">Actual Spend</div>
                  <div className="mt-1 text-base font-bold font-mono tabular-nums text-cyan-300">
                    {formatCurrency(selectedArchive.totalSpent, currency)}
                  </div>
                </div>
                <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-3">
                  <div className="text-gray-400">Surplus Rolled Over</div>
                  <div className="mt-1 text-base font-bold font-mono tabular-nums text-emerald-400">
                    {selectedArchive.surplusRolledOver
                      ? formatCurrency(
                          selectedArchive.unspentVariableSurplus,
                          currency
                        )
                      : formatCurrency(0, currency)}
                  </div>
                </div>
                <div className="bg-[#0b0f17] border border-white/10 rounded-lg p-3">
                  <div className="text-gray-400">Reserve After Close</div>
                  <div className="mt-1 text-base font-bold font-mono tabular-nums text-emerald-300">
                    {formatCurrency(
                      selectedArchive.cumulativeSavingsAfterClose,
                      currency
                    )}
                  </div>
                </div>
              </div>

              {/* Category Breakdown Table for Selected Archive */}
              <div>
                <h4 className="text-xs font-semibold text-gray-300 mb-2">
                  Archived Category Allocation vs. Spend
                </h4>
                <div className="overflow-x-auto border border-white/10 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#0b0f17] border-b border-white/10 text-[11px] text-gray-400">
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Class</th>
                        <th className="py-2.5 px-3 text-right">Allocated</th>
                        <th className="py-2.5 px-3 text-right">Actual Spend</th>
                        <th className="py-2.5 px-3 text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {selectedArchive.categories.map((cat) => {
                        const variance = cat.allocated - cat.spent;
                        return (
                          <tr key={cat.id} className="bg-[#0b0f17]/40">
                            <td className="py-2 px-3 font-medium text-white">
                              {cat.name}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px]">
                              <span
                                className={
                                  cat.type === 'FIXED'
                                    ? 'text-blue-400'
                                    : 'text-cyan-400'
                                }
                              >
                                {cat.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-gray-300">
                              {formatCurrency(cat.allocated, currency)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-white">
                              {formatCurrency(cat.spent, currency)}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono tabular-nums font-medium ${
                                variance < 0
                                  ? 'text-red-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {formatCurrency(variance, currency, {
                                showSign: true,
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Archived Ledger Entries */}
              <div>
                <h4 className="text-xs font-semibold text-gray-300 mb-2">
                  Archived Ledger Entries ({selectedArchive.transactions.length})
                </h4>
                <div className="max-h-48 overflow-y-auto border border-white/10 rounded-lg divide-y divide-white/10 bg-[#0b0f17]/50">
                  {selectedArchive.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="py-2 px-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="text-white font-medium">
                          {tx.title}
                        </span>
                        <span className="text-gray-500 font-mono tabular-nums ml-2">
                          · {tx.date}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-gray-200 font-semibold">
                        {formatCurrency(tx.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-500">
              Select an archived month on the left to inspect its snapshot.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

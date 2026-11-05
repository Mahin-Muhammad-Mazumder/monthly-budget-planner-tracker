'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CurrencyCode,
  DerivedMetrics,
  WarrenMessage,
  WealthState,
} from '@/lib/wealth-types';
import {
  buildWarrenPayload,
  generateDeterministicWarrenResponse,
} from '@/lib/wealth-engine';
import {
  Terminal,
  X,
  Send,
  ShieldAlert,
  Code2,
  Sparkles,
  Loader2,
  ChevronUp,
} from 'lucide-react';

interface WarrenDrawerProps {
  state: WealthState;
  metrics: DerivedMetrics;
}

export default function WarrenDrawer({ state, metrics }: WarrenDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPayloadInspector, setShowPayloadInspector] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<WarrenMessage[]>([
    {
      id: 'warren-init',
      role: 'warren',
      content: `**WARREN // QUANTITATIVE CAPITAL ALLOCATOR READY**\n\nMonitoring active ledger for **${state.user}** (${state.activeMonthLabel}).\nCurrent Composite Financial Health Score: \`${metrics.financialHealthScore}/100\` (\`Variable Pace: ${metrics.variablePaceScore}/40\` · \`Savings Efficiency: ${metrics.savingsEfficiencyScore}/30\` · \`Fixed Adherence: ${metrics.fixedAdherenceScore}/30\`).\n\nClick **Execute Portfolio Audit** below for an immediate month-to-date diagnostic, or submit a direct capital allocation query.`,
      timestamp: 'LIVE',
      source: 'deterministic',
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const livePayload = buildWarrenPayload(
    state,
    metrics,
    inputPrompt.trim() || 'EXECUTE_FULL_PORTFOLIO_AUDIT'
  );

  const dispatchToWarren = async (
    userDirective: string,
    isAuditAction: boolean
  ) => {
    if (isLoading) return;
    setIsLoading(true);

    const payload = buildWarrenPayload(state, metrics, userDirective);

    const userMsg: WarrenMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: isAuditAction
        ? 'Execute 1-Click Portfolio Audit on current month allocations and burn velocity.'
        : userDirective,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isAudit: isAuditAction,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!isAuditAction) {
      setInputPrompt('');
    }

    try {
      const res = await fetch('/api/warren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload,
          currency: state.currency,
        }),
      });

      if (!res.ok) {
        throw new Error('Server endpoint returned non-200');
      }

      const data = await res.json();
      const replyContent =
        data.text ||
        generateDeterministicWarrenResponse(payload, state.currency);

      setMessages((prev) => [
        ...prev,
        {
          id: `warren-${Date.now()}`,
          role: 'warren',
          content: replyContent,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isAudit: isAuditAction,
          source: data.source || 'gemini',
        },
      ]);
    } catch {
      const fallback = generateDeterministicWarrenResponse(
        payload,
        state.currency
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `warren-${Date.now()}`,
          role: 'warren',
          content: fallback,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isAudit: isAuditAction,
          source: 'deterministic',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;
    dispatchToWarren(inputPrompt.trim(), false);
  };

  const scoreColor =
    metrics.financialHealthScore >= 80
      ? 'text-emerald-400 border-emerald-500/40'
      : metrics.financialHealthScore >= 60
      ? 'text-amber-400 border-amber-500/40'
      : 'text-red-400 border-red-500/50';

  return (
    <>
      {/* Floating Bottom-Right Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-5 right-5 z-40 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#111827]/95 backdrop-blur-md border shadow-2xl hover:bg-[#1f2937] transition-all ${scoreColor}`}
        >
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-mono tabular-nums text-xs font-bold tracking-tight text-white">
            Warren // Score: {metrics.financialHealthScore}
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
        </button>
      )}

      {/* Expanded Terminal Drawer */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[480px] h-[620px] max-h-[85vh] bg-[#0b0f17] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Terminal Top Bar */}
          <div className="px-4 py-3 bg-[#111827] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs font-bold font-mono tabular-nums text-white">
                  WARREN // SCORE: {metrics.financialHealthScore}/100
                </div>
                <div className="text-[11px] text-gray-400">
                  Quantitative Capital Allocator · Zero-Fluff Diagnostics
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPayloadInspector((p) => !p)}
                className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                  showPayloadInspector
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-[#0b0f17] border-white/10 text-gray-400 hover:text-white'
                }`}
                title="Inspect live JSON context payload injected into Warren"
              >
                <Code2 className="w-3.5 h-3.5 inline mr-1" />
                JSON Context
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Deterministic Health Index Sub-Bar */}
          <div className="px-4 py-2 bg-[#111827]/60 border-b border-white/10 grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
            <div>
              <span className="text-gray-400">Pace: </span>
              <span className="text-cyan-300 font-semibold">
                {metrics.variablePaceScore}/40
              </span>
            </div>
            <div>
              <span className="text-gray-400">Savings: </span>
              <span className="text-emerald-400 font-semibold">
                {metrics.savingsEfficiencyScore}/30
              </span>
            </div>
            <div>
              <span className="text-gray-400">Fixed: </span>
              <span className="text-blue-400 font-semibold">
                {metrics.fixedAdherenceScore}/30
              </span>
            </div>
          </div>

          {/* Collapsible Live System Context Payload Viewer */}
          {showPayloadInspector && (
            <div className="p-3 bg-[#070a0f] border-b border-white/10 max-h-44 overflow-y-auto">
              <div className="text-[10px] font-mono text-cyan-400 mb-1">
                LIVE INJECTED SYSTEM CONTEXT PAYLOAD:
              </div>
              <pre className="text-[10px] font-mono text-gray-300 leading-relaxed overflow-x-auto">
                {JSON.stringify(livePayload, null, 2)}
              </pre>
            </div>
          )}

          {/* 1-Click Execute Portfolio Audit Action Bar */}
          <div className="p-3 bg-[#111827]/40 border-b border-white/10 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() =>
                dispatchToWarren(
                  'Execute a comprehensive quantitative portfolio audit of my current month budget, variable burn velocity, fixed adherence, and 10-year compounding opportunity cost.',
                  true
                )
              }
              className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5" />
              )}
              Execute Portfolio Audit (1-Click Diagnostic)
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl p-3.5 border ${
                  msg.role === 'user'
                    ? 'bg-[#1f2937] border-white/15 text-gray-100 ml-8'
                    : 'bg-[#111827] border-white/10 text-gray-200 mr-2'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-1.5">
                  <span className="font-semibold text-cyan-400">
                    {msg.role === 'user'
                      ? `${state.user.toUpperCase()} // QUERY`
                      : 'WARREN // ALLOCATOR'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs space-y-1">
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="bg-[#111827] border border-white/10 rounded-xl p-3.5 text-xs text-gray-400 flex items-center gap-2 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                Computing velocity ratios &amp; opportunity cost...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Quantitative Prompts */}
          <div className="px-3 py-2 bg-[#111827]/50 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto">
            {[
              'How do I raise my Health Score to 90+?',
              'Calculate 10-yr cost of variable overruns',
              'Where should I cut 15% variable spend?',
            ].map((q) => (
              <button
                key={q}
                type="button"
                disabled={isLoading}
                onClick={() => dispatchToWarren(q, false)}
                className="px-2.5 py-1 text-[11px] bg-[#0b0f17] hover:bg-[#1f2937] border border-white/10 text-gray-300 rounded-md whitespace-nowrap shrink-0 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Direct Chat Input */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 bg-[#111827] border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask Warren about burn pace, category cuts, or reserve targets..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              className="flex-1 bg-[#0b0f17] border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg transition-colors shrink-0"
              title="Send query to Warren"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

# Apex Wealth Manager by M. Mahin

A high-density, local-first personal finance command center engineered for precision zero-based budgeting, daily variable burn-rate velocity tracking, multi-month trajectory archiving, and quantitative capital allocation analysis powered by the "Warren" AI advisor.

## User Review & Critical Decisions

> [!IMPORTANT]
> Because the initial clarification questions were skipped, the plan adopts the following recommended defaults while preserving 100% of your prompt specifications:

- **Default Currency & Pre-Seeded Dataset**: Defaults to Bangladeshi Taka (`৳` BDT) with a 1-click header toggle to US Dollar (`$` USD). First boot initializes `localStorage` (`apex_wealth_v1`) with 3 complete historical months of archived snapshots plus 14 realistic active-month transactions across Fixed (*Rent, Tuition, Mobile Recharge, Broadband Internet*) and Variable (*Bazar, Food & Nutrition, Transport, Personal Care*) categories.
- **Warren AI Architecture**: Uses a server-side Gemini endpoint backed by the `@google/genai` SDK (`gemini-3.8-flash`) with your environment's pre-configured `GEMINI_API_KEY`, paired with a deterministic quantitative fallback engine so the 1-Click Portfolio Audit and interactive Q&A work instantaneously at all times without requiring manual key entry.
- **Full-Featured Ledger & Category Engine**: Includes inline and modal category creation/editing, live "Safe-to-Spend Impact Preview" inside the `Ctrl+N` Quick Expense modal, search and category filtering in the Transaction Ledger, and full JSON export/import plus Blank Slate reset in Data Settings.

---

## 1. Overview & Core Concept

- **What It Does**: Combines zero-based master budget allocation with a dual-speed expenditure engine that separates lump-sum **Fixed Obligations** from pace-sensitive **Variable Categories**. Users monitor their exact daily safe-to-spend allowance, inspect daily spending intensity on an interactive calendar heatmap, execute month-end surplus rollovers into a cumulative savings reserve, and audit their capital efficiency with "Warren," an unsentimental AI financial advisor.
- **Target Audience / Persona**: Disciplined personal finance operators and quantitative budgeters (inspired by Copilot Money, Monarch Money, and YNAB) who want institutional-grade clarity over cash flow and burn velocity.
- **Key Value**: Eliminates end-of-month budget surprises by translating remaining variable allocations into a live daily allowance and a deterministic 0–100 Financial Health Index.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **First-Boot Command Center**: Loads immediately with populated macro summary cards, the Fixed vs. Variable Daily Burn Meter, the Category Breakdown Donut Chart, and the Interactive Category Management Table.
  2. **Quick Expense Logging (`Ctrl+N`)**: Pressing `Ctrl+N` or clicking **Log Expense** opens the transaction modal. Typing a cost while a Variable category is selected calculates and displays the exact reduction in Daily Safe-to-Spend (`-৳X.XX/day`) in real time before submission.
  3. **Calendar Heatmap & Daily Drill-Down**: Switching to the Calendar Heatmap tab renders a monthly grid where each date cell is color-coded against the Daily Safe-to-Spend threshold. Selecting any date opens a slide-over side panel listing that day's transactions with inline edit and delete actions.
  4. **Month-End Rollover (`Start New Month`)**: Opens a closing summary modal highlighting unspent variable surplus, lets the user toggle rolling that surplus into the Cumulative Savings Reserve, snapshots the full month (budget, allocations, ledger, savings rate, health score) into Historical Archives, and resets the active transaction ledger for the new month.
  5. **Warren Terminal Drawer**: Clicking the floating bottom-right badge (`Warren // Score: XX`) expands the institutional advisor terminal with a 1-click **Execute Portfolio Audit** action and freeform Q&A grounded in the live financial state payload.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Institutional dark-mode financial workstation meeting modern consumer fintech—high-density data grids, crisp `1px` structural borders (`border-white/10`), subtle glassmorphic overlays (`bg-gray-900/80 backdrop-blur-md`), and zero decorative clutter.
  - *Color Palette & Mood*:
    - Dominant Canvas (60%): Deep Obsidian (`#0b0f17`)
    - Structural Cards & Surfaces (30%): Midnight Slate (`#111827`) with Elevated Hover (`#1f2937`)
    - Semantic & Accent Tokens (10%):
      - Emerald (`#10b981`): Savings Reserve & Under-Pace Surplus
      - Cyan (`#06b6d4`): Variable Categories & Velocity Indicators
      - Electric Blue (`#3b82f6`): Fixed Categories & Primary Actions
      - Amber (`#f59e0b`): Near Limit Warning (`>85%` utilization)
      - Crimson (`#ef4444`): Over-Budget / Over-Pace Alert
  - *Typography & Hierarchy*:
    - Display & Navigation: `Plus Jakarta Sans` (SemiBold/Bold, tight tracking for structural headers)
    - UI & Body Copy: `DM Sans` (crisp legibility at 12px–14px table density)
    - Numerals & Financial Telemetry: `JetBrains Mono` with strict `font-mono tabular-nums` on every currency figure, percentage, ratio, and date cell so decimal points align vertically.
  - *Component Styling & Layout*:
    - Full-viewport desktop workspace (`1440px` baseline) with a structured Top Command Bar, 4-tab workspace switcher (`Command Center`, `Calendar Heatmap`, `Multi-Month Analytics & Archives`, `Transaction Ledger`), flat single-elevation cards separated by hairline borders, and compact `40px` table row heights.

- **Interactive Feedback & Motion**:
  - Fast `150ms` compositor transitions (`transform`, `opacity`) on modal reveals, tab switches, and the Warren drawer; immediate real-time recalculation of all macro metrics, progress bars, and health scores on every state mutation.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Local-First Versioned Persistence with Rich Demo Seeding**
  - *Chosen Approach*: Store the entire application state in `localStorage` under `apex_wealth_v1` with automatic first-load seeding (3 archived months + active month) and full JSON Export/Import + Blank Slate Reset in Data Settings.
  - *Why*: Guarantees zero-latency reactivity, complete privacy, and immediate visual richness across multi-month charts and heatmaps on first launch.
  - *Alternatives Considered*: Requiring manual setup on an empty dashboard was rejected because multi-month trajectory charts and burn meters would appear barren until weeks of data entry.

- **Decision 2: Hybrid Server-Side Gemini + Deterministic Fallback for "Warren"**
  - *Chosen Approach*: Route Warren's AI requests through a server-side endpoint using the `@google/genai` SDK and the environment's managed `GEMINI_API_KEY`, backed by a deterministic quantitative analysis engine if the network is unavailable.
  - *Why*: Adheres to security best practices by keeping API keys server-side while guaranteeing that 1-Click Portfolio Audits and ratio diagnostics always return cold, institutional-grade insights with zero configuration friction.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌────────────────────────────────────────────────────────────────────────────┐
│                   LocalStorage Persistence (apex_wealth_v1)                │
│     [Master Budget, Categories, Active Transactions, Archives, Settings]   │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               Core Financial & Deterministic Math Engine                   │
│  • Zero-Based Check: Unallocated = Master - Σ(Categories) - Savings        │
│  • Variable Velocity: Safe-to-Spend/Day, Expected Spend, Pace Delta %      │
│  • Health Index (0-100): Pace (40pt) + Savings (30pt) + Fixed (30pt)       │
└───────┬──────────────────┬──────────────────────┬──────────────────┬───────┘
        │                  │                      │                  │
        ▼                  ▼                      │                  ▼
┌──────────────┐  ┌─────────────────┐  ┌───────────────────┐  ┌──────────────┐
│ 1. Command   │  │ 2. Calendar     │  │ 3. Multi-Month    │  │ 4. Ledger &  │
│    Center    │  │    Heatmap      │  │    Analytics      │  │    Modals    │
│ • Macro KPIs │  │ • Monthly Grid  │  │ • Trajectory Line │  │ • Search/Sort│
│ • Burn Meter │  │ • Threshold Hue │  │   & Area Chart    │  │ • Ctrl+N Add │
│ • Donut Chart│  │ • Day Inspector │  │ • Archive Cards   │  │ • Rollover   │
│ • Cat. Table │  │   Side Panel    │  │   & Snapshot View │  │ • Data JSON  │
└──────────────┘  └─────────────────┘  └───────────────────┘  └──────┬───────┘
                                                                     │
                                                                     ▼
                                                      ┌──────────────────────┐
                                                      │  "Warren" AI Drawer  │
                                                      │ • Live JSON Context  │
                                                      │ • 1-Click Audit      │
                                                      │ • Server Gemini API  │
                                                      └──────────────────────┘
```

- **Data Model & State**:
  - `WealthState`:
    - `currency`: `'BDT' | 'USD'` (displays `৳` or `$`)
    - `activeMonth`: `YYYY-MM` identifier, `masterBudget`, `savingsAllocated`, `cumulativeSavingsReserve`
    - `categories`: Array of `{ id, name, type: 'FIXED' | 'VARIABLE', allocated }`
    - `transactions`: Array of `{ id, title, amount, categoryId, date, notes? }`
    - `archives`: Array of `MonthlyArchiveSnapshot` containing `{ id, monthLabel, masterBudget, totalSpent, savingsDeposited, unspentVariableSurplusRolledOver, healthScore, categoryBreakdown, transactions }`
  - `DerivedMetrics` (computed synchronously on every render):
    - `totalSpent`, `remainingBalance`, `unallocatedCapital`
    - `totalVariableBudget`, `actualVariableSpend`, `remainingVariableAllocation`, `daysInMonth`, `currentDayOfMonth`, `daysLeftInMonth`
    - `dailySafeToSpend`, `expectedVariableSpendToDate`, `paceDeltaPercent`, `burnStatus`
    - `healthScore` (`variablePaceScore` [0–40] + `savingsEfficiencyScore` [0–30] + `fixedAdherenceScore` [0–30])

- **Interactive Component & State Mapping**:
  - **Top Command Bar**: Currency toggle (`৳` / `$`) updates `state.currency`; **Log Expense (`Ctrl+N`)** opens the Quick Transaction Modal; **Start New Month** opens the Month-End Rollover Modal; **Data Settings** opens the Backup/Reset Modal; Master Budget & Savings Deposit inline editors update top-level allocations immediately.
  - **Interactive Category Table**: Inline/modal "+ Add Category", Edit allocation/type, and Delete category (with safe transaction handling). Automatically computes per-category `Actual Spend`, `Remaining Balance`, and `Utilization %` bar colored by semantic thresholds (`<85%` Cyan/Blue, `85–100%` Amber, `>100%` Crimson).
  - **Quick Transaction Modal (`Ctrl+N`)**: Global keyboard listener binds `Ctrl+N` / `Cmd+N`. Selecting a Variable category and entering a cost dynamically renders: *"This expense will reduce your Daily Safe-to-Spend by ৳X.XX/day"*.
  - **Calendar Heatmap & Side Panel**: Computes daily spend totals for each day of the active month, coloring cells relative to `dailySafeToSpend`. Clicking a date opens the Day Inspector drawer where transactions for that date can be added, edited, or deleted.
  - **Warren Terminal Drawer**: Injects the exact live JSON payload (`user`, `total_budget`, `total_spent`, `remaining_balance`, `unallocated_capital`, `days_left_in_month`, `daily_safe_to_spend`, `variable_daily_burn_status`, `savings_allocated`, `financial_health_score`, `top_overspent_categories`, `user_message`) into the server-side Gemini route and streams or returns Warren's cold, metric-driven response.

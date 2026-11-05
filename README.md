# Apex Wealth Manager

**Institutional-Grade, Local-First Personal Finance & Capital Allocation Terminal**  
*Architected & Built by M. Mahin*

![Next.js](https://img.shields.io/badge/Next.js-App_Router-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Dark_Terminal-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Gemini AI](https://img.shields.io/badge/AI-Gemini_2.5_Flash-8E75B2?style=flat-square&logo=google-gemini&logoColor=white)

---

## Overview

**Apex Wealth Manager** is a high-density personal finance and zero-based capital allocation web application designed with the precision of an institutional financial terminal. Inspired by modern fintech platforms like Copilot Money, Monarch Money, and YNAB, it separates fixed obligations from variable burn velocity to compute real-time safe-to-spend allowances, deterministic financial health scores, and automated month-end reserve rollovers.

All financial state is stored locally in the browser (`localStorage` under `apex_wealth_v1`) for complete data privacy, paired with full JSON import/export portability and an AI portfolio advisor (**Warren**) powered by the Google Gemini API.

---

## Key Features

### 1. Command Center & Zero-Based Capital Check
* **Macro Capital Cards:** Real-time tracking for Total Master Budget, Spent to Date, Remaining Spendable Balance, Monthly Savings Deposit, Cumulative Savings Reserve, and Unallocated Capital.
* **Zero-Based Equilibrium:** Automatically calculates `Master Budget - Category Allocations - Savings Target` with a 1-click sweep of unallocated capital directly into your savings reserve.
* **Direct Reserve Controls:** Add to, cut from, or set your exact Cumulative Savings Reserve balance directly from the Command Center or Analytics view.
* **Interactive Category Matrix:** Manage Fixed and Variable categories with auto-summed ledger spend, remaining balance, utilization progress bars, and visual threshold alerts (**Nominal**, **Near Limit >85%**, and **Over Budget >100%**).

### 2. Fixed vs. Variable Velocity Engine
* **Structural Separation:** Fixed obligations (e.g., Rent, Utilities, Fixed Groceries) are tracked strictly as lump-sum allocations and excluded from daily burn distortion.
* **Daily Safe-to-Spend Rate:** Dynamically governed by remaining variable capital:
  $$\text{Daily Safe-to-Spend} = \frac{\max(0, \text{Remaining Variable Allocation})}{\max(1, \text{Days Left in Month})}$$
* **Time-Weighted Burn Meter:** Compares actual variable spend against expected linear pace to date, displaying exact percentage **Under Pace** (Emerald) or **Over Pace** (Crimson).

### 3. Quick Expense Modal (`Ctrl+N`) with Live Impact Preview
* **Keyboard-First Logging:** Press `Ctrl+N` (or `Cmd+N`) from anywhere in the workspace to log a transaction.
* **Real-Time Burn Impact:** As you enter the cost of a variable expense, the modal calculates and previews the exact reduction to your Daily Safe-to-Spend rate (`-৳X.XX/day` or `-$X.XX/day`) before committing.

### 4. Calendar Heatmap & Daily Inspector
* **Intensity Grid:** Monthly calendar heatmap color-coded by daily spending intensity relative to your Daily Safe-to-Spend threshold.
* **Slide-Over Day Inspector:** Click any calendar date to inspect, edit, delete, or log transactions targeted specifically to that day.

### 5. Multi-Month Analytics, Rollover Engine & Archives
* **Trajectory & Composition Charts:** Interactive Recharts visualizations (Composed Line/Bar charts and Capital Structure Donut charts) comparing Master Budget, Actual Spend, and Cumulative Savings across historical archives and the active month.
* **Start New Month Workflow:** Closes out the active month, calculates unspent variable surplus, optionally rolls the surplus into your Cumulative Savings Reserve, snapshots the full month (budget, ledger, savings rate, health score) into Historical Archives, and resets the active ledger while preserving category structures.

### 6. "Warren" — Cold Calculative AI Financial Advisor
* **Deterministic Financial Health Index (0–100):**
  * **Variable Pace Control (40 pts):** Rewards staying at or below linear expected variable burn.
  * **Savings Rate Efficiency (30 pts):** Scaled against a 20% Master Budget savings benchmark.
  * **Fixed Budget Adherence (30 pts):** Penalizes proportional overruns in fixed categories.
* **Live Portfolio Audit & Q&A:** Floating bottom-right terminal drawer that injects your live JSON financial state into `gemini-2.5-flash` for unsentimental, ratio-driven capital allocation audits. Includes a built-in deterministic offline fallback engine when no API key is configured.

---

## Tech Stack

* **Framework:** Next.js (App Router) & React
* **Language:** TypeScript
* **Styling:** Tailwind CSS (High-contrast institutional dark theme with `tabular-nums` typography)
* **Visualizations:** Recharts (`ComposedChart`, `BarChart`, `PieChart` / Donut)
* **Icons:** `lucide-react`
* **Persistence:** Local-first browser `localStorage` (`apex_wealth_v1`) with JSON Import/Export & pre-seeded demo history
* **AI Integration:** Google Gemini REST API (`gemini-2.5-flash`) + server-side route & deterministic local fallback

---

## Project Structure

```text
├── app/
│   ├── api/warren/route.ts         # Server-side Gemini AI advisor endpoint
│   ├── layout.tsx                  # Root layout, dark-mode canvas & fonts
│   └── page.tsx                    # Main application state & workspace shell
├── components/
│   ├── CommandCenterTab.tsx        # Macro cards, velocity engine, donut & category table
│   ├── CalendarHeatmapTab.tsx      # Monthly burn intensity calendar & day inspector
│   ├── AnalyticsArchivesTab.tsx    # Multi-month trajectory charts & historical snapshots
│   ├── TransactionLedgerTab.tsx    # Searchable, filterable full transaction ledger
│   ├── Modals.tsx                  # Quick Expense (Ctrl+N), Rollover & Settings modals
│   └── WarrenDrawer.tsx            # Floating Health Score badge & AI terminal drawer
└── lib/
    ├── wealth-types.ts             # Core TypeScript interfaces & data contracts
    └── wealth-engine.ts            # Deterministic math, health index & seed data
```

---

## Getting Started

### Prerequisites
* **Node.js** `18.17+` or `20+`
* **npm**, **pnpm**, or **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/apex-wealth-manager.git](https://github.com/your-username/apex-wealth-manager.git)
   cd apex-wealth-manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables (Optional for Warren AI):**
   Create a `.env.local` file in the root directory if you want a default server-side Gemini API key (users can also enter their own key directly in the in-app **Data Settings** modal):
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the terminal:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage & Shortcuts

* **`Ctrl + N` / `Cmd + N`:** Open the Quick Expense modal from any tab with live Safe-to-Spend impact preview.
* **`৳ BDT` / `$ USD` Switcher:** Toggle currency formatting instantaneously in the top command bar.
* **Data Settings:** Export your entire financial state (active ledger, categories, reserve, and multi-month archives) to a portable `.json` backup file, restore from a backup, or reset to either the pre-seeded demo state or a blank slate.

---

## 👤 Author

**Mahin Muhammad Mazumder (M. Mahin)**  
B.Sc. in Electrical and Electronic Engineering (EEE)  
University of Chittagong

---

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

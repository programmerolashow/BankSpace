'use client'

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Zap,
  ShoppingBag,
  ZapIcon,
  Tv,
  Utensils,
  Car,
} from "lucide-react"

const timeframeOptions = ["7 Days", "1 Month", "3 Months", "1 Year"]

const monthlyData = [
  { month: "Jan", income: 850, expense: 420 },
  { month: "Feb", income: 920, expense: 510 },
  { month: "Mar", income: 880, expense: 390 },
  { month: "Apr", income: 1050, expense: 460 },
  { month: "May", income: 980, expense: 480 },
  { month: "Jun", income: 1200, expense: 520 },
  { month: "Jul", income: 1250, expense: 480 },
]

const categories = [
  { name: "Bills & Utilities", amount: "₦120,000.00", pct: 28, color: "bg-violet-600", icon: Zap },
  { name: "Shopping & Retail", amount: "₦86,000.00", pct: 20, color: "bg-sky-500", icon: ShoppingBag },
  { name: "Food & Dining", amount: "₦74,000.00", pct: 17, color: "bg-emerald-500", icon: Utensils },
  { name: "Subscriptions & Media", amount: "₦41,000.00", pct: 10, color: "bg-orange-400", icon: Tv },
  { name: "Travel & Transport", amount: "₦35,000.00", pct: 8, color: "bg-pink-500", icon: Car },
]

const topMerchants = [
  { name: "Shoprite Supermarket", category: "Groceries", spent: "₦48,500.00", txs: 6 },
  { name: "Ikeja Electric Utility", category: "Bills", spent: "₦32,000.00", txs: 2 },
  { name: "Uber Rides", category: "Transport", spent: "₦24,200.00", txs: 14 },
  { name: "Netflix Premium", category: "Subscriptions", spent: "₦11,000.00", txs: 1 },
]

export default function AnalyticsPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1 Month")

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eeeeff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#3f3cff]">
                Analytics & Reports
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#3f3cff] bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200">
                <Sparkles className="h-3.5 w-3.5" /> AI Spending Insights Active
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Deep dive into your financial habits
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Understand cash flow patterns, monitor spending benchmarks, and optimize your monthly budget.
            </p>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="flex items-center rounded-2xl bg-slate-100 p-1.5 border border-slate-200/70">
            {timeframeOptions.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  selectedTimeframe === tf
                    ? "bg-white text-[#3f3cff] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stat Widgets */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Income</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <ArrowDownLeft className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">₦1,250,000.00</p>
            <p className="mt-1 text-xs font-semibold text-emerald-600">+12.4% vs last period</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Expenses</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/10 text-violet-600">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">₦480,000.00</p>
            <p className="mt-1 text-xs font-semibold text-emerald-600">-4.2% lower expenses</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Net Savings Rate</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/10 text-sky-600">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">61.6%</p>
            <p className="mt-1 text-xs text-slate-400">Target: 50% min</p>
          </div>

          <div className="rounded-2xl bg-linear-to-br from-[#7257ff] to-[#4335eb] p-4.5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/80">Financial Health Score</span>
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
            <p className="mt-2 text-3xl font-black">88<span className="text-sm font-normal text-white/70">/100</span></p>
            <p className="mt-1 text-xs font-medium text-emerald-200">Excellent Financial Rating</p>
          </div>
        </div>
      </section>

      {/* Main Charts & Breakdown Section */}
      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Income vs Expenses Bar Chart */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Cash Flow Overview</h2>
              <p className="text-xs text-slate-500">Comparing monthly income vs expenses</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-linear-to-t from-[#4938f2] to-[#5fd1ff]" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-300" />
                Expenses
              </span>
            </div>
          </div>

          {/* Bar Chart Graphics */}
          <div className="mt-8 h-64 rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100 flex items-end justify-between gap-3 sm:gap-6">
            {monthlyData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1 h-44">
                  {/* Income Bar */}
                  <div
                    className="w-full max-w-[20px] rounded-t-lg bg-linear-to-t from-[#4938f2] to-[#5fd1ff] transition-all group-hover:brightness-110"
                    style={{ height: `${(d.income / 1300) * 100}%` }}
                    title={`Income: ₦${d.income}k`}
                  />
                  {/* Expense Bar */}
                  <div
                    className="w-full max-w-[20px] rounded-t-lg bg-slate-300 transition-all group-hover:bg-slate-400"
                    style={{ height: `${(d.expense / 1300) * 100}%` }}
                    title={`Expense: ₦${d.expense}k`}
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">{d.month}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Category Breakdown */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg">Category Breakdown</h2>
            <span className="text-xs font-semibold text-[#3f3cff]">{selectedTimeframe}</span>
          </div>

          <div className="space-y-4">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2.5">
                      <span className={`grid h-7 w-7 place-items-center rounded-lg ${cat.color} text-white`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold text-slate-800">{cat.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{cat.amount}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Top Merchants & Smart AI Recommendations */}
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 text-lg mb-4">Top Spending Merchants</h2>
          <div className="divide-y divide-slate-100">
            {topMerchants.map((m) => (
              <div key={m.name} className="flex items-center justify-between py-3.5">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.category} • {m.txs} transactions</p>
                </div>
                <p className="font-bold text-slate-950 text-sm">{m.spent}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-linear-to-br from-[#efeaff] via-[#f3f0ff] to-[#e8edff] p-6 border border-violet-200/60">
          <div className="flex items-center gap-2 text-[#3f3cff] font-bold">
            <Sparkles className="h-5 w-5" />
            <h3>Smart Financial Tip</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            You spent <strong>14% less</strong> on Dining & Fast Food compared to last month. Redirecting this ₦12,000 saving into your <strong>High-Yield Vault</strong> will add ~₦1,440 annual compound interest!
          </p>
          <button className="mt-5 rounded-xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25">
            Auto-Transfer to Savings
          </button>
        </section>
      </div>
    </div>
  )
}

'use client'

import { useState } from "react"
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  ShoppingBag,
  Zap,
  Home,
  Tv,
  Car,
} from "lucide-react"

const budgetCategories = [
  {
    id: "b1",
    name: "Housing & Utilities",
    allocated: 150000,
    spent: 128000,
    icon: Home,
    color: "bg-violet-600",
    lightBg: "bg-violet-50",
  },
  {
    id: "b2",
    name: "Groceries & Supermarket",
    allocated: 100000,
    spent: 72000,
    icon: ShoppingBag,
    color: "bg-emerald-500",
    lightBg: "bg-emerald-50",
  },
  {
    id: "b3",
    name: "Transport & Fuel",
    allocated: 60000,
    spent: 54000,
    icon: Car,
    color: "bg-amber-500",
    lightBg: "bg-amber-50",
  },
  {
    id: "b4",
    name: "Entertainment & Dining",
    allocated: 50000,
    spent: 22500,
    icon: Tv,
    color: "bg-sky-500",
    lightBg: "bg-sky-50",
  },
]

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState(budgetCategories)

  const totalAllocated = budgets.reduce((a, b) => a + b.allocated, 0)
  const totalSpent = budgets.reduce((a, b) => a + b.spent, 0)
  const totalRemaining = totalAllocated - totalSpent
  const overallPct = Math.round((totalSpent / totalAllocated) * 100)

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eeeeff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#3f3cff]">
                Monthly Budgets
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#3f3cff] bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200">
                <Sparkles className="h-3.5 w-3.5" /> Auto-Track Activated
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Keep your spending on target
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Set custom spending caps per category, receive real-time alerts before overspending, and save more each month.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity">
            <Plus className="h-4 w-4" /> Create New Budget
          </button>
        </div>

        {/* Budget Overview Widgets */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Monthly Budget</p>
            <p className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">
              ₦{totalAllocated.toLocaleString()}.00
            </p>
            <p className="mt-1 text-xs text-slate-400">Allocated across {budgets.length} categories</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Spent So Far</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">₦{totalSpent.toLocaleString()}.00</p>
            <p className="mt-1 text-xs font-semibold text-amber-600">{overallPct}% of total budget used</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Remaining Allowance</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">₦{totalRemaining.toLocaleString()}.00</p>
            <p className="mt-1 text-xs text-emerald-600 font-medium">Safe spending cushion</p>
          </div>
        </div>
      </section>

      {/* Main Budget Grid */}
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Category Budget Items */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Category Budgets</h2>

          <div className="space-y-4">
            {budgets.map((b) => {
              const Icon = b.icon
              const pct = Math.round((b.spent / b.allocated) * 100)
              const remaining = b.allocated - b.spent
              const isWarning = pct >= 85

              return (
                <div key={b.id} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${b.color} text-white shadow-md`}>
                        <Icon className="h-5.5 w-5.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{b.name}</h3>
                        <p className="text-xs text-slate-400">
                          ₦{b.spent.toLocaleString()} of ₦{b.allocated.toLocaleString()} spent
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        isWarning ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      }`}
                    >
                      {pct}% Used
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isWarning ? "bg-amber-500" : "bg-[#3f3cff]"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>Spent: ₦{b.spent.toLocaleString()}</span>
                      <span className={remaining < 20000 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                        Remaining: ₦{remaining.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Budget Insights & Rules Sidebar */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
            <h2 className="font-bold text-slate-900 text-lg">Smart Budget Alerts</h2>

            <div className="rounded-2xl bg-amber-50 border border-amber-200/70 p-4.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                <AlertTriangle className="h-4.5 w-4.5" />
                <span>Housing & Utilities Alert</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-800">
                You have used 85% of your Housing & Utilities cap. ₦22,000 remaining for the next 14 days.
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-200/70 p-4.5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>Great Entertainment Savings</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-800">
                You’re under budget by ₦27,500 on Entertainment this month!
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

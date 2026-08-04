'use client'

import { useState } from "react"
import {
  PiggyBank,
  Plus,
  Lock,
  Sparkles,
  TrendingUp,
  Target,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
} from "lucide-react"

const initialGoals = [
  {
    id: "g1",
    title: "MacBook Pro M3 Max",
    saved: 650000,
    target: 1200000,
    deadline: "Dec 31, 2026",
    gradient: "from-[#080617] via-[#692fff] to-[#ff7ad9]",
    category: "Gadgets",
  },
  {
    id: "g2",
    title: "Emergency Safety Vault",
    saved: 400000,
    target: 500000,
    deadline: "Oct 15, 2026",
    gradient: "from-[#059669] via-[#10b981] to-[#047857]",
    category: "Security",
  },
  {
    id: "g3",
    title: "December Vacation in Dubai",
    saved: 150000,
    target: 300000,
    deadline: "Nov 30, 2026",
    gradient: "from-[#3b82f6] via-[#6366f1] to-[#8b5cf6]",
    category: "Travel",
  },
]

export default function SavingsPage() {
  const [goals, setGoals] = useState(initialGoals)
  const [selectedGoal, setSelectedGoal] = useState<typeof initialGoals[0] | null>(null)
  const [depositAmt, setDepositAmt] = useState("")

  const totalSaved = goals.reduce((a, b) => a + b.saved, 0)

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eeeeff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#3f3cff]">
                Savings & Vaults
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Sparkles className="h-3.5 w-3.5" /> 12.5% Annual Interest Rate
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Reach your financial milestones faster
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Lock funds in target vaults, automate round-up deposits, and earn compound interest paid daily.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity">
            <Plus className="h-4 w-4" /> Create Savings Vault
          </button>
        </div>

        {/* Savings Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Saved Across Vaults</p>
            <p className="mt-1 text-3xl font-black text-slate-900">₦{totalSaved.toLocaleString()}.00</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Interest Earned This Year</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">+₦48,200.00</p>
            <p className="mt-1 text-xs text-slate-400">Credited daily to checking</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Active Goals</p>
            <p className="mt-1 text-2xl font-bold text-[#3f3cff]">{goals.length} Vaults Active</p>
          </div>
        </div>
      </section>

      {/* Target Vaults Grid */}
      <section className="space-y-6">
        <h2 className="font-bold text-slate-900 text-lg">Active Savings Vaults</h2>

        <div className="grid gap-6 md:grid-cols-3">
          {goals.map((g) => {
            const pct = Math.round((g.saved / g.target) * 100)

            return (
              <div key={g.id} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className={`h-12 w-16 rounded-2xl bg-linear-to-br ${g.gradient} shadow-md`} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {g.category}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{g.title}</h3>
                  <p className="mt-1 text-xs text-[#3f3cff] font-bold">
                    ₦{g.saved.toLocaleString()} of ₦{g.target.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-linear-to-r from-[#403eff] to-[#6533ff]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>{pct}% Completed</span>
                    <span>Target: {g.deadline}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedGoal(g)}
                  className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  Quick Deposit
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Deposit Modal */}
      {selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <h3 className="font-bold text-slate-900 text-base">Deposit into {selectedGoal.title}</h3>
            <input
              type="number"
              placeholder="Enter deposit amount (₦)"
              value={depositAmt}
              onChange={(e) => setDepositAmt(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none"
            />
            <button
              onClick={() => {
                if (depositAmt) {
                  setGoals((prev) =>
                    prev.map((g) => (g.id === selectedGoal.id ? { ...g, saved: g.saved + Number(depositAmt) } : g))
                  )
                  setSelectedGoal(null)
                  setDepositAmt("")
                }
              }}
              className="w-full rounded-xl bg-[#3f3cff] py-3 text-xs font-bold text-white shadow-md"
            >
              Add Funds Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

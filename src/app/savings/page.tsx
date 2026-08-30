'use client'

import { useState, useEffect } from "react"
import {
  Plus,
  Sparkles,
  Loader2,
} from "lucide-react"

type GoalItem = {
  id: string
  title: string
  currentAmount: number
  targetAmount: number
  targetDate: string | null
  category: string
  gradient: string
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [totalSaved, setTotalSaved] = useState(0)
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null)
  const [depositAmt, setDepositAmt] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Create Goal Form State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newTarget, setNewTarget] = useState("")
  const [newCategory, setNewCategory] = useState("GENERAL")

  const fetchSavingsData = async () => {
    try {
      const res = await fetch("/api/savings")
      if (res.ok) {
        const data = await res.json()
        setGoals(data.goals || [])
        setTotalSaved(data.totalSaved || 0)
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSavingsData()
  }, [])

  const handleDeposit = async () => {
    if (!selectedGoal || !depositAmt || Number(depositAmt) <= 0) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/savings/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: selectedGoal.id, amount: Number(depositAmt) }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "Deposit failed")
      }

      setSelectedGoal(null)
      setDepositAmt("")
      fetchSavingsData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to deposit funds")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateVault = async () => {
    if (!newTitle || !newTarget || Number(newTarget) <= 0) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          targetAmount: Number(newTarget),
          category: newCategory,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to create vault")

      setShowCreateModal(false)
      setNewTitle("")
      setNewTarget("")
      fetchSavingsData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create savings vault")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
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

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Create Savings Vault
          </button>
        </div>

        {/* Savings Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Saved Across Vaults</p>
            <p className="mt-1 text-3xl font-black text-slate-900">
              {isLoading ? "..." : `₦${totalSaved.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            </p>
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

        {isLoading ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#3f3cff] mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading active savings goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No active savings goals found.</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {goals.map((g) => {
              const current = g.currentAmount || 0
              const target = g.targetAmount || 1
              const pct = Math.min(100, Math.round((current / target) * 100))

              return (
                <div key={g.id} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div className={`h-12 w-16 rounded-2xl bg-linear-to-br ${g.gradient || "from-[#080617] via-[#692fff] to-[#ff7ad9]"} shadow-md`} />
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {g.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{g.title}</h3>
                    <p className="mt-1 text-xs text-[#3f3cff] font-bold">
                      ₦{current.toLocaleString()} of ₦{target.toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-linear-to-r from-[#403eff] to-[#6533ff]" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span>{pct}% Completed</span>
                      <span>Target: {g.targetDate || "Dec 31, 2026"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedGoal(g)
                      setErrorMsg("")
                    }}
                    className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-colors"
                  >
                    Quick Deposit
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Quick Deposit Modal */}
      {selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Deposit into {selectedGoal.title}</h3>
              <button onClick={() => setSelectedGoal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-600">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-slate-500">Funds will be debited directly from your primary liquid checking account.</p>

            <input
              type="number"
              placeholder="Enter deposit amount (₦)"
              value={depositAmt}
              onChange={(e) => setDepositAmt(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none focus:border-[#3f3cff]"
            />
            <button
              onClick={handleDeposit}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#3f3cff] py-3.5 text-xs font-bold text-white shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isSubmitting ? "Processing Deposit..." : "Add Funds Now"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Vault Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Create New Savings Vault</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-600">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Goal Title</label>
              <input
                type="text"
                placeholder="e.g. New Laptop Fund"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold outline-none focus:border-[#3f3cff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Amount (₦)</label>
              <input
                type="number"
                placeholder="e.g. 500000"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold outline-none focus:border-[#3f3cff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold outline-none focus:border-[#3f3cff]"
              >
                <option value="GENERAL">General Savings</option>
                <option value="GADGETS">Gadgets & Tech</option>
                <option value="SECURITY">Emergency Fund</option>
                <option value="TRAVEL">Travel & Vacation</option>
              </select>
            </div>

            <button
              onClick={handleCreateVault}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#3f3cff] py-3.5 text-xs font-bold text-white shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isSubmitting ? "Creating Vault..." : "Create Target Vault"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from "react"
import {
  Plus,
  Sparkles,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Award,
} from "lucide-react"

type GoalItem = {
  id: string
  title: string
  currentAmount: number
  targetAmount: number
  targetDate: string | null
  category: string
  gradient: string
  status: string
  progressPercent: number
  remainingAmount: number
  isCompleted: boolean
}

type TxItem = {
  id: string
  reference: string
  recipientName: string
  amount: number
  fee: number
  type: string
  status: string
  createdAt: string
  description?: string
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [metrics, setMetrics] = useState({
    totalSaved: 0,
    totalTarget: 0,
    overallProgressPercent: 0,
    activeGoalsCount: 0,
    completedGoalsCount: 0,
  })
  const [transactions, setTransactions] = useState<TxItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Active Modals State
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null)
  const [modalType, setModalType] = useState<"DEPOSIT" | "WITHDRAW" | "SETTLE" | "CREATE" | null>(null)

  // Form Fields
  const [amountInput, setAmountInput] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newTarget, setNewTarget] = useState("")
  const [newCategory, setNewCategory] = useState("GENERAL")
  const [settleAction, setSettleAction] = useState<"WITHDRAW" | "ROLLOVER">("WITHDRAW")

  const fetchSavingsData = async () => {
    try {
      const [goalsRes, txRes] = await Promise.all([
        fetch("/api/savings/goals"),
        fetch("/api/transactions?category=Savings&limit=5"),
      ])

      if (goalsRes.ok) {
        const data = await goalsRes.json()
        setGoals(data.goals || [])
        if (data.metrics) setMetrics(data.metrics)
      }

      if (txRes.ok) {
        const txData = await txRes.json()
        setTransactions(txData.transactions || [])
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
    if (!selectedGoal || !amountInput || Number(amountInput) <= 0) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/savings/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: selectedGoal.id, amount: Number(amountInput) }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Deposit failed")

      closeModal()
      fetchSavingsData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to deposit funds")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWithdrawal = async () => {
    if (!selectedGoal || !amountInput || Number(amountInput) <= 0) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/savings/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: selectedGoal.id, amount: Number(amountInput) }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Withdrawal failed")

      closeModal()
      fetchSavingsData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to withdraw funds")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMaturitySettle = async () => {
    if (!selectedGoal) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/savings/maturity/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savingsAccountId: selectedGoal.id, action: settleAction }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Maturity settlement failed")

      closeModal()
      fetchSavingsData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to settle matured deposit")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateVault = async () => {
    if (!newTitle || !newTarget || Number(newTarget) <= 0) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/savings/goals", {
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

      closeModal()
      fetchSavingsData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create savings vault")
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeModal = () => {
    setSelectedGoal(null)
    setModalType(null)
    setAmountInput("")
    setNewTitle("")
    setNewTarget("")
    setErrorMsg("")
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
            onClick={() => {
              setModalType("CREATE")
              setErrorMsg("")
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Create Savings Vault
          </button>
        </div>

        {/* Savings Stats Widgets */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Saved Across Vaults</p>
            <p className="mt-1 text-3xl font-black text-slate-900">
              {isLoading ? "..." : `₦${metrics.totalSaved.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            </p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Overall Target Progress</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {isLoading ? "..." : `${metrics.overallProgressPercent}% Completed`}
            </p>
            <p className="mt-1 text-xs text-slate-400">Calculated across active goals</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Active Vaults</p>
            <p className="mt-1 text-2xl font-bold text-[#3f3cff]">
              {isLoading ? "..." : `${metrics.activeGoalsCount} Vaults Active`}
            </p>
          </div>
        </div>
      </section>

      {/* Target Vaults Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg">Active Savings Vaults & Goals</h2>
          <span className="text-xs font-semibold text-[#3f3cff]">{goals.length} Vaults Listed</span>
        </div>

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
              const pct = g.progressPercent !== undefined ? g.progressPercent : Math.min(100, Math.round((current / target) * 100))
              const isMatured = g.status === "MATURED"
              const isCompleted = g.isCompleted || g.status === "COMPLETED"

              return (
                <div key={g.id} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div className={`h-12 w-16 rounded-2xl bg-linear-to-br ${g.gradient || "from-[#080617] via-[#692fff] to-[#ff7ad9]"} shadow-md`} />
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      isMatured
                        ? "bg-amber-100 text-amber-700"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {isMatured ? "🏆 MATURED" : isCompleted ? "✅ COMPLETED" : g.category}
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
                      <div
                        className={`h-full rounded-full bg-linear-to-r ${isCompleted ? "from-emerald-500 to-teal-400" : "from-[#403eff] to-[#6533ff]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span>{pct}% Completed</span>
                      <span>Target: {g.targetDate || "Dec 31, 2026"}</span>
                    </div>
                  </div>

                  {isMatured ? (
                    <button
                      onClick={() => {
                        setSelectedGoal(g)
                        setModalType("SETTLE")
                        setErrorMsg("")
                      }}
                      className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Award className="h-4 w-4" /> Claim Matured Deposit
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedGoal(g)
                          setModalType("DEPOSIT")
                          setErrorMsg("")
                        }}
                        className="rounded-xl bg-[#3f3cff] py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity shadow-xs"
                      >
                        + Quick Deposit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGoal(g)
                          setModalType("WITHDRAW")
                          setErrorMsg("")
                        }}
                        className="rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-colors"
                      >
                        Withdraw
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Savings Transaction History Section */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg">Savings Transaction History</h2>
          <span className="text-xs font-semibold text-[#3f3cff]">Live Audit Log</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No savings transactions found yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isCredit = tx.type === "SAVINGS_WITHDRAWAL" || tx.type === "SAVINGS_INTEREST_PAYOUT"

              return (
                <div key={tx.id} className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-9 w-9 place-items-center rounded-xl font-bold text-xs ${
                      isCredit ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-[#3f3cff]"
                    }`}>
                      {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{tx.description || tx.recipientName}</p>
                      <p className="text-[10px] text-slate-400">Ref: {tx.reference} • {new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-black text-xs ${isCredit ? "text-emerald-600" : "text-slate-900"}`}>
                      {isCredit ? "+" : "-"}₦{tx.amount.toLocaleString()}
                    </p>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {tx.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* QUICK DEPOSIT MODAL */}
      {modalType === "DEPOSIT" && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Deposit into {selectedGoal.title}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-600">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-slate-500">Funds will be debited directly from your primary liquid checking wallet.</p>

            <input
              type="number"
              placeholder="Enter deposit amount (₦)"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none focus:border-[#3f3cff]"
            />
            <button
              onClick={handleDeposit}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#3f3cff] py-3.5 text-xs font-bold text-white shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isSubmitting ? "Processing Deposit..." : "Confirm & Add Funds"}</span>
            </button>
          </div>
        </div>
      )}

      {/* WITHDRAWAL MODAL */}
      {modalType === "WITHDRAW" && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Withdraw from {selectedGoal.title}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-600">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Available Vault Balance: <strong className="text-slate-900">₦{selectedGoal.currentAmount.toLocaleString()}.00</strong>
            </p>

            <input
              type="number"
              placeholder="Enter withdrawal amount (₦)"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none focus:border-[#3f3cff]"
            />
            <button
              onClick={handleWithdrawal}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 py-3.5 text-xs font-bold text-white shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isSubmitting ? "Processing Withdrawal..." : "Confirm Withdrawal"}</span>
            </button>
          </div>
        </div>
      )}

      {/* MATURITY SETTLEMENT MODAL */}
      {modalType === "SETTLE" && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Maturity Settlement — {selectedGoal.title}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-600">
                {errorMsg}
              </div>
            )}

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-1 text-xs">
              <p className="font-bold text-amber-800">Fixed Deposit Has Matured! 🏆</p>
              <p className="text-amber-700">Total Value: <strong>₦{selectedGoal.currentAmount.toLocaleString()}.00</strong></p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase">Choose Settlement Option</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettleAction("WITHDRAW")}
                  className={`rounded-2xl p-3 border text-xs font-bold text-left transition-all ${
                    settleAction === "WITHDRAW"
                      ? "border-[#3f3cff] bg-indigo-50 text-[#3f3cff] shadow-xs"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <p className="font-extrabold">Withdraw All</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Credit to checking with ₦0 penalty fee</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSettleAction("ROLLOVER")}
                  className={`rounded-2xl p-3 border text-xs font-bold text-left transition-all ${
                    settleAction === "ROLLOVER"
                      ? "border-[#3f3cff] bg-indigo-50 text-[#3f3cff] shadow-xs"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <p className="font-extrabold">Rollover Vault</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Re-invest total value into new 90-day term</p>
                </button>
              </div>
            </div>

            <button
              onClick={handleMaturitySettle}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#3f3cff] py-3.5 text-xs font-bold text-white shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isSubmitting ? "Processing Settlement..." : `Confirm ${settleAction}`}</span>
            </button>
          </div>
        </div>
      )}

      {/* CREATE VAULT MODAL */}
      {modalType === "CREATE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Create New Savings Vault</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
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
                placeholder="e.g. Emergency Fund"
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

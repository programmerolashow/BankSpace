'use client'

import { useEffect, useState, useCallback } from "react"
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Home,
  Tv,
  Car,
  Utensils,
  Zap,
  Trash2,
  Edit3,
  Loader2,
  X,
  PieChart,
  History,
} from "lucide-react"

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({
    totalAllocated: 0,
    totalSpent: 0,
    totalRemaining: 0,
    overallProgressPercent: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [budgetTransactions, setBudgetTransactions] = useState<any[]>([])
  const [selectedBudget, setSelectedBudget] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  // Form State
  const [budgetName, setBudgetName] = useState("")
  const [category, setCategory] = useState("GROCERIES")
  const [amount, setAmount] = useState("")
  const [period, setPeriod] = useState("MONTHLY")

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/budgets")
      if (res.ok) {
        const data = await res.json()
        setBudgets(data.budgets || [])
        setSummary(data.summary || {})
      }
    } catch {
      // Ignore network errors
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (!budgetName.trim()) {
      setFormError("Please enter a budget name.")
      return
    }

    const numAmt = Number(amount)
    if (isNaN(numAmt) || numAmt <= 0) {
      setFormError("Please enter a valid limit amount greater than ₦0.00.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: budgetName,
          category,
          amount: numAmt,
          period,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setIsCreateModalOpen(false)
        setBudgetName("")
        setAmount("")
        fetchBudgets()
      } else {
        setFormError(data.message || "Failed to create budget.")
      }
    } catch {
      setFormError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (!selectedBudget) return

    const numAmt = Number(amount)
    if (isNaN(numAmt) || numAmt <= 0) {
      setFormError("Please enter a valid limit amount greater than ₦0.00.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId: selectedBudget.id,
          name: budgetName,
          category,
          amount: numAmt,
          period,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setIsEditModalOpen(false)
        setSelectedBudget(null)
        fetchBudgets()
      } else {
        setFormError(data.message || "Failed to update budget.")
      }
    } catch {
      setFormError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBudget = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete budget "${name}"?`)) return

    try {
      const res = await fetch(`/api/budgets?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchBudgets()
      }
    } catch {
      alert("Failed to delete budget.")
    }
  }

  const openEditModal = (b: any) => {
    setSelectedBudget(b)
    setBudgetName(b.name)
    setCategory(b.category)
    setAmount(String(b.allocated))
    setPeriod(b.period || "MONTHLY")
    setFormError("")
    setIsEditModalOpen(true)
  }

  const getCategoryIcon = (catName: string) => {
    const nameUpper = String(catName).toUpperCase()
    if (nameUpper.includes("GROCERIES") || nameUpper.includes("FOOD")) return Utensils
    if (nameUpper.includes("UTILITIES") || nameUpper.includes("BILL")) return Zap
    if (nameUpper.includes("ENTERTAINMENT") || nameUpper.includes("MEDIA")) return Tv
    if (nameUpper.includes("TRANSPORT") || nameUpper.includes("CAR")) return Car
    return ShoppingBag
  }

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
                <Sparkles className="h-3.5 w-3.5" /> Overspending Engine Active
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Keep your spending on target
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Set custom spending caps per category, monitor remaining balances, and receive overspending alerts before exceeding limits.
            </p>
          </div>

          <button
            onClick={() => {
              setBudgetName("")
              setAmount("")
              setCategory("GROCERIES")
              setPeriod("MONTHLY")
              setFormError("")
              setIsCreateModalOpen(true)
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create New Budget
          </button>
        </div>

        {/* Budget Overview Widgets */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Allocated Limit</p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              ₦{Number(summary.totalAllocated || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Total category caps</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Spent</p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              ₦{Number(summary.totalSpent || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Tracked from transactions</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Remaining Budget Cap</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">
              ₦{Number(summary.totalRemaining || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-400">Available to spend</p>
          </div>

          <div className="rounded-2xl bg-linear-to-br from-[#7257ff] to-[#4335eb] p-4.5 text-white shadow-md">
            <p className="text-xs font-medium text-white/80">Overall Budget Progress</p>
            <p className="mt-1 text-3xl font-black">{summary.overallProgressPercent || 0}%</p>
            <div className="mt-2 h-2 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${Math.min(100, summary.overallProgressPercent || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Category Budget Progress Cards */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg">Category Spending Caps</h2>
            <span className="text-xs font-semibold text-[#3f3cff]">{budgets.length} Active Budgets</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center space-y-2 rounded-3xl border border-slate-200/80 bg-white p-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#3f3cff] mx-auto" />
              <p className="text-xs text-slate-400">Loading budgets from server...</p>
            </div>
          ) : budgets.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center space-y-3">
              <PieChart className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-base">No Budgets Created Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Create custom spending caps per category to track your monthly expenses and detect overspending early.
              </p>
              <button
                onClick={() => {
                  setBudgetName("")
                  setAmount("")
                  setCategory("GROCERIES")
                  setPeriod("MONTHLY")
                  setFormError("")
                  setIsCreateModalOpen(true)
                }}
                className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-5 py-2.5 text-xs font-semibold text-white shadow-md"
              >
                <Plus className="h-4 w-4" /> Create First Budget
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {budgets.map((b) => {
                const IconComponent = getCategoryIcon(b.category || b.name)
                const isOver = b.isOverspent || b.status === "EXCEEDED"

                return (
                  <div
                    key={b.id}
                    className={`rounded-3xl border p-6 transition-all bg-white shadow-xs ${
                      isOver ? "border-rose-300 ring-2 ring-rose-500/10" : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${isOver ? "bg-rose-500 text-white" : "bg-violet-600 text-white"} shadow-md`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">{b.name}</h3>
                            {isOver && (
                              <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-bold uppercase border border-rose-200">
                                Overspent
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{b.category} • {b.period || "MONTHLY"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            setSelectedBudget(b)
                            setIsHistoryLoading(true)
                            setIsHistoryModalOpen(true)
                            try {
                              const res = await fetch(`/api/budgets/transactions?budgetId=${b.id}`)
                              if (res.ok) {
                                const data = await res.json()
                                setBudgetTransactions(data.transactions || [])
                              }
                            } catch {
                              // Ignore error
                            } finally {
                              setIsHistoryLoading(false)
                            }
                          }}
                          className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#3f3cff] transition-colors"
                          title="View Contributing Financial Transactions"
                        >
                          <History className="h-3.5 w-3.5" /> History
                        </button>
                        <button
                          onClick={() => openEditModal(b)}
                          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-[#3f3cff] transition-colors"
                          title="Edit Budget"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(b.id, b.name)}
                          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Budget"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                        <span className="text-slate-600">
                          Spent: ₦{Number(b.spent || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-slate-900 font-bold">
                          Cap: ₦{Number(b.allocated || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver ? "bg-rose-500" : b.progressPercent > 80 ? "bg-amber-500" : "bg-violet-600"
                          }`}
                          style={{ width: `${Math.min(100, b.progressPercent || 0)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${isOver ? "text-rose-600" : "text-slate-500"}`}>
                          {b.progressPercent || 0}% used
                        </span>
                        <span className="text-emerald-600 font-bold">
                          Remaining: ₦{Number(b.remaining || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Budget Insights & Rules Sidebar */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
            <h2 className="font-bold text-slate-900 text-lg">Smart Budget Alerts</h2>

            {budgets.some((b) => b.isOverspent || b.status === "EXCEEDED") && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4.5 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                  <AlertTriangle className="h-4.5 w-4.5" />
                  <span>Overspending Warning Detected!</span>
                </div>
                <p className="text-xs leading-relaxed text-rose-800">
                  You have exceeded spending caps on one or more active budgets. Adjust caps or pause spending to stay on target.
                </p>
              </div>
            )}

            {budgets.length > 0 ? (
              <>
                <div className="rounded-2xl bg-amber-50 border border-amber-200/70 p-4.5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                    <AlertTriangle className="h-4.5 w-4.5" />
                    <span>Budget Tracking Active</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800">
                    Monitoring spending across {budgets.length} active transaction categories.
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/70 p-4.5 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    <span>Spending Status</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800">
                    Total spent: ₦{Number(summary.totalSpent || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} of ₦{Number(summary.totalAllocated || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} limit.
                  </p>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <p>No active budget rules set.</p>
                <p>Create a category budget to receive real-time overspending alerts.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* CREATE BUDGET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Create New Budget Cap</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Budget Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Groceries & Supermarket"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold outline-none focus:border-[#3f3cff]"
                >
                  <option value="GROCERIES">Groceries & Supermarket</option>
                  <option value="UTILITIES">Housing & Utilities</option>
                  <option value="TRANSPORT">Transport & Fuel</option>
                  <option value="ENTERTAINMENT">Entertainment & Dining</option>
                  <option value="SHOPPING">Shopping & Retail</option>
                  <option value="GENERAL">General Spending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Limit Amount (₦ Cap)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Period
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold outline-none focus:border-[#3f3cff]"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BUDGET MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Edit Budget Cap</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Budget Name
                </label>
                <input
                  type="text"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold outline-none focus:border-[#3f3cff]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Limit Amount (₦ Cap)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold outline-none focus:border-[#3f3cff]"
                  required
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Limit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BUDGET TRANSACTIONS HISTORY MODAL */}
      {isHistoryModalOpen && selectedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedBudget.name}</h3>
                <p className="text-xs text-slate-500">Contributing Financial Transactions</p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isHistoryLoading ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#3f3cff] mx-auto" />
                <p className="text-xs text-slate-400">Loading contributing transactions...</p>
              </div>
            ) : budgetTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-700 text-sm">No Transactions Found</p>
                <p>No financial debits recorded in category "{selectedBudget.category}" yet.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
                {budgetTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{tx.recipientName || tx.reference}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString()} • {tx.category || "General"}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-rose-600">
                      -₦{Number(tx.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  History,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react"

export default function AdminTransactionsPage() {
  const router = useRouter()

  const [transactions, setTransactions] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({ totalVolume: 0, total: 0, successfulCount: 0, pendingCount: 0, failedCount: 0 })
  const [pagination, setPagination] = useState<any>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  // Transaction Inspection Modal State
  const [selectedTx, setSelectedTx] = useState<any>(null)

  const fetchTransactions = async (
    p = page,
    status = statusFilter,
    type = typeFilter,
    q = searchQuery,
    start = startDate,
    end = endDate,
    sort = sortBy,
    order = sortOrder
  ) => {
    setIsLoading(true)
    try {
      const url = `/api/admin/transactions?page=${p}&limit=10&status=${status}&type=${type}&search=${encodeURIComponent(q)}&startDate=${start}&endDate=${end}&sortBy=${sort}&sortOrder=${order}`
      const res = await fetch(url)
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") {
          window.location.href = "/admin/login"
        } else {
          router.push("/admin/login")
        }
        return
      }

      if (res.ok) {
        const data = await res.json()
        if (data.transactions) setTransactions(data.transactions)
        if (data.metrics) setMetrics(data.metrics)
        if (data.pagination) setPagination(data.pagination)
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  return (
    <div className="space-y-8 pb-12">
      {/* FUNCTIONALITY HEADER & CAPABILITY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <History className="h-7 w-7 text-indigo-400" /> Full Platform Transaction Ledger Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Functionality: Audit full platform double-entry ledger records across all transaction types, track fee earnings, search references, and inspect receipt breakdown.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] font-bold">
            <span className="rounded-full bg-indigo-500/10 text-indigo-400 px-3 py-1 border border-indigo-500/20">
              • Multi-Type Ledger (`TRANSFER`, `DEPOSIT`, `SAVINGS`)
            </span>
            <span className="rounded-full bg-amber-500/10 text-amber-400 px-3 py-1 border border-amber-500/20">
              • Platform Fee Earnings Tracking
            </span>
            <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1 border border-emerald-500/20">
              • Server-Side Paginated Reference Search
            </span>
          </div>
        </div>
        <button
          onClick={() => fetchTransactions(page, statusFilter, typeFilter, searchQuery, startDate, endDate, sortBy, sortOrder)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-indigo-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh Ledger
        </button>
      </div>

      {/* METRIC COUNTER CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Settled Volume (₦)</span>
          <p className="text-2xl font-black text-amber-400 font-mono">
            ₦{Number(metrics.totalVolume || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] font-semibold text-emerald-400">Successful Settlement Volume</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Ledger Transactions</span>
          <p className="text-2xl font-black text-white">{metrics.total || 0}</p>
          <p className="text-[11px] font-semibold text-slate-400">Database Record Count</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Successful Transactions</span>
          <p className="text-2xl font-black text-emerald-400">{metrics.successfulCount || 0}</p>
          <p className="text-[11px] font-semibold text-emerald-400">Completed & Reconciled</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending / Failed</span>
          <p className="text-2xl font-black text-rose-400">{(metrics.pendingCount || 0) + (metrics.failedCount || 0)}</p>
          <p className="text-[11px] font-semibold text-rose-400">Pending or Unsettled Entries</p>
        </div>
      </div>

      {/* DOUBLE-ENTRY ACCOUNTING LEDGER SHEET (CUSTOM UX FOR TRANSACTIONS) */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-400" /> Double-Entry Financial Ledger Sheet
              </h2>
              <p className="text-xs text-slate-400">Formatted with Gross Amount, Fee Deduction, Net Settlement Amount</p>
            </div>

            {/* Live Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search reference, provider ref, name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                  fetchTransactions(1, statusFilter, typeFilter, e.target.value, startDate, endDate, sortBy, sortOrder)
                }}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500/60"
              />
            </div>
          </div>

          {/* ACCOUNTING MULTI-FILTER TOOLBAR */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 border-b border-slate-800 pb-4 text-xs font-semibold">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
                fetchTransactions(1, e.target.value, typeFilter, searchQuery, startDate, endDate, sortBy, sortOrder)
              }}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESSFUL">SUCCESSFUL</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REVERSED">REVERSED</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPage(1)
                fetchTransactions(1, statusFilter, e.target.value, searchQuery, startDate, endDate, sortBy, sortOrder)
              }}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none"
            >
              <option value="ALL">All Transaction Types</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="DEPOSIT">DEPOSIT</option>
              <option value="WITHDRAWAL">WITHDRAWAL</option>
              <option value="SAVINGS">SAVINGS</option>
              <option value="INVESTMENT">INVESTMENT</option>
            </select>

            {/* Start Date */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
                fetchTransactions(1, statusFilter, typeFilter, searchQuery, e.target.value, endDate, sortBy, sortOrder)
              }}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none"
            />

            {/* End Date */}
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
                fetchTransactions(1, statusFilter, typeFilter, searchQuery, startDate, e.target.value, sortBy, sortOrder)
              }}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none"
            />

            {/* Sort Order */}
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [s, o] = e.target.value.split(":")
                setSortBy(s)
                setSortOrder(o as any)
                fetchTransactions(1, statusFilter, typeFilter, searchQuery, startDate, endDate, s, o as any)
              }}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none"
            >
              <option value="createdAt:desc">Newest First</option>
              <option value="createdAt:asc">Oldest First</option>
              <option value="amount:desc">Highest Amount</option>
              <option value="amount:asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-400" />
            <p className="text-xs font-semibold">Loading ledger accounting sheet...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <History className="h-10 w-10 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-slate-300">No transactions found</p>
            <p className="text-xs">No records matching selected filters.</p>
          </div>
        ) : (
          <div className="space-y-4 font-mono">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider font-sans">
                  <tr>
                    <th className="py-3 px-3">Reference / Paystack Ref</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Counterparty Name</th>
                    <th className="py-3 px-3 text-right">Gross Amount (₦)</th>
                    <th className="py-3 px-3 text-right">Platform Fee (₦)</th>
                    <th className="py-3 px-3 text-right">Net Settlement (₦)</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {transactions.map((t) => {
                    const isSuccess = t.status === "SUCCESSFUL"
                    const isPending = t.status === "PENDING"
                    const isFailed = t.status === "FAILED"
                    const fee = Number(t.fee || 0)
                    const gross = Number(t.amount || 0)
                    const net = gross - fee

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-mono font-bold text-white text-[11px]">{t.reference}</p>
                          {t.providerRef && <p className="font-mono text-[10px] text-indigo-400">{t.providerRef}</p>}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className="rounded-xl bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300">
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <p className="font-bold text-white text-[11px]">{t.senderName}</p>
                          <p className="text-[10px] text-slate-400">➔ {t.recipientName || t.accountNumber}</p>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                          ₦{gross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400">
                          ₦{fee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-white">
                          ₦{net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isSuccess
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : isPending
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : isFailed
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-sans">
                          <button
                            onClick={() => setSelectedTx(t)}
                            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700 inline-flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5 text-indigo-400" /> Receipt
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION FOOTER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-400 font-sans">
              <span>
                Showing Page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{pagination.totalPages}</strong> (Total <strong className="text-indigo-400">{pagination.total}</strong> ledger entries)
              </span>

              <div className="flex items-center gap-2 font-sans">
                <button
                  onClick={() => {
                    const newP = Math.max(page - 1, 1)
                    setPage(newP)
                    fetchTransactions(newP, statusFilter, typeFilter, searchQuery, startDate, endDate, sortBy, sortOrder)
                  }}
                  disabled={!pagination.hasPrevPage}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>

                <button
                  onClick={() => {
                    const newP = page + 1
                    setPage(newP)
                    fetchTransactions(newP, statusFilter, typeFilter, searchQuery, startDate, endDate, sortBy, sortOrder)
                  }}
                  disabled={!pagination.hasNextPage}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* TRANSACTION RECEIPT MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedTx(null)} />
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-400" /> Transaction Receipt Audit
                </h3>
                <p className="text-xs font-mono text-slate-400">Ref: {selectedTx.reference}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 font-semibold text-xs">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Gross Amount</span>
                <p className="text-lg font-black text-amber-400 font-mono">
                  ₦{Number(selectedTx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Platform Fee</span>
                <p className="text-lg font-black text-emerald-400 font-mono">
                  ₦{Number(selectedTx.fee || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Execution Status</span>
                <p className="font-bold text-white">{selectedTx.status}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 text-xs font-mono">
              <h4 className="text-[10px] font-sans font-bold uppercase text-slate-400">Audit Identifiers</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-[10px] text-slate-500">Internal Reference</span>
                  <p className="text-white font-bold">{selectedTx.reference}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Paystack Provider Ref</span>
                  <p className="text-indigo-400 font-bold">{selectedTx.providerRef || "INTERNAL_LEDGER"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

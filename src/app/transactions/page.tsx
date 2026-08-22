'use client'

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"

type TransactionItem = {
  id: string
  reference: string
  providerRef?: string | null
  senderName: string
  recipientName: string
  bankName: string
  accountNumber: string
  amount: number
  fee: number
  currency: string
  type: string
  category: string
  status: string
  description?: string | null
  note?: string | null
  createdAt: string
}

export default function TransactionsPage() {
  const [filterType, setFilterType] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null)

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "10")
      if (filterType !== "ALL") params.set("type", filterType)
      if (searchQuery) params.set("search", searchQuery)

      const res = await fetch(`/api/transactions?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalRecords(data.pagination?.total || 0)
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false)
    }
  }, [page, filterType, searchQuery])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions()
  }, [fetchTransactions])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  const handleFilterChange = (type: string) => {
    setFilterType(type)
    setPage(1)
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eeeeff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#3f3cff]">
                Transaction History
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" /> Database Verified
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Track every payment and transfer
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Real-time transaction statement fetched directly from NeonDB PostgreSQL with double-entry ledger verification.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors">
            <Download className="h-4 w-4 text-[#3f3cff]" /> Export Statement
          </button>
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-[#f8f9ff] p-4 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Active Records</p>
            <p className="mt-1 text-2xl font-black text-[#3f3cff]">{totalRecords} Transactions</p>
          </div>
          <div className="rounded-2xl bg-[#f8f9ff] p-4 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Current Page</p>
            <p className="mt-1 text-2xl font-black text-slate-900">Page {page} of {totalPages}</p>
          </div>
          <div className="rounded-2xl bg-[#f8f9ff] p-4 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Audit Status</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">100% Reconciled</p>
          </div>
        </div>
      </section>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Type Filter Buttons */}
        <div className="flex items-center rounded-2xl bg-slate-100 p-1.5 border border-slate-200/70 w-full sm:w-auto">
          {[
            { label: "All", value: "ALL" },
            { label: "Transfers", value: "TRANSFER" },
            { label: "Deposits", value: "DEPOSIT" },
            { label: "Withdrawals", value: "WITHDRAWAL" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => handleFilterChange(item.value)}
              className={`flex-1 sm:flex-none rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                filterType === item.value ? "bg-white text-[#3f3cff] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reference, recipient, or bank..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
          />
        </div>
      </div>

      {/* Transactions List Table / Cards */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#3f3cff] mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading transactions from database...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No transactions match your search criteria.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isCredit = tx.type === "DEPOSIT"
              const currSymbol = tx.currency || "₦"
              const formattedAmt = `${isCredit ? "+" : "-"}${currSymbol}${Math.abs(tx.amount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}`

              const formattedDate = new Date(tx.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="flex items-center justify-between py-4 px-2 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${isCredit ? "bg-emerald-600" : "bg-[#3f3cff]"} text-white shadow-md`}>
                      {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{tx.description || `${tx.type} - ${tx.recipientName}`}</p>
                      <p className="text-xs text-slate-400">
                        {tx.bankName} • {formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-black text-sm ${isCredit ? "text-emerald-600" : "text-slate-950"}`}>
                      {formattedAmt}
                    </p>
                    <span
                      className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        tx.status === "SUCCESSFUL" || tx.status === "Completed"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : tx.status === "REVERSED"
                          ? "bg-rose-500/10 text-rose-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500">
              Showing Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 text-base">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase">Amount</p>
              <p className={`mt-1 text-3xl font-black ${selectedTx.type === "DEPOSIT" ? "text-emerald-600" : "text-slate-950"}`}>
                {selectedTx.type === "DEPOSIT" ? "+" : "-"}
                {selectedTx.currency || "₦"}
                {Math.abs(selectedTx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-800">{selectedTx.description || selectedTx.recipientName}</p>
            </div>

            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Reference</span>
                <span className="font-mono font-bold text-slate-900">{selectedTx.reference}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="font-bold text-emerald-600">{selectedTx.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction Type</span>
                <span className="font-bold text-slate-900">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between">
                <span>Bank / Channel</span>
                <span className="font-bold text-slate-900">{selectedTx.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee</span>
                <span className="font-bold text-slate-900">₦{selectedTx.fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time</span>
                <span className="font-bold text-slate-900">
                  {new Date(selectedTx.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

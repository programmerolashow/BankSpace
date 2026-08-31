/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/layout/AdminLayout"
import {
  ArrowLeftRight,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Building,
  User,
  ShieldAlert,
} from "lucide-react"

export default function AdminTransfersPage() {
  const router = useRouter()

  const [transfers, setTransfers] = useState<any[]>([])
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
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  // Transfer Inspection Modal State
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null)

  const fetchTransfers = async (
    p = page,
    status = statusFilter,
    q = searchQuery,
    start = startDate,
    end = endDate,
    sort = sortBy,
    order = sortOrder
  ) => {
    setIsLoading(true)
    try {
      const url = `/api/admin/transfers?page=${p}&limit=10&status=${status}&search=${encodeURIComponent(q)}&startDate=${start}&endDate=${end}&sortBy=${sort}&sortOrder=${order}`
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
        if (data.transfers) setTransfers(data.transfers)
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
    fetchTransfers()
  }, [])

  return (
    <AdminLayout title="Transfer Monitoring & Paystack Management Console">
      <div className="space-y-8 pb-12">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <ArrowLeftRight className="h-7 w-7 text-emerald-400" /> Paystack & Transfer Monitoring Console
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time audit of money movement transfers, Paystack provider references, status tracking, and failure reasons.
            </p>
          </div>
          <button
            onClick={() => fetchTransfers(page, statusFilter, searchQuery, startDate, endDate, sortBy, sortOrder)}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-emerald-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh Transfers
          </button>
        </div>

        {/* METRIC COUNTER CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Settled Transfer Volume</span>
            <p className="text-2xl font-black text-emerald-400">
              ₦{Number(metrics.totalVolume || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] font-semibold text-emerald-400">Successful Settlement Volume</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Transfers Executed</span>
            <p className="text-2xl font-black text-white">{metrics.total || 0}</p>
            <p className="text-[11px] font-semibold text-slate-400">Transfer Database Records</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Successful Transfers</span>
            <p className="text-2xl font-black text-emerald-400">{metrics.successfulCount || 0}</p>
            <p className="text-[11px] font-semibold text-emerald-400">Completed & Reconciled</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Failed / Reversed</span>
            <p className="text-2xl font-black text-rose-400">{metrics.failedCount || 0}</p>
            <p className="text-[11px] font-semibold text-rose-400">Failed or Reversed Transfers</p>
          </div>
        </div>

        {/* MAIN CONSOLE SECTION */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-emerald-400" /> Filter & Search Transfers
                </h2>
                <p className="text-xs text-slate-400">Server-side database paginated transfer queue</p>
              </div>

              {/* Live Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search reference, Paystack ref, NUBAN, sender..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                    fetchTransfers(1, statusFilter, e.target.value, startDate, endDate, sortBy, sortOrder)
                  }}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-200 outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            {/* FILTER BAR */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 border-b border-slate-800 pb-4 text-xs font-semibold">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                  fetchTransfers(1, e.target.value, searchQuery, startDate, endDate, sortBy, sortOrder)
                }}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESSFUL">SUCCESSFUL</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="REVERSED">REVERSED</option>
              </select>

              {/* Start Date */}
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                  fetchTransfers(1, statusFilter, searchQuery, e.target.value, endDate, sortBy, sortOrder)
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
                  fetchTransfers(1, statusFilter, searchQuery, startDate, e.target.value, sortBy, sortOrder)
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
                  fetchTransfers(1, statusFilter, searchQuery, startDate, endDate, s, o as any)
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
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs font-semibold">Loading transfer records from database...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <ArrowLeftRight className="h-10 w-10 mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-300">No transfer records found</p>
              <p className="text-xs">No transfers matching selected search and filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="pb-3">Transfer Ref / Provider</th>
                      <th className="pb-3">Sender Party</th>
                      <th className="pb-3">Recipient Party</th>
                      <th className="pb-3">Amount (₦)</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Failure Reason</th>
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                    {transfers.map((t) => {
                      const isSuccess = t.status === "SUCCESSFUL"
                      const isPending = t.status === "PENDING"
                      const isFailed = t.status === "FAILED" || t.status === "REVERSED"

                      return (
                        <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4">
                            <p className="font-mono font-bold text-white">{t.reference}</p>
                            <p className="font-mono text-[10px] text-emerald-400">{t.providerRef || t.provider}</p>
                          </td>
                          <td className="py-4">
                            <p className="font-bold text-white">{t.senderName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{t.senderAccount?.accountNumber || "BankSpace Account"}</p>
                          </td>
                          <td className="py-4">
                            <p className="font-bold text-white">{t.recipientName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {t.accountNumber} ({t.bankName})
                            </p>
                          </td>
                          <td className="py-4 font-mono font-black text-amber-400">
                            ₦{Number(t.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4">
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
                          <td className="py-4 max-w-xs truncate text-[11px] text-slate-400 font-sans">
                            {t.failureReason || "—"}
                          </td>
                          <td className="py-4 text-slate-400 font-mono text-[11px]">
                            {new Date(t.createdAt).toLocaleString()}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => setSelectedTransfer(t)}
                              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700 inline-flex items-center gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5 text-emerald-400" /> Inspect
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION FOOTER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-400">
                <span>
                  Showing Page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{pagination.totalPages}</strong> (Total <strong className="text-emerald-400">{pagination.total}</strong> transfers)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newP = Math.max(page - 1, 1)
                      setPage(newP)
                      fetchTransfers(newP, statusFilter, searchQuery, startDate, endDate, sortBy, sortOrder)
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
                      fetchTransfers(newP, statusFilter, searchQuery, startDate, endDate, sortBy, sortOrder)
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

        {/* TRANSFER DETAILS INSPECTION MODAL */}
        {selectedTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedTransfer(null)} />
            <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-emerald-400" /> Paystack Transfer Audit Record
                  </h3>
                  <p className="text-xs font-mono text-slate-400">Ref: {selectedTransfer.reference}</p>
                </div>
                <button
                  onClick={() => setSelectedTransfer(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Failure Notice Alert if Failed */}
              {(selectedTransfer.status === "FAILED" || selectedTransfer.status === "REVERSED") && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-1 text-xs">
                  <span className="text-rose-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4" /> Paystack / Bank Settlement Failure Reason
                  </span>
                  <p className="text-rose-200 font-semibold">{selectedTransfer.failureReason || "Transfer failed or was reversed."}</p>
                </div>
              )}

              {/* Metrics Overview Grid */}
              <div className="grid gap-4 sm:grid-cols-3 font-semibold text-xs">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Transfer Amount</span>
                  <p className="text-lg font-black text-amber-400 font-mono">
                    ₦{Number(selectedTransfer.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Processing Status</span>
                  <p className={`font-bold ${selectedTransfer.status === "SUCCESSFUL" ? "text-emerald-400" : "text-rose-400"}`}>
                    {selectedTransfer.status}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Processing Fee</span>
                  <p className="font-bold text-slate-300">₦{Number(selectedTransfer.fee || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Provider References */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs font-mono">
                <span className="text-[10px] font-sans font-bold uppercase text-slate-400">Paystack Provider Audit Identifiers</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-[10px] text-slate-500">BankSpace Reference</span>
                    <p className="text-white font-bold">{selectedTransfer.reference}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Paystack Gateway Provider Ref</span>
                    <p className="text-emerald-400 font-bold">{selectedTransfer.providerRef || "PAYSTACK_DIRECT_SETTLEMENT"}</p>
                  </div>
                </div>
              </div>

              {/* Sender & Recipient Details */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-amber-400" /> Sender Party
                  </span>
                  <p className="font-bold text-white">{selectedTransfer.senderName}</p>
                  <p className="font-mono text-slate-400">Account: {selectedTransfer.senderAccount?.accountNumber || "Primary Wallet"}</p>
                  {selectedTransfer.senderAccount?.user && (
                    <p className="text-[11px] text-slate-400">{selectedTransfer.senderAccount.user.email}</p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-emerald-400" /> Recipient Party
                  </span>
                  <p className="font-bold text-white">{selectedTransfer.recipientName}</p>
                  <p className="font-mono text-slate-400">NUBAN: {selectedTransfer.accountNumber}</p>
                  <p className="font-semibold text-emerald-400">{selectedTransfer.bankName}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

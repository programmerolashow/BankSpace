/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Zap,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Lock,
  Terminal,
  Activity,
} from "lucide-react"

export default function AdminPaystackPage() {
  const router = useRouter()

  const [records, setRecords] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({ totalPaystackVolume: 0, total: 0, successCount: 0, pendingCount: 0, failedCount: 0 })
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
  const [eventFilter, setEventFilter] = useState("ALL")
  const [page, setPage] = useState(1)

  // Inspection Modal State
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const fetchPaystackRecords = async (
    p = page,
    status = statusFilter,
    event = eventFilter,
    q = searchQuery
  ) => {
    setIsLoading(true)
    try {
      const url = `/api/admin/paystack?page=${p}&limit=10&status=${status}&event=${event}&search=${encodeURIComponent(q)}`
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
        if (data.records) setRecords(data.records)
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
    fetchPaystackRecords()
  }, [])

  return (
    <div className="space-y-8 pb-12">
      {/* FUNCTIONALITY HEADER & CAPABILITY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Zap className="h-7 w-7 text-amber-400" /> Paystack Provider Integration Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Functionality: Inspect Paystack gateway references, audit webhook event payloads (`charge.success`, `transfer.failed`), debug decline reasons, with zero credential exposure.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] font-bold">
            <span className="rounded-full bg-amber-500/10 text-amber-400 px-3 py-1 border border-amber-500/20">
              • Paystack References (`PAYSTACK_...`)
            </span>
            <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1 border border-emerald-500/20">
              • Webhook Payload Audit
            </span>
            <span className="rounded-full bg-cyan-500/10 text-cyan-400 px-3 py-1 border border-cyan-500/20">
              • Zero-Credential Backend Isolation
            </span>
          </div>
        </div>
        <button
          onClick={() => fetchPaystackRecords(page, statusFilter, eventFilter, searchQuery)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-amber-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh Events
        </button>
      </div>

      {/* SECURITY & CREDENTIAL ISOLATION BANNER */}
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex items-center justify-between gap-4 text-xs font-semibold text-emerald-300 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Security Isolation Enforcement Active</p>
            <p className="text-emerald-400/90 text-[11px]">
              <code>PAYSTACK_SECRET_KEY</code> is isolated on server. Zero private API credentials are sent to browser.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-black text-emerald-400 border border-emerald-500/30">
          ENCRYPTED BACKEND
        </span>
      </div>

      {/* METRIC COUNTER CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Paystack Settlement Volume</span>
          <p className="text-2xl font-black text-amber-400">
            ₦{Number(metrics.totalPaystackVolume || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] font-semibold text-emerald-400">Verified Gateway Volume</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Paystack Gateway Events</span>
          <p className="text-2xl font-black text-white">{metrics.total || 0}</p>
          <p className="text-[11px] font-semibold text-slate-400">Tracked Gateway Entries</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Approved Gateway Events</span>
          <p className="text-2xl font-black text-emerald-400">{metrics.successCount || 0}</p>
          <p className="text-[11px] font-semibold text-emerald-400">Verified Gateway Settlements</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Declined Gateway Events</span>
          <p className="text-2xl font-black text-rose-400">{metrics.failedCount || 0}</p>
          <p className="text-[11px] font-semibold text-rose-400">Declined or Reversed</p>
        </div>
      </div>

      {/* WEBHOOK EVENT FEED & INSPECTOR WORKSPACE */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="h-5 w-5 text-amber-400" /> Paystack Gateway Webhook Event Feed
            </h2>
            <p className="text-xs text-slate-400">Real-time webhook log feed & event payload inspector</p>
          </div>

          {/* Live Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search reference, Paystack ref, customer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
                fetchPaystackRecords(1, statusFilter, eventFilter, e.target.value)
              }}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500/60"
            />
          </div>
        </div>

        {/* EVENT FILTER CHIPS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
          {[
            { id: "ALL", label: "All Webhook Events" },
            { id: "charge.success", label: "Deposits (charge.success)" },
            { id: "transfer.success", label: "Transfers (transfer.success)" },
            { id: "transfer.failed", label: "Declines (transfer.failed)" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => {
                setEventFilter(chip.id)
                setPage(1)
                fetchPaystackRecords(1, statusFilter, chip.id, searchQuery)
              }}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                eventFilter === chip.id
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-400" />
            <p className="text-xs font-semibold">Loading Paystack event log feed...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Zap className="h-10 w-10 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-slate-300">No Paystack events found</p>
            <p className="text-xs">No gateway records matching selected filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* LOG FEED STYLE LIST (CUSTOM UX FOR PAYSTACK) */}
            <div className="space-y-3 font-mono">
              {records.map((r) => {
                const isSuccess = r.status === "SUCCESSFUL"
                const isFailed = r.status === "FAILED" || r.status === "REVERSED"

                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 h-3 w-3 rounded-full shrink-0 ${
                          isSuccess ? "bg-emerald-400 shadow-sm shadow-emerald-500/50" : isFailed ? "bg-rose-500 shadow-sm shadow-rose-500/50" : "bg-amber-400"
                        }`}
                      />
                      <div className="space-y-1 font-sans">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-white text-xs">{r.reference}</span>
                          <span className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-0.5 font-mono text-[10px] text-amber-400">
                            {r.providerRef}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                              isSuccess
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : isFailed
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-semibold">
                          Customer: <strong className="text-slate-200">{r.senderName || r.recipientName}</strong> ({r.customerEmail})
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Response: {r.failureInformation || r.providerResponse}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                      <div className="text-left md:text-right font-mono">
                        <p className="text-sm font-black text-amber-400">
                          ₦{Number(r.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleTimeString()}</p>
                      </div>

                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-amber-400" /> Payload
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* PAGINATION FOOTER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-400">
              <span>
                Showing Page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{pagination.totalPages}</strong> (Total <strong className="text-amber-400">{pagination.total}</strong> gateway records)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newP = Math.max(page - 1, 1)
                    setPage(newP)
                    fetchPaystackRecords(newP, statusFilter, eventFilter, searchQuery)
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
                    fetchPaystackRecords(newP, statusFilter, eventFilter, searchQuery)
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

      {/* WEBHOOK PAYLOAD INSPECTOR MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedRecord(null)} />
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto space-y-6 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-amber-400" /> Paystack Webhook Payload Inspector
                </h3>
                <p className="text-xs font-mono text-slate-400">Ref: {selectedRecord.reference}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedRecord.failureInformation && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-1 text-xs">
                <span className="text-rose-400 font-bold uppercase text-[10px] flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4" /> Paystack Gateway Decline Rationale
                </span>
                <p className="text-rose-200 font-semibold">{selectedRecord.failureInformation}</p>
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 text-xs font-mono">
              <span className="text-[10px] font-sans font-bold uppercase text-slate-400">Sanitized Provider Audit Data</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-[10px] text-slate-500">BankSpace Reference</span>
                  <p className="text-white font-bold">{selectedRecord.reference}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Paystack Provider Ref</span>
                  <p className="text-amber-400 font-bold">{selectedRecord.providerRef}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Gateway Response Message</span>
              <p className="font-mono text-slate-200">{selectedRecord.providerResponse}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Customer Account Identity</span>
                <p className="font-bold text-white">{selectedRecord.senderName || selectedRecord.recipientName}</p>
                <p className="text-slate-400">{selectedRecord.customerEmail}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Settlement Timestamp</span>
                <p className="font-mono text-white">{new Date(selectedRecord.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

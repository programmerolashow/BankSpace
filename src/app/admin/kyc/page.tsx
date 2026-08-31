/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Users,
  Eye,
  RefreshCw,
  FileCheck,
  UserCheck,
  Check,
} from "lucide-react"

export default function AdminKYCPage() {
  const router = useRouter()

  const [submissions, setSubmissions] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({ total: 0, pending: 0, verified: 0, rejected: 0 })
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
  const [page, setPage] = useState(1)

  // Decision Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [decisionAction, setDecisionAction] = useState<"APPROVE" | "REJECT" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchKYCSubmissions = async (
    p = page,
    s = statusFilter,
    q = searchQuery
  ) => {
    setIsLoading(true)
    try {
      const url = `/api/admin/kyc?page=${p}&limit=10&status=${s}&search=${encodeURIComponent(q)}`
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
        if (data.submissions) setSubmissions(data.submissions)
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
    fetchKYCSubmissions()
  }, [])

  const handleExecuteDecision = async () => {
    if (!selectedSubmission || !decisionAction) return
    if (decisionAction === "REJECT" && !rejectionReason.trim()) {
      alert("Please provide a rejection reason before submitting.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedSubmission.id,
          action: decisionAction,
          reason: rejectionReason,
        }),
      })

      if (res.ok) {
        setSelectedSubmission(null)
        setDecisionAction(null)
        setRejectionReason("")
        await fetchKYCSubmissions(page, statusFilter, searchQuery)
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(errData.error || "Failed to record KYC decision.")
      }
    } catch {
      alert("An error occurred while performing administrative action.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const complianceRate = metrics.total ? Math.round((metrics.verified / metrics.total) * 100) : 0

  return (
    <div className="space-y-8 pb-12">
      {/* FUNCTIONALITY HEADER & CAPABILITY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-cyan-400" /> Customer Identity Verification & Compliance Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Functionality: Audit customer identity submissions, verify BVN/NIN compliance records, approve or reject applications with mandatory audit logging.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] font-bold">
            <span className="rounded-full bg-cyan-500/10 text-cyan-400 px-3 py-1 border border-cyan-500/20">
              • Audit ID Documents & BVN
            </span>
            <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1 border border-emerald-500/20">
              • Mandatory Rejection Reason Logging
            </span>
            <span className="rounded-full bg-indigo-500/10 text-indigo-400 px-3 py-1 border border-indigo-500/20">
              • Immutable Compliance Audit Trail
            </span>
          </div>
        </div>
        <button
          onClick={() => fetchKYCSubmissions(page, statusFilter, searchQuery)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-cyan-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh Queue
        </button>
      </div>

      {/* SPECIALIZED COMPLIANCE QUEUE PROGRESS GAUGE */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Compliance Audit Progress Rate</h3>
              <p className="text-xs text-slate-400">Total Account Verification Clearance: {complianceRate}%</p>
            </div>
          </div>
          <span className="text-xl font-black font-mono text-cyan-400">{metrics.verified || 0} / {metrics.total || 0}</span>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
          <div
            style={{ width: `${complianceRate}%` }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
          />
        </div>
      </div>

      {/* METRICS ROW CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Submissions</span>
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{metrics.pending || 0}</p>
          <p className="text-[11px] font-semibold text-slate-400">Awaiting Compliance Review</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Identity Accounts</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{metrics.verified || 0}</p>
          <p className="text-[11px] font-semibold text-emerald-400">Approved Compliance Accounts</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected Submissions</span>
            <XCircle className="h-5 w-5 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400">{metrics.rejected || 0}</p>
          <p className="text-[11px] font-semibold text-rose-400">Rejection Reason Audit Recorded</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Submissions Registry</span>
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{metrics.total || 0}</p>
          <p className="text-[11px] font-semibold text-slate-400">Total Customer Profiles</p>
        </div>
      </div>

      {/* WORKSPACE VERIFICATION GRID */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" /> Verification Submissions Workspace
            </h2>
            <p className="text-xs text-slate-400">Server-side database paginated compliance queue</p>
          </div>

          {/* Live Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search user name, email, NUBAN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
                fetchKYCSubmissions(1, statusFilter, e.target.value)
              }}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-cyan-500/60"
            />
          </div>
        </div>

        {/* STATUS PILL TABS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
          {[
            { id: "ALL", label: "All Submissions" },
            { id: "PENDING", label: `Pending Queue (${metrics.pending || 0})` },
            { id: "VERIFIED", label: `Verified (${metrics.verified || 0})` },
            { id: "REJECTED", label: `Rejected (${metrics.rejected || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id)
                setPage(1)
                fetchKYCSubmissions(1, tab.id, searchQuery)
              }}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-cyan-400" />
            <p className="text-xs font-semibold">Loading KYC submissions queue...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <ShieldCheck className="h-10 w-10 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-slate-300">No submissions found</p>
            <p className="text-xs">No records matching selected status filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* WORKSPACE CARDS GRID (CUSTOM UX FOR KYC) */}
            <div className="grid gap-4 md:grid-cols-2">
              {submissions.map((user) => {
                const isVerified = user.kycStatus === "VERIFIED"
                const isPending = user.kycStatus === "PENDING"
                const isRejected = user.kycStatus === "REJECTED"

                return (
                  <div
                    key={user.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950 p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500/20 text-cyan-400 font-black text-lg border border-cyan-500/30">
                            {user.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-white">{user.name}</h3>
                            <p className="text-[11px] text-slate-400">{user.email}</p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                            isVerified
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : isPending
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : isRejected
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {user.kycStatus || "PENDING"}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 space-y-1.5 text-xs font-semibold">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Primary NUBAN:</span>
                          <span className="font-mono text-white">{user.primaryAccount?.accountNumber || "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>BVN / Identity Status:</span>
                          <span className="text-cyan-400">Submitted & Pending Audit</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Registration Date:</span>
                          <span className="font-mono text-slate-300">{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {user.kycRejectionReason && (
                        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs">
                          <span className="text-rose-400 font-bold uppercase text-[10px] flex items-center gap-1">
                            <ShieldAlert className="h-3.5 w-3.5" /> Rejection Audit Log
                          </span>
                          <p className="text-rose-200 mt-1">{user.kycRejectionReason}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <button
                        onClick={() => {
                          setSelectedSubmission(user)
                          setDecisionAction(null)
                          setRejectionReason("")
                        }}
                        className="rounded-2xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 px-4 py-2 text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Eye className="h-4 w-4" /> Compliance Workspace
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* PAGINATION FOOTER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-400">
              <span>
                Showing Page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{pagination.totalPages}</strong> (Total <strong className="text-cyan-400">{pagination.total}</strong> accounts)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newP = Math.max(page - 1, 1)
                    setPage(newP)
                    fetchKYCSubmissions(newP, statusFilter, searchQuery)
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
                    fetchKYCSubmissions(newP, statusFilter, searchQuery)
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

      {/* COMPLIANCE DECISION WORKSPACE MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedSubmission(null)} />
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-cyan-400" /> Identity Compliance Workspace
                </h3>
                <p className="text-xs text-slate-400">Reviewing: {selectedSubmission.name}</p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Customer Profile</span>
                <p className="font-bold text-white text-sm">{selectedSubmission.name}</p>
                <p className="text-slate-400">{selectedSubmission.email}</p>
                <p className="font-mono text-cyan-400">NUBAN: {selectedSubmission.primaryAccount?.accountNumber || "N/A"}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Current Compliance Status</span>
                <p className="font-bold text-amber-400 text-sm">{selectedSubmission.kycStatus || "PENDING"}</p>
                <p className="text-slate-400 text-[11px]">Submitted: {new Date(selectedSubmission.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Decision Execution Buttons */}
            <div className="border-t border-slate-800 pt-4 space-y-4">
              <span className="text-xs font-bold text-white">Select Administrative Decision:</span>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDecisionAction("APPROVE")}
                  className={`rounded-2xl p-4 border text-left cursor-pointer transition-all ${
                    decisionAction === "APPROVE"
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <p className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Approve Identity
                  </p>
                  <p className="text-[11px] mt-1 opacity-80">Clear account for full platform transfers & transactions.</p>
                </button>

                <button
                  onClick={() => setDecisionAction("REJECT")}
                  className={`rounded-2xl p-4 border text-left cursor-pointer transition-all ${
                    decisionAction === "REJECT"
                      ? "border-rose-500 bg-rose-500/20 text-rose-300"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <p className="font-bold text-sm text-rose-400 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" /> Reject Identity
                  </p>
                  <p className="text-[11px] mt-1 opacity-80">Decline submission with mandatory logged reason.</p>
                </button>
              </div>

              {decisionAction === "REJECT" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-rose-400">Rejection Audit Reason (Mandatory):</label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason for rejecting this KYC submission..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full rounded-2xl border border-rose-500/40 bg-slate-950 p-3 text-xs text-slate-200 outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {decisionAction && (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setDecisionAction(null)}
                    className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteDecision}
                    disabled={isSubmitting}
                    className={`rounded-2xl px-5 py-2 text-xs font-black text-slate-950 cursor-pointer ${
                      decisionAction === "APPROVE" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-rose-500 hover:bg-rose-400"
                    }`}
                  >
                    {isSubmitting ? "Recording..." : `Confirm ${decisionAction === "APPROVE" ? "Approval" : "Rejection"}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

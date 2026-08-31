/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/layout/AdminLayout"
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

  return (
    <AdminLayout title="KYC Verification Management Console">
      <div className="space-y-8 pb-12">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-amber-400" /> KYC Verification Console
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Review customer identity submissions, approve compliance, or record logged rejections.
            </p>
          </div>
          <button
            onClick={() => fetchKYCSubmissions(page, statusFilter, searchQuery)}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-amber-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh Submissions
          </button>
        </div>

        {/* METRICS ROW CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Submissions</span>
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400">{metrics.pending || 0}</p>
            <p className="text-[11px] font-semibold text-slate-400">Awaiting Administrator Review</p>
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

        {/* MAIN SUBMISSIONS TABLE SECTION */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-400" /> Verification Submissions Registry
                </h2>
                <p className="text-xs text-slate-400">Server-side database paginated KYC queue</p>
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
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            {/* FILTER PILLS BAR */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
              {[
                { id: "ALL", label: "All Submissions" },
                { id: "PENDING", label: `Pending (${metrics.pending || 0})` },
                { id: "VERIFIED", label: `Verified (${metrics.verified || 0})` },
                { id: "REJECTED", label: `Rejected (${metrics.rejected || 0})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => {
                    setStatusFilter(pill.id)
                    setPage(1)
                    fetchKYCSubmissions(1, pill.id, searchQuery)
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === pill.id
                      ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                      : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-400" />
              <p className="text-xs font-semibold">Loading KYC submissions from database...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <ShieldAlert className="h-10 w-10 mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-300">No KYC submissions found</p>
              <p className="text-xs">No customer records matching status filter "{statusFilter}".</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="pb-3">Customer Identity</th>
                      <th className="pb-3">Primary Account</th>
                      <th className="pb-3">Submission Timestamp</th>
                      <th className="pb-3">Verification Status</th>
                      <th className="pb-3">Rejection Audit Reason</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                    {submissions.map((sub) => {
                      const primaryAcc = sub.bankAccounts?.find((a: any) => a.isPrimary) || sub.bankAccounts?.[0]
                      const isVerified = sub.isVerified || sub.kycStatus === "VERIFIED"
                      const isPending = sub.kycStatus === "PENDING"
                      const isRejected = sub.kycStatus === "REJECTED"

                      return (
                        <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4">
                            <p className="font-bold text-white">{sub.name}</p>
                            <p className="text-[11px] text-slate-400">{sub.email}</p>
                            {sub.phone && <p className="text-[10px] text-slate-500">{sub.phone}</p>}
                          </td>
                          <td className="py-4 font-mono text-slate-300">
                            {primaryAcc ? `${primaryAcc.accountNumber} (${primaryAcc.bankName})` : "No account"}
                          </td>
                          <td className="py-4 text-slate-400">
                            {new Date(sub.kycSubmittedAt || sub.createdAt).toLocaleString()}
                          </td>
                          <td className="py-4">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                isVerified
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : isPending
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                                  : isRejected
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {isVerified ? "VERIFIED" : isPending ? "PENDING REVIEW" : isRejected ? "REJECTED" : "UNSUBMITTED"}
                            </span>
                          </td>
                          <td className="py-4 max-w-xs truncate text-[11px] text-slate-400 font-sans">
                            {sub.kycRejectionReason || "—"}
                          </td>
                          <td className="py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setSelectedSubmission(sub)
                                setDecisionAction(null)
                              }}
                              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700 inline-flex items-center gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5 text-amber-400" /> Review
                            </button>
                            <button
                              onClick={() => router.push(`/admin/users/${sub.id}`)}
                              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
                            >
                              Profile
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
                  Showing Page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{pagination.totalPages}</strong> (Total <strong className="text-amber-400">{pagination.total}</strong> KYC submissions)
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

        {/* KYC SUBMISSION INSPECTION & DECISION MODAL */}
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedSubmission(null)} />
            <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-slate-950 font-black text-lg">
                    {selectedSubmission.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedSubmission.name}</h3>
                    <p className="text-xs text-slate-400">{selectedSubmission.email} • ID: {selectedSubmission.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Submission Overview Details */}
              <div className="grid gap-4 sm:grid-cols-2 font-semibold text-xs">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Submission Timestamp</span>
                  <p className="text-white font-bold">{new Date(selectedSubmission.kycSubmittedAt || selectedSubmission.createdAt).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Current Verification Status</span>
                  <p className={selectedSubmission.isVerified ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {selectedSubmission.isVerified ? "VERIFIED IDENTITY" : selectedSubmission.kycStatus || "PENDING REVIEW"}
                  </p>
                </div>
              </div>

              {/* Primary Account Overview */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Associated Bank Account</span>
                {selectedSubmission.bankAccounts?.[0] ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{selectedSubmission.bankAccounts[0].accountName} ({selectedSubmission.bankAccounts[0].bankName})</p>
                      <p className="font-mono text-slate-400">NUBAN: {selectedSubmission.bankAccounts[0].accountNumber}</p>
                    </div>
                    <span className="font-black text-amber-400 text-sm">₦{Number(selectedSubmission.bankAccounts[0].balance || 0).toLocaleString()}</span>
                  </div>
                ) : (
                  <p className="text-slate-500">No primary bank account created yet.</p>
                )}
              </div>

              {/* Existing Rejection Reason Notice */}
              {selectedSubmission.kycRejectionReason && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-1 text-xs">
                  <span className="text-rose-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Previous Rejection Reason
                  </span>
                  <p className="text-rose-200">{selectedSubmission.kycRejectionReason}</p>
                </div>
              )}

              {/* DECISION ACTION CONTROLS */}
              <div className="space-y-4 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-black uppercase text-slate-300">Administrator Decision Workflow</h4>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDecisionAction("APPROVE")}
                    className={`flex-1 rounded-2xl p-3 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      decisionAction === "APPROVE"
                        ? "bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20"
                        : "bg-slate-950 border border-slate-800 text-emerald-400 hover:bg-slate-800"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve Verification
                  </button>

                  <button
                    onClick={() => setDecisionAction("REJECT")}
                    className={`flex-1 rounded-2xl p-3 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      decisionAction === "REJECT"
                        ? "bg-rose-500 text-slate-950 font-black shadow-lg shadow-rose-500/20"
                        : "bg-slate-950 border border-slate-800 text-rose-400 hover:bg-slate-800"
                    }`}
                  >
                    <XCircle className="h-4 w-4" /> Reject Verification
                  </button>
                </div>

                {decisionAction === "REJECT" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-xs font-bold text-rose-400">Rejection Reason (Required for Audit Trail):</label>
                    <input
                      type="text"
                      placeholder="Specify reason (e.g. Invalid document upload, Name mismatch)..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full rounded-2xl border border-rose-500/40 bg-slate-950 px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-rose-400"
                    />
                  </div>
                )}

                {decisionAction && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setDecisionAction(null)}
                      disabled={isSubmitting}
                      className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExecuteDecision}
                      disabled={isSubmitting}
                      className={`rounded-2xl px-5 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50 cursor-pointer shadow-lg ${
                        decisionAction === "APPROVE" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-rose-500 hover:bg-rose-400"
                      }`}
                    >
                      {isSubmitting ? "Recording..." : `Confirm & ${decisionAction === "APPROVE" ? "Approve" : "Reject"} Submission`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

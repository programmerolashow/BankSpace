/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Eye,
  RefreshCw,
  FileCheck,
} from "lucide-react"
import { AdminDataTable, ColumnDef } from "@/components/admin/AdminDataTable"
import { ConfirmActionModal } from "@/components/admin/ConfirmActionModal"

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

  // Decision & Confirmation Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [confirmModalAction, setConfirmModalAction] = useState<"APPROVE" | "REJECT" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

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

  const handleDecisionSubmit = async (reason?: string) => {
    if (!selectedSubmission || !confirmModalAction) return

    setIsSubmitting(true)
    setFeedbackMessage(null)

    try {
      const res = await fetch("/api/admin/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedSubmission.id,
          action: confirmModalAction,
          reason,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setFeedbackMessage({ type: "success", text: `KYC submission ${confirmModalAction} decision recorded.` })
        setTimeout(() => {
          setConfirmModalAction(null)
          setSelectedSubmission(null)
          setFeedbackMessage(null)
          fetchKYCSubmissions(page, statusFilter, searchQuery)
        }, 1200)
      } else {
        setFeedbackMessage({ type: "error", text: data.message || "Failed to record compliance decision." })
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Network error occurred." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      key: "name",
      header: "Customer Identity",
      accessor: (user) => (
        <div>
          <p className="font-bold text-white text-xs">{user.name}</p>
          <p className="text-[11px] text-slate-400">{user.email}</p>
        </div>
      ),
    },
    {
      key: "accountNumber",
      header: "Primary NUBAN",
      className: "font-mono text-cyan-400",
      accessor: (user) => user.primaryAccount?.accountNumber || user.bankAccounts?.[0]?.accountNumber || "N/A",
    },
    {
      key: "bvnStatus",
      header: "BVN Verification",
      accessor: (user) => {
        const bvnSt = user.bvnStatus || "UNVERIFIED"
        const masked = user.maskedBvn || (user.bvn ? `${user.bvn.slice(0, 3)}*****${user.bvn.slice(-3)}` : "N/A")
        const isVerified = bvnSt === "VERIFIED"
        const isFailed = bvnSt === "FAILED"

        return (
          <div className="space-y-1">
            <span className="font-mono text-xs text-amber-300 font-bold block">{masked}</span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                isVerified
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : isFailed
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {bvnSt}
            </span>
          </div>
        )
      },
    },
    {
      key: "ninStatus",
      header: "NIN Verification",
      accessor: (user) => {
        const ninSt = user.ninStatus || "UNVERIFIED"
        const masked = user.maskedNin || (user.nin ? `${user.nin.slice(0, 3)}*****${user.nin.slice(-3)}` : "N/A")
        const isVerified = ninSt === "VERIFIED"
        const isFailed = ninSt === "FAILED"

        return (
          <div className="space-y-1">
            <span className="font-mono text-xs text-indigo-300 font-bold block">{masked}</span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                isVerified
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : isFailed
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {ninSt}
            </span>
          </div>
        )
      },
    },
    {
      key: "identityConsistencyStatus",
      header: "Identity Consistency",
      accessor: (user) => {
        const st = user.identityConsistencyStatus || "UNVERIFIED"
        const score = user.identityConsistencyScore || 0

        const isMatch = st === "MATCH"
        const isPartial = st === "PARTIAL_MATCH"
        const isReview = st === "REQUIRES_REVIEW"
        const isMismatch = st === "MISMATCH"

        return (
          <div className="space-y-1">
            <span className="font-mono text-xs font-black text-white">{score}% Match</span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                isMatch
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : isPartial
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : isReview
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : isMismatch
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {st}
            </span>
          </div>
        )
      },
    },
    {
      key: "kycStatus",
      header: "KYC Status",
      accessor: (user) => {
        const isVerified = user.isVerified || user.kycStatus === "VERIFIED"
        const isPending = user.kycStatus === "PENDING"
        const isRejected = user.kycStatus === "REJECTED"

        return (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
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
        )
      },
    },
    {
      key: "createdAt",
      header: "Registration Date",
      className: "font-mono text-[11px] text-slate-400",
      accessor: (user) => new Date(user.createdAt).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* FUNCTIONALITY HEADER & CAPABILITY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-cyan-400" /> Identity Verification & KYC Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Functionality: Audit pending BVN/NIN identity verification submissions, approve or reject submissions with double-submission guarded confirmation modals.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] font-bold">
            <span className="rounded-full bg-cyan-500/10 text-cyan-400 px-3 py-1 border border-cyan-500/20">
              • BVN & NIN Compliance Audit
            </span>
            <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1 border border-emerald-500/20">
              • Mandatory Rationale Rejection Guards
            </span>
            <span className="rounded-full bg-amber-500/10 text-amber-400 px-3 py-1 border border-amber-500/20">
              • Double-Submission Protection Lock
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

      {/* METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Registered Users</span>
          <p className="text-2xl font-black text-white">{metrics.total || 0}</p>
          <p className="text-[11px] font-semibold text-slate-400">Platform Accounts</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Review Queue</span>
          <p className="text-2xl font-black text-amber-400">{metrics.pending || 0}</p>
          <p className="text-[11px] font-semibold text-amber-400">Awaiting Decision</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Customers</span>
          <p className="text-2xl font-black text-emerald-400">{metrics.verified || 0}</p>
          <p className="text-[11px] font-semibold text-emerald-400">Approved & Cleared</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rejected Submissions</span>
          <p className="text-2xl font-black text-rose-400">{metrics.rejected || 0}</p>
          <p className="text-[11px] font-semibold text-rose-400">Declined Verification</p>
        </div>
      </div>

      {/* DATA TABLE SECTION */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-cyan-400" /> Identity Verification Table Sheet
          </h2>
          <p className="text-xs text-slate-400">Standardized search, status filtering, and compliance decision triggers</p>
        </div>

        <AdminDataTable<any>
          columns={columns}
          data={submissions}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q)
            setPage(1)
            fetchKYCSubmissions(1, statusFilter, q)
          }}
          searchPlaceholder="Search customer name, email, NUBAN..."
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: (val) => {
                setStatusFilter(val)
                setPage(1)
                fetchKYCSubmissions(1, val, searchQuery)
              },
              options: [
                { label: "All Submissions", value: "ALL" },
                { label: "PENDING Review Queue", value: "PENDING" },
                { label: "VERIFIED Compliance", value: "VERIFIED" },
                { label: "REJECTED Submissions", value: "REJECTED" },
              ],
            },
          ]}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            totalItems: pagination.total,
            hasNextPage: pagination.hasNextPage,
            hasPrevPage: pagination.hasPrevPage,
            onPageChange: (newP) => {
              setPage(newP)
              fetchKYCSubmissions(newP, statusFilter, searchQuery)
            },
          }}
          renderRowActions={(user) => (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedSubmission(user)
                  setConfirmModalAction("APPROVE")
                }}
                className="rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  setSelectedSubmission(user)
                  setConfirmModalAction("REJECT")
                }}
                className="rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
              >
                Reject
              </button>
            </div>
          )}
        />
      </section>

      {/* CONFIRMATION DIALOG MODAL WITH DOUBLE-SUBMISSION GUARD */}
      {selectedSubmission && confirmModalAction && (
        <ConfirmActionModal
          isOpen={!!confirmModalAction}
          onClose={() => {
            if (!isSubmitting) {
              setConfirmModalAction(null)
              setSelectedSubmission(null)
              setFeedbackMessage(null)
            }
          }}
          onConfirm={handleDecisionSubmit}
          title={
            confirmModalAction === "APPROVE"
              ? "Approve Customer Identity Verification"
              : "Reject Customer Identity Verification"
          }
          actionLabel={
            confirmModalAction === "APPROVE" ? "Confirm KYC Approval" : "Confirm KYC Rejection"
          }
          actionType={confirmModalAction === "APPROVE" ? "INFO" : "DANGER"}
          affectedEntityName={selectedSubmission.name}
          affectedEntityId={selectedSubmission.email}
          consequenceWarning={
            confirmModalAction === "APPROVE"
              ? "Approving this KYC submission will unlock full outbound interbank transfer capabilities and grant verified status to the user."
              : "Rejecting this submission will block the customer from making outbound interbank transfers until a new valid identity document is provided."
          }
          requireReason={confirmModalAction === "REJECT"}
          reasonLabel={
            confirmModalAction === "REJECT"
              ? "Mandatory Rejection Rationale"
              : "Approval Audit Rationale (Optional)"
          }
          reasonPlaceholder={
            confirmModalAction === "REJECT"
              ? "Specify explicit reason for rejection (e.g., Unclear BVN document, Name mismatch)..."
              : "Optional compliance audit notes..."
          }
          isProcessing={isSubmitting}
          feedbackMessage={feedbackMessage}
        />
      )}
    </div>
  )
}

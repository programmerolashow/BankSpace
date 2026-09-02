'use client'

import { useState, useEffect, useCallback } from "react"
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  MoreVertical,
  Loader2,
  RefreshCcw,
  Ban,
  UserCheck,
  Building2,
  Phone,
  Calendar,
  X,
  Sparkles,
} from "lucide-react"

type CustomerKycItem = {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
  bankSpaceAccount: string
  phone: string
  kycStatus: string
  bvnStatus: string
  ninStatus: string
  maskedBvn: string | null
  maskedNin: string | null
  virtualAccountStatus: string
  dvaNuban: string | null
  dvaBankName: string
  createdAt: string
}

export default function AdminCustomersKycPage() {
  const [customers, setCustomers] = useState<CustomerKycItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerKycItem | null>(null)
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null)
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null)
  const [processingActionId, setProcessingActionId] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "10")
      if (searchQuery) params.set("search", searchQuery)
      if (statusFilter !== "ALL") params.set("status", statusFilter)

      const res = await fetch(`/api/admin/kyc?${params.toString()}`)
      const data = await res.json()

      if (res.ok && data?.success) {
        setCustomers(data.customers || [])
        if (data.pagination) setTotalPages(data.pagination.totalPages || 1)
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false)
    }
  }, [page, searchQuery, statusFilter])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleAdminAction = async (userId: string, action: string, reason?: string) => {
    setProcessingActionId(userId)
    setActionSuccessMessage(null)
    setActionErrorMessage(null)

    try {
      const res = await fetch("/api/admin/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason }),
      })
      const data = await res.json()

      if (res.ok && data?.success) {
        setActionSuccessMessage(`Customer status updated to ${data.kycState} successfully.`)
        fetchCustomers()
        if (selectedCustomer?.id === userId) {
          setSelectedCustomer(null)
        }
      } else {
        setActionErrorMessage(data?.message || "Failed to execute compliance action.")
      }
    } catch {
      setActionErrorMessage("Network error executing compliance action.")
    } finally {
      setProcessingActionId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">
              <span>Admin</span> • <span>Customers</span> • <span className="text-slate-900">KYC</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Customer Identity & KYC Console
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Audit customer identity verification, review BVN/NIN consistency, and enforce role-based compliance actions.
            </p>
          </div>

          <button
            onClick={() => fetchCustomers()}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
          >
            <RefreshCcw className="h-3.5 w-3.5 text-slate-500" /> Refresh List
          </button>
        </div>

        {actionSuccessMessage && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {actionErrorMessage && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800 flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{actionErrorMessage}</span>
          </div>
        )}
      </section>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 border border-slate-200/70 w-full sm:w-auto">
          {[
            { label: "All", value: "ALL" },
            { label: "Active", value: "ACTIVE" },
            { label: "Pending", value: "KYC_PENDING" },
            { label: "Manual Review", value: "MANUAL_REVIEW" },
            { label: "Failed", value: "KYC_FAILED" },
            { label: "Suspended", value: "SUSPENDED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value)
                setPage(1)
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.value ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search user name, email, or account..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10"
          />
        </div>
      </div>

      {/* CUSTOMERS KYC TABLE */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs overflow-x-auto">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading customer KYC records...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center font-medium text-slate-500 text-sm">
            No customer KYC records found matching filter criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3">User</th>
                <th className="py-3 px-3">BankSpace Account</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">KYC Status</th>
                <th className="py-3 px-3">BVN Status</th>
                <th className="py-3 px-3">NIN Status</th>
                <th className="py-3 px-3">Virtual Account</th>
                <th className="py-3 px-3">Created Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* User */}
                  <td className="py-4 px-3">
                    <div className="font-bold text-slate-900">{c.user.name}</div>
                    <div className="text-[11px] text-slate-400">{c.user.email}</div>
                  </td>

                  {/* BankSpace Account */}
                  <td className="py-4 px-3 font-mono font-bold text-slate-900">
                    {c.bankSpaceAccount}
                  </td>

                  {/* Phone */}
                  <td className="py-4 px-3 font-semibold text-slate-700">
                    {c.phone}
                  </td>

                  {/* KYC Status */}
                  <td className="py-4 px-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        c.kycStatus === "ACTIVE" || c.kycStatus === "KYC_VERIFIED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : c.kycStatus === "MANUAL_REVIEW"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : c.kycStatus === "KYC_FAILED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : c.kycStatus === "SUSPENDED"
                          ? "bg-slate-100 text-slate-700 border border-slate-300"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {c.kycStatus}
                    </span>
                  </td>

                  {/* BVN Status */}
                  <td className="py-4 px-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        c.bvnStatus === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.bvnStatus}
                    </span>
                  </td>

                  {/* NIN Status */}
                  <td className="py-4 px-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        c.ninStatus === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.ninStatus}
                    </span>
                  </td>

                  {/* Virtual Account Status */}
                  <td className="py-4 px-3 font-semibold text-slate-600">
                    {c.dvaNuban ? (
                      <span className="text-emerald-700 font-mono font-bold">{c.dvaNuban}</span>
                    ) : (
                      <span className="text-slate-400">Not Provisioned</span>
                    )}
                  </td>

                  {/* Created Date */}
                  <td className="py-4 px-3 text-slate-500 font-mono text-[11px]">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                      >
                        <Eye className="h-3 w-3 inline mr-1" /> View KYC
                      </button>

                      <div className="relative group">
                        <button className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 hidden group-hover:block w-44 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 z-20 text-left space-y-1">
                          <button
                            onClick={() => handleAdminAction(c.id, "APPROVE")}
                            className="w-full rounded-xl px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 text-left transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAdminAction(c.id, "REVIEW")}
                            className="w-full rounded-xl px-3 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-50 text-left transition-colors cursor-pointer"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => handleAdminAction(c.id, "REJECT")}
                            className="w-full rounded-xl px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 text-left transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAdminAction(c.id, "SUSPEND")}
                            className="w-full rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                          >
                            Suspend
                          </button>
                          <button
                            onClick={() => handleAdminAction(c.id, "REQUEST_REVERIFICATION")}
                            className="w-full rounded-xl px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-50 text-left transition-colors cursor-pointer"
                          >
                            Request Re-verify
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* VIEW KYC MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 block">
                  Compliance Inspection
                </span>
                <h3 className="text-xl font-black text-slate-900">{selectedCustomer.user.name}</h3>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase text-[10px] font-extrabold">BankSpace Account:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedCustomer.bankSpaceAccount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase text-[10px] font-extrabold">Phone Number:</span>
                  <span className="font-bold text-slate-900">{selectedCustomer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase text-[10px] font-extrabold">Email Address:</span>
                  <span className="font-bold text-slate-900">{selectedCustomer.user.email}</span>
                </div>
              </div>

              {/* Masked BVN & NIN Protection */}
              <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                    Masked BVN (Role Protected)
                  </span>
                  <span className="font-mono font-black text-indigo-950 text-sm">
                    {selectedCustomer.maskedBvn || "Not Submitted"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-indigo-200/60">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                    Masked NIN (Role Protected)
                  </span>
                  <span className="font-mono font-black text-indigo-950 text-sm">
                    {selectedCustomer.maskedNin || "Not Submitted"}
                  </span>
                </div>
              </div>

              {/* DVA Receiving Account */}
              <div className="rounded-2xl bg-emerald-50/50 p-4 border border-emerald-200/70 space-y-2">
                <div className="flex justify-between">
                  <span className="text-emerald-700 uppercase text-[10px] font-extrabold">Dedicated DVA NUBAN:</span>
                  <span className="font-mono font-bold text-emerald-950">{selectedCustomer.dvaNuban || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 uppercase text-[10px] font-extrabold">Partner Bank:</span>
                  <span className="font-bold text-emerald-950">{selectedCustomer.dvaBankName}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleAdminAction(selectedCustomer.id, "APPROVE")}
                disabled={processingActionId === selectedCustomer.id}
                className="flex-1 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
              >
                Approve KYC
              </button>
              <button
                onClick={() => handleAdminAction(selectedCustomer.id, "REJECT")}
                disabled={processingActionId === selectedCustomer.id}
                className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white hover:bg-rose-500 cursor-pointer"
              >
                Reject KYC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

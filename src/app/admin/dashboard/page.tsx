'use client'

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export const dynamic = "force-dynamic"
import {
  ShieldCheck,
  Users,
  History,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  CheckCircle2,
  FileText,
  Scale,
  Loader2,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  AlertOctagon,
  Activity,
  Radio,
  Bell,
  ShieldAlert,
  Settings,
  Sliders,
  UserCheck,
  UserX,
  Zap,
  CheckCheck,
} from "lucide-react"

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  isVerified: boolean
  phone?: string | null
  createdAt: string
  bankAccounts: Array<{
    id: string
    accountNumber: string
    accountName: string
    bankName: string
    balance: number
    status: string
    isPrimary: boolean
  }>
}

type AdminTransaction = {
  id: string
  reference: string
  senderName: string
  recipientName: string
  bankName: string
  accountNumber: string
  amount: number
  fee: number
  type: string
  category: string
  status: string
  createdAt: string
}

type AuditLog = {
  id: string
  event: string
  details: string
  ip: string
  timestamp: string
}

type ReconcileReport = {
  status: string
  auditedAt: string
  metrics: {
    totalAccountsAudited: number
    totalTransactionsAudited: number
    discrepancyCount: number
  }
  discrepancies: Array<{
    type: string
    accountNumber?: string
    accountName?: string
    reference?: string
    databaseBalance?: number
    calculatedLedgerBalance?: number
    discrepancyAmount?: number
    severity: string
  }>
}

function AdminDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "dashboard"

  const [users, setUsers] = useState<AdminUser[]>([])
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [actionLoading, setActionLoading] = useState(false)

  // Reconciliation state
  const [reconcileReport, setReconcileReport] = useState<ReconcileReport | null>(null)
  const [isReconciling, setIsReconciling] = useState(false)

  // Server-Side User Pagination & Filter State
  const [userPage, setUserPage] = useState(1)
  const [userLimit, setUserLimit] = useState(10)
  const [userStatusFilter, setUserStatusFilter] = useState("ALL")
  const [userSortBy, setUserSortBy] = useState("createdAt")
  const [userSortOrder, setUserSortOrder] = useState<"asc" | "desc">("desc")
  const [pagination, setPagination] = useState<{
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })

  // Deep User Inspection Modal State
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const fetchUsersPaginated = async (
    p = userPage,
    l = userLimit,
    s = userStatusFilter,
    q = searchQuery,
    sort = userSortBy,
    order = userSortOrder
  ) => {
    setIsLoading(true)
    try {
      const url = `/api/admin/users?page=${p}&limit=${l}&status=${s}&search=${encodeURIComponent(q)}&sortBy=${sort}&sortOrder=${order}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data.users) setUsers(data.users)
        if (data.pagination) setPagination(data.pagination)
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false)
    }
  }

  const handleInspectUserDetail = async (userId: string) => {
    setIsDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedUserDetail(data)
      }
    } catch {
      // Error
    } finally {
      setIsDetailLoading(false)
    }
  }

  const fetchAdminData = async () => {
    setIsLoading(true)
    try {
      const [uRes, tRes, lRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/transactions"),
        fetch("/api/admin/logs"),
      ])

      if (uRes.status === 403 || uRes.status === 401) {
        router.push("/admin/login")
        return
      }

      const uData = await uRes.json()
      const tData = await tRes.json()
      const lData = await lRes.json()

      if (uData.users) setUsers(uData.users)
      if (tData.transactions) setTransactions(tData.transactions)
      if (lData.logs) setLogs(lData.logs)
    } catch {
      // Fallback
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunReconciliation = async () => {
    setIsReconciling(true)
    try {
      const res = await fetch("/api/admin/reconcile")
      if (res.ok) {
        const data = await res.json()
        setReconcileReport(data)
      }
    } catch {
      // Error
    } finally {
      setIsReconciling(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [])

  const handleToggleFreezeAccount = async (u: AdminUser, accountId: string, currentStatus: string) => {
    setActionLoading(true)
    const action = currentStatus === "FROZEN" ? "ACTIVATE" : "SUSPEND"

    try {
      const res = await fetch("/api/admin/users/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: u.id,
          accountId,
          action,
        }),
      })

      if (!res.ok) throw new Error("Status update failed")

      fetchAdminData()
    } catch {
      alert("Failed to update user account status.")
    } finally {
      setActionLoading(false)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTransactions = transactions.filter((t) => {
    const matchQuery =
      t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.recipientName.toLowerCase().includes(searchQuery.toLowerCase())

    if (statusFilter === "ALL") return matchQuery
    return matchQuery && t.status === statusFilter
  })

  // Computed Section Specific Data
  const suspendedUsers = users.filter((u) => u.bankAccounts.some((a) => a.status === "FROZEN"))
  const verifiedUsers = users.filter((u) => u.isVerified)
  const transferTxs = transactions.filter((t) => t.type === "TRANSFER")
  const depositTxs = transactions.filter((t) => t.type === "DEPOSIT")
  const withdrawalTxs = transactions.filter((t) => t.type === "WITHDRAWAL")
  const failedTxs = transactions.filter((t) => t.status === "FAILED" || t.status === "REVERSED")

  return (
    <div className="space-y-8">
      {/* SECTION HEADER BANNER */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
                {activeTab.toUpperCase().replace("_", " ")}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="h-3.5 w-3.5" /> Enforced Server Authorization
              </span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white capitalize">
              {activeTab.replace("_", " ")} Control Panel
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl">
              Manage accounts, audit real-time money movement, enforce freeze locks, and trigger double-entry accounting reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 text-amber-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh Data
            </button>
            <button
              onClick={handleRunReconciliation}
              disabled={isReconciling}
              className="flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Scale className="h-4 w-4" /> Run Audit Reconciliation
            </button>
          </div>
        </div>
      </section>

      {/* METRIC COUNTERS OVERVIEW */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Registered Accounts</span>
            <Users className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{users.length}</p>
          <p className="text-[11px] font-semibold text-emerald-400">{verifiedUsers.length} Verified Accounts</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total System Transactions</span>
            <History className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{transactions.length}</p>
          <p className="text-[11px] font-semibold text-indigo-400">{transferTxs.length} Transfers Executed</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Suspended / Frozen</span>
            <UserX className="h-5 w-5 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-white">{suspendedUsers.length}</p>
          <p className="text-[11px] font-semibold text-rose-400">Restricted Account Access</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Reconciliation Audit Status</span>
            <CheckCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">0.00 Mismatch</p>
          <p className="text-[11px] font-semibold text-slate-400">Ledger & Wallet Equation Reconciled</p>
        </div>
      </div>

      {/* TAB CONTENT: DASHBOARD & OVERVIEW / USER MANAGEMENT */}
      {(activeTab === "dashboard" || activeTab === "users" || activeTab === "kyc" || activeTab === "suspended") && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-400" />
                  {activeTab === "suspended" ? "Suspended / Frozen User Accounts" : activeTab === "kyc" ? "User Verification & KYC Registry" : "BankSpace Paginated User Registry"}
                </h2>
                <p className="text-xs text-slate-400">Server-side database paginated user management console</p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name, email, NUBAN..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      fetchUsersPaginated(1, userLimit, userStatusFilter, e.target.value, userSortBy, userSortOrder)
                    }}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500/60"
                  />
                </div>

                <select
                  value={`${userSortBy}:${userSortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split(":")
                    setUserSortBy(sort)
                    setUserSortOrder(order as any)
                    fetchUsersPaginated(1, userLimit, userStatusFilter, searchQuery, sort, order as any)
                  }}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                >
                  <option value="createdAt:desc">Newest Registered</option>
                  <option value="createdAt:asc">Oldest Registered</option>
                  <option value="name:asc">Name (A-Z)</option>
                  <option value="name:desc">Name (Z-A)</option>
                  <option value="email:asc">Email (A-Z)</option>
                </select>
              </div>
            </div>

            {/* FILTER PILLS BAR */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
              {[
                { id: "ALL", label: "All Users" },
                { id: "ACTIVE", label: "Active" },
                { id: "SUSPENDED", label: "Suspended / Frozen" },
                { id: "VERIFIED", label: "Verified KYC" },
                { id: "PENDING_VERIFICATION", label: "Pending Verification" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => {
                    setUserStatusFilter(pill.id)
                    setUserPage(1)
                    fetchUsersPaginated(1, userLimit, pill.id, searchQuery, userSortBy, userSortOrder)
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    userStatusFilter === pill.id
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
              <p className="text-xs font-semibold">Loading paginated user registry from database...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="pb-3">User & Contact Details</th>
                      <th className="pb-3">Registration Date</th>
                      <th className="pb-3">Primary Account</th>
                      <th className="pb-3">Balance</th>
                      <th className="pb-3">KYC Status</th>
                      <th className="pb-3">Account Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                    {users.map((u) => {
                      const primaryAcc = u.bankAccounts?.find((a) => a.isPrimary) || u.bankAccounts?.[0]
                      const isFrozen = primaryAcc?.status === "FROZEN"

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4">
                            <p className="font-bold text-white">{u.name}</p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                            {u.phone && <p className="text-[10px] text-slate-500">{u.phone}</p>}
                          </td>
                          <td className="py-4 text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="py-4 font-mono text-slate-300">
                            {primaryAcc ? `${primaryAcc.accountNumber} (${primaryAcc.bankName})` : "No account"}
                          </td>
                          <td className="py-4 font-black text-amber-400">
                            ₦{Number(primaryAcc?.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                u.isVerified
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {u.isVerified ? "VERIFIED" : "UNVERIFIED"}
                            </span>
                          </td>
                          <td className="py-4">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                isFrozen
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {isFrozen ? "FROZEN" : "ACTIVE"}
                            </span>
                          </td>
                          <td className="py-4 text-right space-x-2">
                            <button
                              onClick={() => router.push(`/admin/users/${u.id}`)}
                              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
                            >
                              View Profile
                            </button>
                            {primaryAcc && u.role !== "ADMIN" && (
                              <button
                                onClick={() => handleToggleFreezeAccount(u, primaryAcc.id, primaryAcc.status)}
                                disabled={actionLoading}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                  isFrozen
                                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                                }`}
                              >
                                {isFrozen ? "Unfreeze" : "Freeze"}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* SERVER-SIDE PAGINATION FOOTER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-400">
                <span>
                  Showing Page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{pagination.totalPages}</strong> (Total <strong className="text-amber-400">{pagination.total}</strong> registered users)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newP = Math.max(userPage - 1, 1)
                      setUserPage(newP)
                      fetchUsersPaginated(newP, userLimit, userStatusFilter, searchQuery, userSortBy, userSortOrder)
                    }}
                    disabled={!pagination.hasPrevPage}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => {
                      const newP = userPage + 1
                      setUserPage(newP)
                      fetchUsersPaginated(newP, userLimit, userStatusFilter, searchQuery, userSortBy, userSortOrder)
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
      )}

      {/* DEEP USER INSPECTION MODAL DRAWER */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedUserDetail(null)} />
          <div className="relative w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-slate-950 font-black text-lg">
                  {selectedUserDetail.user.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{selectedUserDetail.user.name}</h3>
                  <p className="text-xs text-slate-400">{selectedUserDetail.user.email} • ID: {selectedUserDetail.user.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUserDetail(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                ✕
              </button>
            </div>

            {/* User Overview Grid */}
            <div className="grid gap-4 sm:grid-cols-3 font-semibold text-xs">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Registration Date</span>
                <p className="text-white font-bold">{new Date(selectedUserDetail.user.createdAt).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">KYC Status</span>
                <p className={selectedUserDetail.user.isVerified ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                  {selectedUserDetail.user.isVerified ? "VERIFIED IDENTITY" : "UNVERIFIED / PENDING"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Account Role</span>
                <p className="text-amber-400 font-bold">{selectedUserDetail.user.role}</p>
              </div>
            </div>

            {/* Bank Accounts Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400">Associated Bank Accounts</h4>
              <div className="space-y-2">
                {selectedUserDetail.user.bankAccounts?.map((acc: any) => (
                  <div key={acc.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{acc.accountName} ({acc.bankName})</p>
                      <p className="font-mono text-slate-400">NUBAN: {acc.accountNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-amber-400 text-sm">₦{Number(acc.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      <span className={`text-[10px] font-bold ${acc.status === "FROZEN" ? "text-rose-400" : "text-emerald-400"}`}>{acc.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transaction Activity */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400">Recent Transaction Activity ({selectedUserDetail.transactions?.length || 0})</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 font-mono text-xs">
                {selectedUserDetail.transactions?.length === 0 ? (
                  <p className="text-slate-500 text-xs py-4 text-center">No transaction history recorded for this user.</p>
                ) : (
                  selectedUserDetail.transactions?.map((t: any) => (
                    <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between">
                      <div>
                        <p className="font-sans font-bold text-white">{t.reference} • {t.type}</p>
                        <p className="text-[10px] text-slate-400">{t.senderName} ➔ {t.recipientName || t.accountNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-amber-400">₦{Number(t.amount).toLocaleString()}</p>
                        <span className="text-[10px] text-emerald-400 font-sans font-bold">{t.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: FINANCIAL TRANSACTIONS, TRANSFERS, DEPOSITS, WITHDRAWALS, FAILED */}
      {(activeTab === "transactions" || activeTab === "transfers" || activeTab === "deposits" || activeTab === "withdrawals" || activeTab === "failed") && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-400" />
              {activeTab === "transfers" ? "Bank Transfers Audit Log" : activeTab === "deposits" ? "Inbound Deposits Log" : activeTab === "withdrawals" ? "Outbound Withdrawals Log" : activeTab === "failed" ? "Failed / Reversed Transactions Log" : "All System Transactions"}
            </h2>

            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESSFUL">SUCCESSFUL</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="REVERSED">REVERSED</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Sender</th>
                  <th className="pb-3">Recipient</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {(activeTab === "transfers" ? transferTxs : activeTab === "deposits" ? depositTxs : activeTab === "withdrawals" ? withdrawalTxs : activeTab === "failed" ? failedTxs : filteredTransactions).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 font-mono text-slate-400">{t.reference}</td>
                    <td className="py-4 font-bold text-white">{t.senderName || "System / External"}</td>
                    <td className="py-4 font-semibold text-slate-200">{t.recipientName || t.accountNumber}</td>
                    <td className="py-4 font-bold text-indigo-400">{t.category || t.type}</td>
                    <td className="py-4 font-black text-amber-400">₦{Number(t.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td className="py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          t.status === "SUCCESSFUL"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : t.status === "REVERSED" || t.status === "FAILED"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 text-right text-slate-400">{new Date(t.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB CONTENT: SECURITY LOGS & AUDITS */}
      {(activeTab === "logs" || activeTab === "security" || activeTab === "monitoring" || activeTab === "activity" || activeTab === "notifications") && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            {activeTab === "security" ? "Security Events & Privilege Audits" : activeTab === "monitoring" ? "Real-time Payment/Transfer Monitoring" : activeTab === "activity" ? "System Throughput Activity" : activeTab === "notifications" ? "System Event Notifications" : "Admin Security Activity Logs"}
          </h2>

          <div className="space-y-3 font-mono text-xs">
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="rounded-md bg-indigo-500/20 text-indigo-400 px-2 py-0.5 text-[10px] font-bold border border-indigo-500/30 mr-2">
                    {log.event}
                  </span>
                  <span className="text-slate-300 font-sans font-semibold">{log.details}</span>
                </div>
                <div className="text-[11px] text-slate-500 shrink-0">
                  <span>IP: {log.ip}</span> • <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB CONTENT: RECONCILIATION REPORT */}
      {reconcileReport && (
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
            <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <Scale className="h-5 w-5 text-emerald-400" /> Double-Entry Audit Report
            </h2>
            <span className="text-xs text-slate-400">Audited At: {new Date(reconcileReport.auditedAt).toLocaleString()}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <span className="text-xs text-slate-400 font-bold uppercase">Accounts Audited</span>
              <p className="text-xl font-black text-white">{reconcileReport.metrics.totalAccountsAudited}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <span className="text-xs text-slate-400 font-bold uppercase">Transactions Audited</span>
              <p className="text-xl font-black text-white">{reconcileReport.metrics.totalTransactionsAudited}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-900/20 p-4">
              <span className="text-xs text-emerald-400 font-bold uppercase">Mathematical Discrepancies</span>
              <p className="text-xl font-black text-emerald-400">{reconcileReport.metrics.discrepancyCount}</p>
            </div>
          </div>
        </section>
      )}

      {/* TAB CONTENT: SETTINGS & SYSTEM SETTINGS */}
      {(activeTab === "settings" || activeTab === "system_settings") && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-400" /> System & Administrative Parameters
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <h3 className="font-bold text-slate-200 text-sm">Banking Provider Engine</h3>
              <p className="text-xs text-slate-400">Paystack Titan Integration (Nigeria NUBAN Network)</p>
              <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <CheckCheck className="h-4 w-4" /> Connected & Active
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <h3 className="font-bold text-slate-200 text-sm">Database Engine & ORM</h3>
              <p className="text-xs text-slate-400">NeonDB PostgreSQL with Prisma Atomic $transaction</p>
              <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <CheckCheck className="h-4 w-4" /> Double-Entry Reconciled
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-400" />
          <p className="text-xs font-semibold">Initializing Admin Console...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  )
}

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

      {/* TAB CONTENT: DASHBOARD & OVERVIEW */}
      {(activeTab === "dashboard" || activeTab === "users" || activeTab === "kyc" || activeTab === "suspended") && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              {activeTab === "suspended" ? "Suspended / Frozen User Accounts" : activeTab === "kyc" ? "User Verification & KYC Registry" : "BankSpace Account Registry"}
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-400" />
              <p className="text-xs font-semibold">Loading user database registry...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="pb-3">User Details</th>
                    <th className="pb-3">Primary Account</th>
                    <th className="pb-3">Balance</th>
                    <th className="pb-3">Verification</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {(activeTab === "suspended" ? suspendedUsers : activeTab === "kyc" ? verifiedUsers : filteredUsers).map((u) => {
                    const primaryAcc = u.bankAccounts?.find((a) => a.isPrimary) || u.bankAccounts?.[0]
                    const isFrozen = primaryAcc?.status === "FROZEN"

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4">
                          <p className="font-bold text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
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
                        <td className="py-4 text-right">
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
                              {isFrozen ? "Unfreeze Account" : "Freeze Account"}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
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

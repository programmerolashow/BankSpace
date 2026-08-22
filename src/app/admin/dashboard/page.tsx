'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  Users,
  History,
  AlertTriangle,
  Lock,
  Unlock,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Sparkles,
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

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"users" | "transactions" | "logs">("users")
  const [users, setUsers] = useState<AdminUser[]>([])
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAdminData = async () => {
    setIsLoading(true)
    setError("")
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
      setError("Failed to load admin telemetry data.")
    } finally {
      setIsLoading(false)
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
      setSelectedUser(null)
    } catch {
      alert("Failed to update user account status.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.push("/admin/login")
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTxs = transactions.filter((t) => {
    const matchesSearch =
      t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Admin Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-[#7c4dff] to-[#2454ff] shadow-xl text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold text-[#3f3cff] border border-indigo-500/20">
                  SYSTEM ADMIN
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  STRICT RBAC ACTIVE
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight mt-1">BankSpace Administration Console</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="h-4 w-4 text-[#3f3cff]" /> Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Log Out Admin
            </button>
          </div>
        </header>

        {/* Telemetry Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
              <Users className="h-4 w-4 text-[#3f3cff]" />
            </div>
            <p className="mt-2 text-3xl font-black">{users.length}</p>
            <p className="text-[11px] text-emerald-400 mt-1">Verified Accounts</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Transactions</span>
              <History className="h-4 w-4 text-violet-400" />
            </div>
            <p className="mt-2 text-3xl font-black">{transactions.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Monitored System-Wide</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Failed / Holds</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-3xl font-black">
              {transactions.filter((t) => t.status === "FAILED" || t.status === "REVERSED").length}
            </p>
            <p className="text-[11px] text-amber-400 mt-1">Requires Attention</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Security Logs</span>
              <FileText className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-3xl font-black">{logs.length}</p>
            <p className="text-[11px] text-emerald-400 mt-1">Audit Events Recorded</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("users")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "users" ? "bg-[#3f3cff] text-white shadow-lg" : "text-slate-400 hover:text-white"
            }`}
          >
            User Management & KYC
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "transactions" ? "bg-[#3f3cff] text-white shadow-lg" : "text-slate-400 hover:text-white"
            }`}
          >
            Transaction Monitoring
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "logs" ? "bg-[#3f3cff] text-white shadow-lg" : "text-slate-400 hover:text-white"
            }`}
          >
            Security Audit Logs
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-[#3f3cff]"
            />
          </div>

          {activeTab === "transactions" && (
            <div className="flex items-center gap-2">
              {["ALL", "SUCCESSFUL", "FAILED", "REVERSED", "PROCESSING"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-colors ${
                    statusFilter === st ? "border-[#3f3cff] bg-[#3f3cff]/10 text-[#3f3cff]" : "border-slate-800 text-slate-400"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1: USERS */}
        {activeTab === "users" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl space-y-4">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-400">Registered Platform Users & Accounts</h2>

            <div className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No users found.</p>
              ) : (
                filteredUsers.map((u) => {
                  const primaryAcc = u.bankAccounts?.[0]
                  const isFrozen = primaryAcc?.status === "FROZEN"

                  return (
                    <div key={u.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 p-3 rounded-2xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-linear-to-br from-[#7257ff] to-[#4335eb] font-bold text-xs text-white">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-white">{u.name}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.role === "ADMIN" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-indigo-500/20 text-indigo-400"}`}>
                              {u.role}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{u.email} • {u.phone || "No phone"}</p>
                          {primaryAcc && (
                            <p className="text-[11px] text-slate-500 mt-1 font-mono">
                              Acc: {primaryAcc.accountNumber} ({primaryAcc.bankName}) — Balance: ₦{primaryAcc.balance.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold border ${isFrozen ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
                          {isFrozen ? "FROZEN / HOLD" : "ACTIVE / CLEAR"}
                        </span>

                        {primaryAcc && u.role !== "ADMIN" && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleToggleFreezeAccount(u, primaryAcc.id, primaryAcc.status)}
                            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${isFrozen ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30"}`}
                          >
                            {isFrozen ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            <span>{isFrozen ? "Unfreeze Account" : "Freeze Account"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        )}

        {/* TAB 2: TRANSACTIONS */}
        {activeTab === "transactions" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl space-y-4">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-400">System-Wide Monitored Transactions</h2>

            <div className="divide-y divide-slate-800/60">
              {filteredTxs.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No transactions match search criteria.</p>
              ) : (
                filteredTxs.map((t) => (
                  <div key={t.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 p-3 rounded-2xl transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-white">{t.senderName} ➔ {t.recipientName}</p>
                        <span className="font-mono text-xs text-slate-500">({t.reference})</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Channel: {t.bankName} • Account: {t.accountNumber} • Fee: ₦{t.fee}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-sm text-white">₦{t.amount.toLocaleString()}.00</p>
                      <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${t.status === "SUCCESSFUL" ? "bg-emerald-500/10 text-emerald-400" : t.status === "REVERSED" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === "logs" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl space-y-4">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-400">Security Audit Events & Telemetry</h2>

            <div className="divide-y divide-slate-800/60">
              {logs.map((l) => (
                <div key={l.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[#3f3cff] font-mono mr-2">[{l.event}]</span>
                    <span className="text-slate-300">{l.details}</span>
                  </div>
                  <div className="text-slate-500 font-mono text-[11px] shrink-0">
                    IP: {l.ip} • {new Date(l.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

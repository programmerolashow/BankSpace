/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  User,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  History,
  Activity,
  UserX,
  UserCheck,
  AlertTriangle,
  Loader2,
  Clock,
  Mail,
  Phone,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react"

export default function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const userId = resolvedParams.id
  const router = useRouter()

  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Confirmation Modal State
  const [confirmModalAction, setConfirmModalAction] = useState<"SUSPEND" | "ACTIVATE" | "VERIFY" | "UNVERIFY" | null>(null)
  const [actionReason, setActionReason] = useState("")
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  const fetchUserProfile = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
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
        setUserData(data)
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserProfile()
  }, [userId])

  const handleExecuteAction = async () => {
    if (!confirmModalAction) return
    setIsSubmittingAction(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirmModalAction,
          reason: actionReason,
        }),
      })

      if (res.ok) {
        setConfirmModalAction(null)
        setActionReason("")
        await fetchUserProfile()
      } else {
        alert("Failed to execute administrative action.")
      }
    } catch {
      alert("An error occurred while performing administrative action.")
    } finally {
      setIsSubmittingAction(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-amber-400" />
        <p className="text-sm font-semibold">Loading detailed user profile & activity records...</p>
      </div>
    )
  }

  if (!userData?.user) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-4">
        <UserX className="h-12 w-12 mx-auto text-rose-400" />
        <h2 className="text-xl font-bold text-white">User Record Not Found</h2>
        <button
          onClick={() => router.push("/admin/dashboard?tab=users")}
          className="rounded-2xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
        >
          Return to User Registry
        </button>
      </div>
    )
  }

  const { user, transactions = [], transfers = [], logs = [], metrics = {} } = userData
  const primaryAcc = user.bankAccounts?.find((a: any) => a.isPrimary) || user.bankAccounts?.[0]
  const isFrozen = primaryAcc?.status === "FROZEN"

  return (
    <div className="space-y-8 pb-12">
        {/* TOP NAVIGATION BREADCRUMB & FUNCTIONALITY HEADER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/admin/dashboard?tab=users")}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-amber-400" /> Back to User Registry
            </button>
            <span className="text-xs font-mono text-slate-500">ID: {user.id}</span>
          </div>

          <div className="border-b border-slate-800 pb-4">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <User className="h-6 w-6 text-amber-400" /> User Identity & Administrative Security Controls
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Functionality: Inspect customer NUBAN accounts, identity compliance, activity logs, and execute confirmation-guarded administrative actions.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-bold">
              <span className="rounded-full bg-amber-500/10 text-amber-400 px-3 py-1 border border-amber-500/20">
                • NUBAN Accounts & Financial Balances
              </span>
              <span className="rounded-full bg-cyan-500/10 text-cyan-400 px-3 py-1 border border-cyan-500/20">
                • KYC Compliance History
              </span>
              <span className="rounded-full bg-rose-500/10 text-rose-400 px-3 py-1 border border-rose-500/20">
                • Confirmation-Guarded Administrative Suspend/Activate
              </span>
            </div>
          </div>
        </div>

        {/* PROFILE HEADER CARD */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20">
                {user.name[0]?.toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-black text-white">{user.name}</h1>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                      isFrozen
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {isFrozen ? "ACCOUNT FROZEN" : "ACCOUNT ACTIVE"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                      user.isVerified
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {user.isVerified ? "VERIFIED KYC" : "UNVERIFIED"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-500" /> {user.email}
                  {user.phone && (
                    <>
                      • <Phone className="h-3.5 w-3.5 text-slate-500" /> {user.phone}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* QUICK ACTIONS BUTTONS */}
            <div className="flex flex-wrap items-center gap-3">
              {isFrozen ? (
                <button
                  onClick={() => setConfirmModalAction("ACTIVATE")}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" /> Unsuspend / Restore Account
                </button>
              ) : (
                <button
                  onClick={() => setConfirmModalAction("SUSPEND")}
                  className="flex items-center gap-2 rounded-2xl bg-rose-500/20 border border-rose-500/30 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer"
                >
                  <UserX className="h-4 w-4" /> Suspend / Freeze Account
                </button>
              )}

              {user.isVerified ? (
                <button
                  onClick={() => setConfirmModalAction("UNVERIFY")}
                  className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="h-4 w-4 text-amber-400" /> Unverify Identity
                </button>
              ) : (
                <button
                  onClick={() => setConfirmModalAction("VERIFY")}
                  className="flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" /> Verify KYC Identity
                </button>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 1 & 2: PROFILE & IDENTITY DETAILS & KYC VERIFICATION */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* PROFILE DETAILS CARD */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <User className="h-4 w-4 text-amber-400" /> Customer Profile Information
            </h3>
            <div className="grid gap-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                <span className="text-slate-400 flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-500" /> Full Name</span>
                <span className="font-bold text-white">{user.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                <span className="text-slate-400 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-500" /> Email Address</span>
                <span className="font-bold text-white">{user.email}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                <span className="text-slate-400 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-500" /> Phone Number</span>
                <span className="font-bold text-white">{user.phone || "Not provided"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-500" /> Registration Date</span>
                <span className="font-bold text-white">{new Date(user.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-500" /> Last Account Update</span>
                <span className="font-bold text-slate-300">{new Date(user.updatedAt || user.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* VERIFICATION & KYC STATUS CARD */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> KYC Verification & Identity Compliance
            </h3>
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">KYC Verification Status</span>
                  <span className={`font-black ${user.isVerified ? "text-emerald-400" : "text-amber-400"}`}>
                    {user.isVerified ? "VERIFIED IDENTITY" : "PENDING / UNVERIFIED"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {user.isVerified
                    ? "Customer identity verified with tier-1 compliance approval."
                    : "Customer identity has not been verified yet. Restrictions may apply to high-volume transfers."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-slate-400 font-semibold">Verification Audit Timestamp</span>
                <p className="font-mono text-slate-300">{new Date(user.updatedAt || user.createdAt).toISOString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: FINANCIAL OVERVIEW */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-400" /> Financial Overview & Wallet Accounts
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
              <span className="text-xs font-bold uppercase text-slate-400">Primary NUBAN Account</span>
              <p className="text-lg font-mono font-bold text-white">{primaryAcc ? primaryAcc.accountNumber : "No NUBAN"}</p>
              <p className="text-[11px] font-semibold text-amber-400">{primaryAcc?.bankName || "BankSpace MFB"}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
              <span className="text-xs font-bold uppercase text-slate-400">Available Wallet Balance</span>
              <p className="text-2xl font-black text-amber-400">
                ₦{Number(primaryAcc?.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-semibold text-emerald-400">Authorized Liquidity</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
              <span className="text-xs font-bold uppercase text-slate-400">Lifetime Transactions</span>
              <p className="text-2xl font-black text-white">{metrics.transactionCount || transactions.length}</p>
              <p className="text-[11px] font-semibold text-slate-400 font-mono">Executed Entries</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
              <span className="text-xs font-bold uppercase text-slate-400">Lifetime Money Movement Transfers</span>
              <p className="text-2xl font-black text-indigo-400">{metrics.transferCount || transfers.length}</p>
              <p className="text-[11px] font-semibold text-indigo-400 font-mono">Completed Transfers</p>
            </div>
          </div>
        </section>

        {/* SECTION 4: RECENT ACTIVITY & LOGS */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* RECENT TRANSACTIONS */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" /> Recent Transactions Log ({transactions.length})
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-2.5 font-mono text-xs">
              {transactions.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No transaction activity recorded for this user.</p>
              ) : (
                transactions.map((t: any) => (
                  <div key={t.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {t.type === "DEPOSIT" ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 text-rose-400" />
                        )}
                        <span className="font-sans font-bold text-white">{t.type}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{t.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-amber-400">₦{Number(t.amount).toLocaleString()}</p>
                      <span className="text-[10px] font-sans font-bold text-emerald-400">{t.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AUDIT LOG EVENTS */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" /> Security & Administrative Event Log ({logs.length})
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-2.5 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No security or audit events recorded.</p>
              ) : (
                logs.map((log: any) => (
                  <div key={log.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-amber-400">{log.action}</span>
                      <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] font-sans text-slate-300">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: ADMINISTRATIVE ACTIONS CONFIRMATION MODAL */}
        {confirmModalAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setConfirmModalAction(null)} />
            <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-50 space-y-6">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Confirm Administrative Action</h3>
                  <p className="text-xs text-slate-400">Security confirmation required</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
                <p className="text-slate-300 font-semibold">
                  Are you sure you want to execute action <strong className="text-amber-400">{confirmModalAction}</strong> for user{" "}
                  <strong className="text-white">{user.name}</strong>?
                </p>
                <p className="text-[11px] text-slate-500">This action will be logged in the system audit registry.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Action Reason / Notes (Optional):</label>
                <input
                  type="text"
                  placeholder="Enter reason for audit record..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmModalAction(null)}
                  disabled={isSubmittingAction}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteAction}
                  disabled={isSubmittingAction}
                  className="rounded-2xl bg-rose-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-rose-400 disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/20"
                >
                  {isSubmittingAction ? "Executing..." : "Confirm & Execute Action"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}

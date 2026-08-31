/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  UserCheck,
  UserX,
  CreditCard,
  History,
  ArrowLeftRight,
  Activity,
  Building,
  RefreshCw,
} from "lucide-react"
import { ConfirmActionModal } from "@/components/admin/ConfirmActionModal"

export default function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)
  const router = useRouter()

  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Action & Confirmation Modal State
  const [confirmModalAction, setConfirmModalAction] = useState<"SUSPEND" | "ACTIVATE" | "VERIFY" | "UNVERIFY" | null>(null)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchUserDetails = async () => {
    setIsLoading(true)
    setFetchError(null)
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Failed to load user profile.")
      }

      const data = await res.json()
      setUserData(data)
    } catch (err: any) {
      setFetchError(err.message || "Error loading user profile.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  const handleExecuteAction = async (reason?: string) => {
    if (!confirmModalAction) return

    setIsSubmittingAction(true)
    setFeedbackMessage(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirmModalAction,
          reason,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setFeedbackMessage({ type: "success", text: `Administrative action ${confirmModalAction} executed successfully.` })
        setTimeout(() => {
          setConfirmModalAction(null)
          setFeedbackMessage(null)
          fetchUserDetails()
        }, 1200)
      } else {
        setFeedbackMessage({ type: "error", text: data.message || "Failed to execute administrative action." })
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Network error occurred." })
    } finally {
      setIsSubmittingAction(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-amber-400" />
        <p className="text-xs font-semibold">Loading 360-Degree Customer Profile...</p>
      </div>
    )
  }

  if (fetchError || !userData?.user) {
    return (
      <div className="py-16 text-center text-slate-400 space-y-4">
        <AlertTriangle className="h-12 w-12 text-rose-400 mx-auto" />
        <p className="text-sm font-bold text-white">{fetchError || "User Profile Not Found"}</p>
        <button
          onClick={() => router.push("/admin/dashboard?tab=users")}
          className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
        >
          Return to Users Directory
        </button>
      </div>
    )
  }

  const user = userData.user
  const primaryAccount = user.bankAccounts?.find((a: any) => a.isPrimary) || user.bankAccounts?.[0]
  const isFrozen = user.isSuspended || primaryAccount?.status === "FROZEN"

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* FUNCTIONALITY HEADER & CAPABILITY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <button
            onClick={() => router.push("/admin/dashboard?tab=users")}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Users Management
          </button>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <User className="h-7 w-7 text-amber-400" /> 360-Degree User Profile & Security Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Functionality: Inspect customer profile details, wallet balances, transaction activity, and execute double-submission guarded suspension/activation actions.
          </p>
        </div>
        <button
          onClick={fetchUserDetails}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-amber-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh Profile
        </button>
      </div>

      {/* HERO PROFILE CARD */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-amber-500 text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-white">{user.name}</h2>
                <span
                  className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${
                    isFrozen
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {isFrozen ? "SUSPENDED / FROZEN" : "ACTIVE"}
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${
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
          <div className="space-y-3 text-xs font-semibold">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Full Name</span>
              <span className="text-white font-bold">{user.name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Email Address</span>
              <span className="text-white font-bold">{user.email}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Phone Number</span>
              <span className="text-white font-bold">{user.phone || "Not provided"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Role Privilege</span>
              <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                {user.role}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Registration Date</span>
              <span className="text-slate-300 font-mono">{new Date(user.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* KYC COMPLIANCE DETAILS CARD */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-400" /> KYC Compliance & Verification
          </h3>
          <div className="space-y-3 text-xs font-semibold">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Compliance Status</span>
              <span className="font-bold text-amber-400">{user.kycStatus || (user.isVerified ? "VERIFIED" : "UNVERIFIED")}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Primary Bank Account</span>
              <span className="font-mono text-cyan-400">{primaryAccount?.accountNumber || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Account Status</span>
              <span className="font-bold text-white">{primaryAccount?.status || "ACTIVE"}</span>
            </div>
            {user.kycRejectionReason && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 space-y-1">
                <span className="text-rose-400 font-bold uppercase text-[10px]">Rejection Reason Log</span>
                <p className="text-rose-200 text-xs">{user.kycRejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL WITH DOUBLE-SUBMISSION GUARD */}
      {confirmModalAction && (
        <ConfirmActionModal
          isOpen={!!confirmModalAction}
          onClose={() => {
            if (!isSubmittingAction) {
              setConfirmModalAction(null)
              setFeedbackMessage(null)
            }
          }}
          onConfirm={handleExecuteAction}
          title={
            confirmModalAction === "SUSPEND"
              ? "Suspend Customer Account & Freeze Wallets"
              : confirmModalAction === "ACTIVATE"
              ? "Unsuspend & Restore Customer Account"
              : confirmModalAction === "VERIFY"
              ? "Verify Customer KYC Identity"
              : "Unverify Customer KYC Identity"
          }
          actionLabel={`Confirm ${confirmModalAction} Operation`}
          actionType={
            confirmModalAction === "SUSPEND" || confirmModalAction === "UNVERIFY" ? "DANGER" : "INFO"
          }
          affectedEntityName={user.name}
          affectedEntityId={user.email}
          consequenceWarning={
            confirmModalAction === "SUSPEND"
              ? "Freezes all customer NUBAN accounts, revokes login credentials, and blocks all outbound interbank transfers."
              : confirmModalAction === "ACTIVATE"
              ? "Restores account active status and unfreezes customer bank accounts."
              : "Updates customer identity verification status in the database."
          }
          requireReason={confirmModalAction === "SUSPEND"}
          reasonLabel={
            confirmModalAction === "SUSPEND"
              ? "Mandatory Suspension Justification"
              : "Audit Rationale (Optional)"
          }
          reasonPlaceholder="Specify explicit justification for security audit log..."
          isProcessing={isSubmittingAction}
          feedbackMessage={feedbackMessage}
        />
      )}
    </div>
  )
}

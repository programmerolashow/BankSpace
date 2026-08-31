/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Settings,
  User,
  ShieldCheck,
  Lock,
  KeyRound,
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  LogOut,
  Smartphone,
  Mail,
  Shield,
  Activity,
} from "lucide-react"

export default function AdminSettingsPage() {
  const router = useRouter()

  const [settingsData, setSettingsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Form State: Profile Update
  const [profileName, setProfileName] = useState("")
  const [profilePhone, setProfilePhone] = useState("")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" })

  // Form State: Security Password Change
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" })

  // Form State: Session Termination
  const [isTerminatingSessions, setIsTerminatingSessions] = useState(false)
  const [sessionMessage, setSessionMessage] = useState({ type: "", text: "" })

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/settings")
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
        setSettingsData(data)
        if (data.profile) {
          setProfileName(data.profile.name || "")
          setProfilePhone(data.profile.phone || "")
        }
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // Handle Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage({ type: "", text: "" })
    setIsUpdatingProfile(true)

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_PROFILE",
          name: profileName,
          phone: profilePhone,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setProfileMessage({ type: "success", text: data.message || "Profile updated successfully." })
        fetchSettings()
      } else {
        setProfileMessage({ type: "error", text: data.message || "Failed to update profile." })
      }
    } catch {
      setProfileMessage({ type: "error", text: "Network error occurred." })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage({ type: "", text: "" })

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation password do not match." })
      return
    }

    setIsChangingPassword(true)

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_PASSWORD",
          currentPassword,
          newPassword,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setPasswordMessage({ type: "success", text: data.message || "Password changed successfully." })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setPasswordMessage({ type: "error", text: data.message || "Failed to change password." })
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Network error occurred." })
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Handle Terminate Other Sessions
  const handleTerminateOtherSessions = async () => {
    setSessionMessage({ type: "", text: "" })
    setIsTerminatingSessions(true)

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TERMINATE_OTHER_SESSIONS" }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSessionMessage({ type: "success", text: data.message })
        fetchSettings()
      } else {
        setSessionMessage({ type: "error", text: data.message || "Failed to terminate sessions." })
      }
    } catch {
      setSessionMessage({ type: "error", text: "Network error occurred." })
    } finally {
      setIsTerminatingSessions(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-amber-400" />
        <p className="text-xs font-semibold">Loading Administrator Console Settings...</p>
      </div>
    )
  }

  const profile = settingsData?.profile || {}
  const security = settingsData?.security || {}
  const system = settingsData?.system || {}

  return (
    <div className="space-y-8 pb-12">
      {/* FUNCTIONALITY HEADER & CAPABILITY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Settings className="h-7 w-7 text-amber-400" /> System Settings & Administrator Preferences
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Functionality: Manage administrator credentials, password security controls, active session limits, and inspect backend environment integrations.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] font-bold">
            <span className="rounded-full bg-amber-500/10 text-amber-400 px-3 py-1 border border-amber-500/20">
              • Administrator Identity & Profile
            </span>
            <span className="rounded-full bg-indigo-500/10 text-indigo-400 px-3 py-1 border border-indigo-500/20">
              • Bcrypt Password Security Controls
            </span>
            <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1 border border-emerald-500/20">
              • Real-Time Neon DB & Paystack Status
            </span>
          </div>
        </div>
        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-amber-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh Preferences
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* SECTION 1: ADMIN PROFILE PREFERENCES */}
        <section className="lg:col-span-1 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <User className="h-5 w-5 text-amber-400" /> Administrator Profile
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage identity & contact details</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs font-semibold">
            {profileMessage.text && (
              <div
                className={`rounded-2xl border p-3 ${
                  profileMessage.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                }`}
              >
                {profileMessage.text}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 uppercase font-bold">Admin Email Address (System ID)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={profile.email || ""}
                  disabled
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-slate-400 font-mono outline-none cursor-not-allowed"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-normal">Primary administrative login credential (immutable).</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-300 uppercase font-bold">Full Display Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-200 outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-300 uppercase font-bold">Phone Number</label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-slate-200 outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">System Privilege Role</span>
                <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 font-bold">
                  {security.authRole || "ADMIN"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Account Registered</span>
                <span className="font-mono text-slate-300">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="w-full rounded-2xl bg-amber-500 py-3 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {isUpdatingProfile ? "Saving Profile..." : "Save Profile Details"}
            </button>
          </form>
        </section>

        {/* SECTION 2: SECURITY & AUTHENTICATION */}
        <section className="lg:col-span-1 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-400" /> Security & Password
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Bcrypt password mutation & session controls</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-semibold">
            {passwordMessage.text && (
              <div
                className={`rounded-2xl border p-3 ${
                  passwordMessage.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-300 uppercase font-bold">Current Admin Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-200 outline-none focus:border-indigo-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-300 uppercase font-bold">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-200 outline-none focus:border-indigo-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-300 uppercase font-bold">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-200 outline-none focus:border-indigo-500/60"
              />
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 space-y-1 text-[11px] text-indigo-300">
              <p className="font-bold flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Password Complexity Rules
              </p>
              <p className="text-[10px] text-indigo-300/80">
                Minimum 8 characters, at least 1 uppercase letter (A-Z), and at least 1 number (0-9).
              </p>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-black text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {isChangingPassword ? "Updating Password..." : "Update Admin Password"}
            </button>
          </form>

          {/* ACTIVE SESSION MANAGEMENT */}
          <div className="border-t border-slate-800 pt-5 space-y-3 text-xs font-semibold">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Administrator Sessions</h3>

            {sessionMessage.text && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                {sessionMessage.text}
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Active Sessions Count</p>
                <p className="text-[10px] text-slate-400 font-mono">Current IP: {security.currentSessionIp || "127.0.0.1"}</p>
              </div>
              <span className="rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 font-mono font-bold">
                {security.activeSessionsCount || 1} Active
              </span>
            </div>

            <button
              onClick={handleTerminateOtherSessions}
              disabled={isTerminatingSessions}
              className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isTerminatingSessions ? "Terminating Sessions..." : "Terminate Other Active Sessions"}
            </button>
          </div>
        </section>

        {/* SECTION 3: SYSTEM HEALTH & INTEGRATIONS */}
        <section className="lg:col-span-1 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-400" /> System Integration Status
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time architecture & environment health</p>
          </div>

          <div className="space-y-4 text-xs font-semibold">
            {/* Database Health Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-400" /> Neon PostgreSQL Database
                </span>
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                  {system.dbStatus || "CONNECTED"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Primary relational database storing users, bank accounts, transactions, and audit logs.
              </p>
            </div>

            {/* Paystack Integration Health Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" /> Paystack Gateway Provider
                </span>
                <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                  {system.paystackStatus || "CONFIGURED_ACTIVE"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Interbank settlement & deposit gateway integration layer. Secret keys securely isolated on server.
              </p>
            </div>

            {/* Rate Limiter & Security Health Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" /> API Rate Limiting Engine
                </span>
                <span className="rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                  {system.rateLimiting || "ACTIVE_ENFORCED"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                In-memory sliding window rate limiter enforcing max 5 admin login attempts / 15 mins per IP.
              </p>
            </div>

            {/* Environment Summary */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Node Runtime Environment</span>
                <span className="font-mono text-slate-200 font-bold">{system.environment || "development"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Current Client IP</span>
                <span className="font-mono text-indigo-400 font-bold">{security.currentSessionIp || "127.0.0.1"}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

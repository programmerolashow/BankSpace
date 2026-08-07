'use client'

import { useState } from "react"
import Link from "next/link"
import { Mail, Lock, KeyRound, CheckCircle2, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<"request" | "reset" | "success">("request")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to process recovery request")
      }

      if (data.token) {
        setResetToken(data.token)
        setStep("reset")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recovery request failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Password reset failed")
      }

      setStep("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-4 sm:p-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Account Security & Recovery</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {step === "request" && "Recover Account Access"}
          {step === "reset" && "Create New Password"}
          {step === "success" && "Password Reset Complete!"}
        </h1>
        <p className="text-sm text-slate-600">
          {step === "request" && "Enter your account email address below to receive password recovery instructions."}
          {step === "reset" && "Your recovery token has been generated. Enter your new password below."}
          {step === "success" && "Your password has been successfully updated. You can now log into your account."}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-600 text-center">
          {error}
        </div>
      )}

      {step === "request" && (
        <form onSubmit={handleRequestToken} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Registered Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity disabled:opacity-70"
          >
            <span>{isLoading ? "Generating Token..." : "Send Password Recovery Link"}</span>
            <KeyRound className="h-4 w-4" />
          </button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={handleResetPassword} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Recovery Token
            </label>
            <input
              type="text"
              value={resetToken}
              readOnly
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs font-mono font-bold text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
                placeholder="Enter new password (min. 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity disabled:opacity-70"
          >
            <span>{isLoading ? "Updating Password..." : "Update Password & Login"}</span>
            <CheckCircle2 className="h-4 w-4" />
          </button>
        </form>
      )}

      {step === "success" && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 shadow-xl text-center space-y-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold text-emerald-900">
            Your password has been reset successfully! You can now log into your account using your new credentials.
          </p>
          <Link
            href="/?auth=login"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#3f3cff] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#322fdf] transition-colors"
          >
            <span>Go to Login Page</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="text-center pt-2">
        <Link href="/?auth=login" className="text-xs font-bold text-[#3f3cff] hover:underline">
          ← Back to Login
        </Link>
      </div>
    </div>
  )
}

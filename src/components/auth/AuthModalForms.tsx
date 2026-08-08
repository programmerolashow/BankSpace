'use client'

import { useState } from "react"
import { Eye, EyeOff, Lock, Mail, User, Phone, ArrowRight, ShieldCheck, Sparkles, KeyRound, CheckCircle2 } from "lucide-react"

interface AuthModalFormsProps {
  initialMode: "login" | "register"
  onSwitchMode: (mode: "login" | "register") => void
  onSuccess?: () => void
}

type FormMode = "login" | "register" | "forgot" | "reset"

// Official Vector Google Logo
function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

// Official Vector Apple Logo
function AppleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.54c.67-.82 1.13-1.96.99-3.11-.98.04-2.17.65-2.87 1.47-.62.72-1.16 1.88-1.01 3.01 1.1.09 2.22-.54 2.89-1.37z" />
    </svg>
  )
}

export default function AuthModalForms({ initialMode, onSwitchMode, onSuccess }: AuthModalFormsProps) {
  const [mode, setMode] = useState<FormMode>(initialMode)
  const [email, setEmail] = useState(initialMode === "login" ? "user@bankite.com" : "")
  const [password, setPassword] = useState(initialMode === "login" ? "password123" : "")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null)

  const switchMode = (newMode: FormMode) => {
    setMode(newMode)
    setError("")
    setSuccessMessage("")
    if (newMode === "login" || newMode === "register") {
      onSwitchMode(newMode)
    }
    if (newMode === "login" && !email) {
      setEmail("user@bankite.com")
      setPassword("password123")
    }
  }

  const fillDemoCredentials = () => {
    setEmail("user@bankite.com")
    setPassword("password123")
    setError("")
  }

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    setError("")
    setSuccessMessage("")
    setOauthLoading(provider)

    try {
      const response = await fetch("/api/auth/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `${provider === "google" ? "Google" : "Apple"} sign-in failed`)
      }

      if (data.user) {
        localStorage.setItem("bankspace_user", JSON.stringify(data.user))
      }

      if (onSuccess) onSuccess()
      window.location.href = "/dashboard"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Social authentication failed")
    } finally {
      setOauthLoading(null)
    }
  }

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsLoading(true)

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register"
    const payload = mode === "login" ? { email, password } : { name, email, password, phone }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `${mode === "login" ? "Login" : "Registration"} failed`)
      }

      if (data.user) {
        localStorage.setItem("bankspace_user", JSON.stringify(data.user))
      }

      if (onSuccess) onSuccess()
      window.location.href = "/dashboard"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to process password recovery")
      }

      setSuccessMessage("Recovery token generated! Enter your new password below.")
      if (data.token) {
        setResetToken(data.token)
        setMode("reset")
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
    setSuccessMessage("")
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

      setSuccessMessage("Password successfully reset! You can now log in with your new password.")
      setPassword(newPassword)
      setTimeout(() => switchMode("login"), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#eeeeff] px-3 py-1 text-xs font-bold text-[#3f3cff]">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>
            {mode === "login" && "Secure Account Login"}
            {mode === "register" && "Create BankSpace Account"}
            {mode === "forgot" && "Recover Account Access"}
            {mode === "reset" && "Set New Password"}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {mode === "login" && "Welcome Back"}
          {mode === "register" && "Join BankSpace Today"}
          {mode === "forgot" && "Reset Your Password"}
          {mode === "reset" && "Create New Password"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          {mode === "login" && "Enter your credentials to access your financial dashboard."}
          {mode === "register" && "Set up your account in 30 seconds to start banking smartly."}
          {mode === "forgot" && "Enter your account email to receive password recovery instructions."}
          {mode === "reset" && "Enter your new password to secure your account."}
        </p>
      </div>

      {/* Social OAuth Buttons (Google & Apple) */}
      {(mode === "login" || mode === "register") && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={Boolean(oauthLoading)}
              onClick={() => handleOAuthLogin("google")}
              className="flex items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white py-3 px-3 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-60"
            >
              <GoogleIcon className="h-4.5 w-4.5 shrink-0" />
              <span>{oauthLoading === "google" ? "Connecting..." : "Google"}</span>
            </button>

            <button
              type="button"
              disabled={Boolean(oauthLoading)}
              onClick={() => handleOAuthLogin("apple")}
              className="flex items-center justify-center gap-2.5 rounded-2xl border border-slate-900 bg-slate-900 py-3 px-3 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all disabled:opacity-60"
            >
              <AppleIcon className="h-4.5 w-4.5 shrink-0 text-white" />
              <span>{oauthLoading === "apple" ? "Connecting..." : "Apple Cloud"}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-4">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute bg-white px-3 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Or continue with email
            </span>
          </div>
        </div>
      )}

      {/* Demo Credentials Quick Fill Button */}
      {mode === "login" && (
        <button
          type="button"
          onClick={fillDemoCredentials}
          className="w-full flex items-center justify-between rounded-2xl bg-linear-to-br from-[#efeaff] to-[#f5f3ff] p-3 border border-violet-200 text-xs font-bold text-[#3f3cff] hover:bg-violet-100/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#3f3cff]" />
            <span>Use Demo Account Credentials</span>
          </div>
          <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-violet-200">1-Click Fill</span>
        </button>
      )}

      {/* Alerts */}
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-600 text-center">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-700 text-center">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Login & Register Form */}
      {(mode === "login" || mode === "register") && (
        <form onSubmit={handleLoginOrRegister} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Illias Omotayo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Phone Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+234 812 345 6789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-[11px] font-bold text-[#3f3cff] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
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
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity disabled:opacity-70"
          >
            <span>
              {isLoading
                ? mode === "login"
                  ? "Authenticating..."
                  : "Creating Account..."
                : mode === "login"
                ? "Log In to Dashboard"
                : "Create Account & Continue"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Forgot Password Form */}
      {mode === "forgot" && (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Account Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                placeholder="user@bankite.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity disabled:opacity-70"
          >
            <span>{isLoading ? "Generating Token..." : "Send Recovery Instructions"}</span>
            <KeyRound className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Reset Password Form */}
      {mode === "reset" && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Recovery Token
            </label>
            <input
              type="text"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              required
              readOnly
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs font-mono font-bold text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
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
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity disabled:opacity-70"
          >
            <span>{isLoading ? "Updating Password..." : "Update Password & Login"}</span>
            <CheckCircle2 className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Switch Mode Footer */}
      <div className="pt-2 text-center text-xs text-slate-500">
        {mode === "login" && (
          <p>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => switchMode("register")}
              className="font-bold text-[#3f3cff] hover:underline"
            >
              Create an account
            </button>
          </p>
        )}
        {mode === "register" && (
          <p>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="font-bold text-[#3f3cff] hover:underline"
            >
              Log in here
            </button>
          </p>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <p>
            Remember your password?{" "}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="font-bold text-[#3f3cff] hover:underline"
            >
              Back to login
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Admin login failed")
      }

      router.push("/admin/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid admin credentials")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-[#7c4dff] to-[#2454ff] shadow-xl">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">BankSpace Admin Portal</h1>
          <p className="text-xs text-slate-400">Strict RBAC System Administration Portal</p>
        </div>

        <form onSubmit={handleAdminLogin} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl space-y-5 backdrop-blur-md">
          {error && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                placeholder="admin@bankspace.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-[#3f3cff]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Master Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-[#3f3cff]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3.5 text-xs font-bold text-white shadow-xl hover:opacity-95 disabled:opacity-70"
          >
            <span>{isLoading ? "Authenticating Admin..." : "Authorize & Enter Admin Portal"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="pt-2 text-center text-xs text-slate-500">
            Need to register a new admin?{" "}
            <Link href="/admin/register" className="font-bold text-[#3f3cff] hover:underline">
              Admin Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

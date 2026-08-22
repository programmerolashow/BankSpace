'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, Lock, Mail, User, Key, ArrowRight } from "lucide-react"

export default function AdminRegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [adminKey, setAdminKey] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/admin/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, adminKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Admin registration failed")
      }

      router.push("/admin/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
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
          <h1 className="text-2xl font-black tracking-tight">Provision Admin Account</h1>
          <p className="text-xs text-slate-400">Strict Key-Authorized Administrator Provisioning</p>
        </div>

        <form onSubmit={handleAdminRegister} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl space-y-4 backdrop-blur-md">
          {error && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Admin Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="System Administrator"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-[#3f3cff]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Password (Min 8 characters)
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1">
              <Key className="h-3.5 w-3.5" /> Secret Admin Authorization Key
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="bankspace-admin-key-2026"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full rounded-2xl border border-amber-500/40 bg-slate-950/80 px-4 py-3 text-xs text-amber-300 outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3.5 text-xs font-bold text-white shadow-xl hover:opacity-95 disabled:opacity-70 mt-2"
          >
            <span>{isLoading ? "Provisioning Admin..." : "Provision Admin Account"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="pt-2 text-center text-xs text-slate-500">
            Already have an admin account?{" "}
            <Link href="/admin/login" className="font-bold text-[#3f3cff] hover:underline">
              Admin Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

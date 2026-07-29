'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    document.cookie = "auth=demo; path=/; max-age=3600"
    router.push("/dashboard")
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Welcome back</p>
        <h1 className="text-3xl font-bold text-slate-900">Log in to your account</h1>
        <p className="text-sm text-slate-600">Access your dashboard, cards, and spending insights.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            defaultValue="user@bankite.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0"
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            defaultValue="password123"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25"
        >
          Continue to dashboard
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/forgot-password" className="font-medium text-violet-700 hover:underline">
          Forgot password?
        </Link>
        <Link href="/register" className="font-medium text-slate-700 hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  )
}

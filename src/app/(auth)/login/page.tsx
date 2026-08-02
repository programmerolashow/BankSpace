'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("user@bankite.com")
  const [password, setPassword] = useState("password123")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Login failed")
      }

      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0"
            placeholder="Enter your password"
          />
        </div>

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Signing in..." : "Continue to dashboard"}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/forgot-password" className="font-medium text-violet-700 hover:underline">
          Forgot password?
        </Link>
        <button
          type="button"
          onClick={() => router.push("/?auth=register", { scroll: false })}
          className="font-medium text-slate-700 hover:underline"
        >
          Create an account
        </button>
      </div>
    </div>
  )
}

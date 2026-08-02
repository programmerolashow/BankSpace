'use client'

import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    document.cookie = "auth=demo; path=/; max-age=3600"
    router.push("/dashboard")
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Start here</p>
        <h1 className="text-3xl font-bold text-slate-900">Create your Bankite account</h1>
        <p className="text-sm text-slate-600">Build your financial dashboard in just a few steps.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0"
              placeholder="Ada Lovelace"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0"
            placeholder="Create a secure password"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25"
        >
          Create account
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => router.push("/?auth=login", { scroll: false })}
          className="font-semibold text-violet-700 hover:underline"
        >
          Sign in
        </button>
      </p>
    </div>
  )
}

"use client"

/* eslint-disable @next/next/no-img-element */
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"

const highlights = [
  {
    title: "Fast onboarding",
    description: "Create your account in minutes and start managing your finances instantly.",
  },
  {
    title: "Smart insights",
    description: "Track spending, budgets, and savings in one simple dashboard.",
  },
  {
    title: "Secure by design",
    description: "Protect every transaction with modern security and peace of mind.",
  },
]

export default function WelcomePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authMode = searchParams.get("auth")
  const isAuthModalOpen = authMode === "login" || authMode === "register"
  const authContent = useMemo(() => {
    if (authMode === "login") {
      return <p className="text-sm text-slate-600">Login form is available from the auth route.</p>
    }

    if (authMode === "register") {
      return <p className="text-sm text-slate-600">Registration form is available from the auth route.</p>
    }

    return null
  }, [authMode])

  const syncAuthParam = useCallback(
    (mode: "login" | "register" | null) => {
      const params = new URLSearchParams(searchParams.toString())

      if (mode) {
        params.set("auth", mode)
      } else {
        params.delete("auth")
      }

      const nextQuery = params.toString()
      const nextUrl = nextQuery ? `/?${nextQuery}` : "/"
      router.replace(nextUrl, { scroll: false })
    },
    [router, searchParams],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isAuthModalOpen) {
        syncAuthParam(null)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isAuthModalOpen, syncAuthParam])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f7f6ff_38%,#f8f9ff_70%)] px-6 py-10 text-slate-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-5 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-linear-to-br from-[#7c4dff] to-[#2454ff] font-bold text-white">
              B
            </div>
            <span className="text-xl font-bold">
              Bank<span className="text-[#3f3cff]">Space</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => syncAuthParam("login")}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => syncAuthParam("register")}
              className="rounded-full bg-linear-to-r from-[#4938f2] to-[#622dff] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25"
            >
              Create account
            </button>
          </div>
        </header>

        <section className="grid items-center gap-8 rounded-4xl border border-slate-200/80 bg-white/80 p-8 shadow-[0_30px_80px_-30px_rgba(68,84,255,0.35)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
          <div>
            <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">
              Welcome to BankSpace
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Start building a brighter financial future.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Manage accounts, cards, transfers, and investments from one modern experience built for everyday banking and long-term goals.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => syncAuthParam("register")}
                className="rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25"
              >
                Get started
              </button>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-slate-700 shadow-sm"
              >
                Explore dashboard
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px]">
            <img
              src="/assets/getStarted.PNG"
              alt="Bankite Space dashboard preview"
              className="h-full w-full rounded-[22px] object-cover"
            />
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
            </div>
          ))}
        </section>
      </div>

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-4xl border border-slate-200 bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => syncAuthParam(null)}
              className="absolute right-4 top-4 rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
              aria-label="Close auth dialog"
            >
              ✕
            </button>
            <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8 lg:p-10">
              {authContent}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

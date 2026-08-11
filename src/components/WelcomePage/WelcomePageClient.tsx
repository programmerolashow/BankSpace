"use client"

/* eslint-disable @next/next/no-img-element */
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Menu, X, ArrowRight, LayoutDashboard, LogIn, UserPlus } from "lucide-react"
import AuthModalForms from "@/components/auth/AuthModalForms"

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
      setIsMobileMenuOpen(false)
    },
    [router, searchParams],
  )

  const handleExploreDashboard = () => {
    setIsMobileMenuOpen(false)
    const hasAuthCookie = document.cookie.includes("auth=")
    if (hasAuthCookie) {
      router.push("/dashboard")
    } else {
      syncAuthParam("login")
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isAuthModalOpen) syncAuthParam(null)
        if (isMobileMenuOpen) setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isAuthModalOpen, isMobileMenuOpen, syncAuthParam])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f7f6ff_38%,#f8f9ff_70%)] px-4 sm:px-6 py-6 sm:py-10 text-slate-950 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:gap-10">
        {/* Header */}
        <header className="flex items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-4 sm:px-5 py-3 shadow-xs backdrop-blur-md relative z-30">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-[#7c4dff] via-[#4938f2] to-[#2454ff] font-bold text-white shadow-md shadow-indigo-500/20">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Bank<span className="text-[#3f3cff]">Space</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => syncAuthParam("login")}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => syncAuthParam("register")}
              className="rounded-full bg-linear-to-r from-[#4938f2] to-[#622dff] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity"
            >
              Create account
            </button>
          </div>

          {/* Mobile & Tablet Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile & Tablet Slide-Down Header Menu */}
        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-20 bg-slate-950/40 backdrop-blur-xs md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative z-30 md:hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-3 duration-200">
              <button
                type="button"
                onClick={() => syncAuthParam("login")}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <LogIn className="h-4.5 w-4.5 text-[#3f3cff]" />
                  <span>Log In to Account</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => syncAuthParam("register")}
                className="w-full flex items-center justify-between rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] p-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20"
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="h-4.5 w-4.5 text-white" />
                  <span>Create Free Account</span>
                </div>
                <ArrowRight className="h-4 w-4 text-white/80" />
              </button>

              <button
                type="button"
                onClick={handleExploreDashboard}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="h-4.5 w-4.5 text-violet-600" />
                  <span>Explore Dashboard</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </>
        )}

        {/* Hero Section */}
        <section className="grid items-center gap-8 rounded-4xl border border-slate-200/80 bg-white/80 p-6 sm:p-8 shadow-[0_30px_80px_-30px_rgba(68,84,255,0.35)] backdrop-blur-md lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
          <div>
            <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1 text-xs font-bold text-violet-700">
              Welcome to BankSpace
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-slate-950">
              Start building a brighter financial future.
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg leading-7 sm:leading-8 text-slate-600">
              Manage accounts, cards, transfers, and investments from one modern experience built for everyday banking and long-term goals.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => syncAuthParam("register")}
                className="rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 hover:opacity-95 transition-opacity"
              >
                Get started
              </button>
              <button
                type="button"
                onClick={handleExploreDashboard}
                className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                Explore dashboard
              </button>
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

        {/* Highlights Section */}
        <section className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
            </div>
          ))}
        </section>
      </div>

      {/* Auth Modal overlaying the Welcome Page */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-md transition-opacity">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl p-6 sm:p-8">
            <button
              type="button"
              onClick={() => syncAuthParam(null)}
              className="absolute right-4 top-4 rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Close auth dialog"
            >
              ✕
            </button>

            <AuthModalForms
              initialMode={authMode as "login" | "register"}
              onSwitchMode={(mode) => syncAuthParam(mode)}
              onSuccess={() => syncAuthParam(null)}
            />
          </div>
        </div>
      )}
    </main>
  )
}

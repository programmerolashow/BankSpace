/* eslint-disable @next/next/no-img-element */
import Link from "next/link"

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

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f7f6ff_38%,#f8f9ff_70%)] px-6 py-10 text-slate-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-5 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <img
              src="/assets/bankspace_logo.png"
              alt="BankSpace logo"
              className="h-12.5 w-30 rounded-full object-cover"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-linear-to-r from-[#4938f2] to-[#622dff] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25"
            >
              Create account
            </Link>
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
              <Link
                href="/register"
                className="rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25"
              >
                Get started
              </Link>
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
    </main>
  )
}

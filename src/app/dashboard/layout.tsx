import Link from "next/link"

const navItems = [
  { href: "/dashboard", label: "Home" },
  { href: "/accounts", label: "Accounts" },
  { href: "/cards", label: "Cards" },
  { href: "/transactions", label: "Transactions" },
  { href: "/payments", label: "Payments" },
  { href: "/investments", label: "Investments" },
  { href: "/savings-goals", label: "Savings Goals" },
  { href: "/budgets", label: "Budgets" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-[#f8f9ff] text-slate-950">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-slate-200/70 bg-white/80 px-5 py-7 backdrop-blur lg:flex lg:flex-col">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-linear-to-br from-[#7c4dff] to-[#2454ff] font-bold text-white">
              B
            </div>
            <span className="text-xl font-bold">
              Bank<span className="text-[#3f3cff]">Space</span>
            </span>
          </div>

          <nav className="space-y-2">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  index === 0
                    ? "bg-[#eeeeff] text-[#3f3cff]"
                    : "text-slate-600 transition hover:bg-slate-100"
                }`}
              >
                <span className="grid h-5 w-5 place-items-center rounded text-xs">
                  {index + 1}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl bg-linear-to-br from-[#f0edff] to-[#e9ecff] p-5">
            <h3 className="font-semibold text-[#3f3cff]">Upgrade to Premium</h3>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              Unlock higher limits, advanced analytics and more.
            </p>
            <button className="mt-4 w-full rounded-xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25">
              Upgrade Now
            </button>
          </div>
        </aside>

        <section className="bg-[radial-gradient(circle_at_top_left,#ffffff_0,#f7f6ff_38%,#f8f9ff_70%)] px-5 py-6 md:px-10 lg:px-14">
          <header className="mb-10 flex items-center justify-between gap-5">
            <div className="relative hidden h-[52px] w-full max-w-md items-center rounded-full border border-slate-200 bg-white pl-5 pr-1 shadow-sm md:flex">
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#3248f4] to-[#662dff] text-white shadow-sm shadow-indigo-500/20 transition-opacity hover:opacity-90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </button>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#3f3cff] shadow-sm">
                ◌
              </button>
              <button className="rounded-2xl bg-linear-to-r from-[#3248f4] to-[#662dff] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25">
                Send Money
              </button>
            </div>
          </header>

          {children}
        </section>
      </div>
    </main>
  )
}
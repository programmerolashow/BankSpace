import Link from "next/link"

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/accounts", label: "Accounts" },
  { href: "/cards", label: "Cards" },
  { href: "/settings", label: "Settings" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-500">Bankite Space</p>
            <h1 className="text-xl font-bold">Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </section>
      </div>
    </div>
  )
}

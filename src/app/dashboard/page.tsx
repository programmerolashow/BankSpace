import Link from "next/link"

const cards = [
  { title: "Available balance", value: "₦1,250,450.00", hint: "Updated 2 mins ago" },
  { title: "Monthly spend", value: "₦350,000", hint: "Below your budget" },
  { title: "Savings goal", value: "54% complete", hint: "MacBook Pro target" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-linear-to-r from-[#4938f2] to-[#622dff] p-6 text-white shadow-lg shadow-violet-500/20">
        <p className="text-sm text-white/80">Good morning</p>
        <h2 className="mt-2 text-3xl font-bold">Your finances are looking healthy.</h2>
        <p className="mt-3 max-w-2xl text-sm text-white/80">
          Continue managing your accounts, cards, and savings goals from one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-500">{card.title}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-2 text-sm text-slate-500">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/settings" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Open settings
        </Link>
        <Link href="/accounts" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          View accounts
        </Link>
      </div>
    </div>
  )
}

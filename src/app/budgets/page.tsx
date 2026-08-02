const budgets = [
  { label: "Housing", used: "₦68K", total: "₦80K", progress: 85 },
  { label: "Groceries", used: "₦24K", total: "₦30K", progress: 80 },
  { label: "Entertainment", used: "₦9K", total: "₦15K", progress: 60 },
]

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Budgets</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Keep your spending goals on track</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Plan your monthly spending with visual progress trackers and easy-to-follow limits.
            </p>
          </div>
          <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            Create budget
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Monthly budget overview</h2>
          <span className="text-xs font-semibold text-slate-500">July 2026</span>
        </div>
        <div className="mt-6 space-y-5">
          {budgets.map((budget) => (
            <div key={budget.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{budget.label}</p>
                <p className="text-sm font-semibold text-slate-600">{budget.used} of {budget.total}</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-linear-to-r from-[#403eff] to-[#6533ff]" style={{ width: `${budget.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

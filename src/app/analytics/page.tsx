const trends = [
  { label: "Income", value: "₦1.2M", change: "+12.4%" },
  { label: "Expenses", value: "₦480K", change: "-4.2%" },
  { label: "Investments", value: "₦320K", change: "+8.1%" },
]

const categories = [
  { name: "Bills", amount: "₦120K", color: "bg-violet-500" },
  { name: "Shopping", amount: "₦86K", color: "bg-sky-500" },
  { name: "Food", amount: "₦74K", color: "bg-emerald-500" },
  { name: "Travel", amount: "₦41K", color: "bg-orange-400" },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Analytics</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">See where your money is going</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Understand your cash flow with simple business-friendly visuals and clear performance snapshots.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Spending overview</h2>
            <span className="text-xs font-semibold text-slate-500">This quarter</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {trends.map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{item.value}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-600">{item.change}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 h-48 rounded-[24px] bg-[linear-gradient(135deg,#f3eeff_0%,#eef7ff_100%)] p-4">
            <div className="flex h-full items-end gap-3">
              {[38, 60, 50, 74, 64, 82].map((height, index) => (
                <div key={index} className="flex-1 rounded-t-2xl bg-linear-to-t from-[#4938f2] to-[#5fd1ff]" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Category breakdown</h2>
          <div className="mt-5 space-y-4">
            {categories.map((category) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${category.color}`} />
                  <span className="text-sm font-medium text-slate-700">{category.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{category.amount}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

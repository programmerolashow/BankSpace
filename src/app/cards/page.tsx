const cards = [
  { name: "Platinum Card", number: "•••• 4598", balance: "₦1,250,450", status: "Active" },
  { name: "Travel Card", number: "•••• 2211", balance: "₦320,500", status: "Paused" },
]

export default function CardsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Cards</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Control your cards with confidence</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              View balances, manage limits, and keep every payment card secure from one place.
            </p>
          </div>
          <button className="rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25">
            Request new card
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {cards.map((card) => (
            <div key={card.name} className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="rounded-3xl bg-linear-to-br from-[#7257ff] via-[#4335eb] to-[#2639d9] p-6 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/75">{card.name}</p>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{card.status}</span>
                </div>
                <p className="mt-8 text-3xl font-black">{card.balance}</p>
                <div className="mt-6 flex items-center justify-between text-sm text-white/80">
                  <span>{card.number}</span>
                  <span>08/28</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Card usage</h2>
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">This month</p>
            <p className="mt-2 text-3xl font-black text-slate-950">₦340,000</p>
            <p className="mt-3 text-sm font-semibold text-emerald-600">+9.1% vs last month</p>
          </div>
        </section>
      </section>
    </div>
  )
}

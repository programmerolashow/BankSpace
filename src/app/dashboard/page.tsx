const quickActions = [
  { label: "Send Money", color: "bg-violet-100 text-violet-600", icon: "➤" },
  { label: "Pay Bills", color: "bg-emerald-100 text-emerald-600", icon: "▣" },
  { label: "Top Up", color: "bg-orange-100 text-orange-500", icon: "+" },
  { label: "Buy Airtime", color: "bg-sky-100 text-sky-600", icon: "▯" },
  { label: "More", color: "bg-slate-100 text-slate-500", icon: "⌘" },
]

const transactions = [
  {
    name: "Transfer to Michael O.",
    type: "Transfer",
    amount: "-₦50,000.00",
    color: "text-slate-950",
    badge: "bg-emerald-500",
  },
  {
    name: "Shoprite Supermarket",
    type: "Shopping",
    amount: "-₦15,600.00",
    color: "text-slate-950",
    badge: "bg-violet-600",
  },
  {
    name: "Salary from Neominds",
    type: "Income",
    amount: "+ ₦250,000.00",
    color: "text-emerald-500",
    badge: "bg-sky-500",
  },
  {
    name: "Ikeja Electric",
    type: "Bills & Utilities",
    amount: "-₦8,200.00",
    color: "text-slate-950",
    badge: "bg-orange-400",
  },
]

export default function DashboardPage() {
  return (
    <div>
      <div className="grid gap-8 xl:grid-cols-[1.1fr_.9fr]">
        <section className="flex flex-col justify-center">
          <p className="mb-4 text-slate-500">Welcome back, Illias</p>
          <h1 className="max-w-xl text-5xl font-black leading-tight tracking-tight md:text-6xl">
            Smart banking <br />
            for a{" "}
            <span className="bg-linear-to-r from-[#6757ff] to-[#43a1ff] bg-clip-text text-transparent">
              better life
            </span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-500">
            Manage your finances, make payments, save and invest, all in one
            secure place.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25">
              Send Money
            </button>
            <button className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-slate-700 shadow-sm">
              View Analytics
            </button>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#7257ff] via-[#4335eb] to-[#2639d9] p-8 text-white shadow-2xl shadow-indigo-500/30">
          <div className="absolute inset-x-0 bottom-7 h-28 opacity-30">
            <div className="h-full rounded-[50%] border border-white/40" />
          </div>

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm text-white/75">Total Balance</p>
              <h2 className="mt-4 text-4xl font-bold">₦1,250,450.00</h2>
              <div className="mt-4 inline-flex rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                +12.5% vs last month
              </div>
            </div>

            <button className="rounded-2xl bg-white/15 px-3 py-2 text-white backdrop-blur">
              •••
            </button>
          </div>

          <div className="relative z-10 mt-20 flex items-end justify-between">
            <p className="font-semibold tracking-widest">•••• 4598</p>
            <p className="text-xl font-black italic">VISA</p>
          </div>
        </section>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-5 font-bold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <span
                  className={`mx-auto grid h-12 w-12 place-items-center rounded-full text-xl ${action.color}`}
                >
                  {action.icon}
                </span>
                <span className="mt-3 block text-xs font-semibold">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold">Spending Overview</h2>
            <span className="text-xs font-semibold text-slate-500">
              This Month
            </span>
          </div>

          <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
            <div className="grid h-36 w-36 shrink-0 place-items-center rounded-full bg-[conic-gradient(#4454ff_0_34%,#ec6fc8_34%_57%,#52c991_57%_83%,#75d4ee_83%_100%)]">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
                <div>
                  <p className="font-black">₦350,000</p>
                  <p className="text-xs text-slate-400">Total Spend</p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3 text-sm">
              {["Transfers", "Shopping", "Bills & Utilities", "Food & Dining"].map(
                (item, index) => (
                  <div key={item} className="flex items-center justify-between">
                    <span className="text-slate-500">{item}</span>
                    <span className="font-semibold">
                      {["₦120,000", "₦80,000", "₦60,000", "₦50,000"][index]}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Recent Transactions</h2>
            <a className="text-xs font-semibold text-[#3f3cff]" href="#">
              View All
            </a>
          </div>

          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx.name} className="flex items-center gap-4 py-4">
                <span className={`h-11 w-11 rounded-full ${tx.badge}`} />
                <div className="mr-auto">
                  <p className="text-sm font-bold">{tx.name}</p>
                  <p className="text-xs text-slate-400">{tx.type}</p>
                </div>
                <p className={`text-sm font-bold ${tx.color}`}>{tx.amount}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-bold">Savings Goals</h2>
            <a className="text-xs font-semibold text-[#3f3cff]" href="#">
              View All
            </a>
          </div>

          <div className="flex gap-4">
            <div className="h-16 w-20 rounded-xl bg-linear-to-br from-[#080617] via-[#692fff] to-[#ff7ad9]" />
            <div className="flex-1">
              <p className="font-bold">MacBook Pro</p>
              <p className="mt-1 text-sm font-semibold text-[#3f3cff]">
                ₦650,000 of ₦1,200,000
              </p>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-full w-[54%] rounded-full bg-linear-to-r from-[#403eff] to-[#6533ff]" />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Target date: Dec 31, 2025
              </p>
            </div>
          </div>

          <div className="mt-7 rounded-2xl bg-linear-to-r from-[#efeaff] to-[#fff0fb] p-4">
            <p className="font-semibold">You’re doing great!</p>
            <p className="mt-1 text-sm text-slate-500">
              Keep saving to achieve your goals faster.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
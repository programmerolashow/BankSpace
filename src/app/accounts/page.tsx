const accounts = [
  { name: "Main Checking", number: "•••• 4598", balance: "₦850,240.00", type: "Primary" },
  { name: "Savings Vault", number: "•••• 2211", balance: "₦320,500.00", type: "Goal" },
  { name: "Business Wallet", number: "•••• 0048", balance: "₦180,900.00", type: "Business" },
]

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Accounts</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Manage your money in one place</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Track balances, organize funds, and stay on top of every account from a single dashboard.
            </p>
          </div>
          <button className="rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25">
            Add account
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          {accounts.map((account) => (
            <div key={account.name} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{account.number}</p>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  {account.type}
                </span>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Available balance</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{account.balance}</p>
                </div>
                <button className="text-sm font-semibold text-[#3f3cff]">View details</button>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Account growth</h2>
            <span className="text-xs font-semibold text-slate-500">This month</span>
          </div>
          <div className="mt-6 rounded-2xl bg-linear-to-r from-[#efeaff] to-[#f6f9ff] p-5">
            <p className="text-sm text-slate-500">Net inflow</p>
            <p className="mt-2 text-3xl font-black text-slate-950">₦142,000</p>
            <div className="mt-4 h-2 rounded-full bg-slate-200">
              <div className="h-full w-[72%] rounded-full bg-linear-to-r from-[#403eff] to-[#6533ff]" />
            </div>
            <p className="mt-3 text-sm text-emerald-600">+18% compared to last month</p>
          </div>
        </section>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"

const quickActions = [
  { label: "Send Money", color: "bg-violet-100 text-violet-600", icon: "➤", href: "/transfer" },
  { label: "Pay Bills", color: "bg-emerald-100 text-emerald-600", icon: "▣", href: "/transfer" },
  { label: "Top Up", color: "bg-orange-100 text-orange-500", icon: "+", href: "/accounts" },
  { label: "Buy Airtime", color: "bg-sky-100 text-sky-600", icon: "▯", href: "/transfer" },
  { label: "More", color: "bg-slate-100 text-slate-500", icon: "⌘", href: "/analytics" },
]

type AccountData = {
  accountNumber: string
  balance: number
  accountName: string
  bankName: string
}

type TxData = {
  id: string
  reference: string
  recipientName: string
  amount: number
  type: string
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const [userName, setUserName] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("bankspace_user")
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.name) {
            return parsed.name.trim().split(/\s+/)[0] || "User"
          }
        }
      } catch {
        // Ignore
      }
    }
    return "User"
  })
  const [account, setAccount] = useState<AccountData | null>(null)
  const [transactions, setTransactions] = useState<TxData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Authoritative backend fetches
    Promise.all([
      fetch("/api/auth/me").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/accounts").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/transactions?limit=4").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([userData, accData, txData]) => {
        if (userData?.user?.name) {
          const firstName = userData.user.name.trim().split(/\s+/)[0] || "User"
          setUserName(firstName)
        }
        if (accData?.accounts?.[0]) {
          setAccount(accData.accounts[0])
        }
        if (txData?.transactions) {
          setTransactions(txData.transactions)
        }
      })
      .catch(() => null)
      .finally(() => setIsLoading(false))
  }, [])

  const displayBalance = account ? `₦${account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "₦850,240.00"
  const maskAccount = account?.accountNumber ? `•••• ${account.accountNumber.slice(-4)}` : "•••• 4598"

  return (
    <div>
      <div className="grid gap-8 xl:grid-cols-[1.1fr_.9fr]">
        <section className="flex flex-col justify-center">
          <p className="mb-4 text-slate-500 font-semibold">
            Welcome back, <span className="text-slate-900 font-bold">{userName}</span> 👋
          </p>
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
            <Link href="/transfer" className="rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 hover:opacity-95 transition-opacity">
              Send Money
            </Link>
            <Link href="/analytics" className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors">
              View Analytics
            </Link>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#7257ff] via-[#4335eb] to-[#2639d9] p-8 text-white shadow-2xl shadow-indigo-500/30">
          <div className="absolute inset-x-0 bottom-7 h-28 opacity-30">
            <div className="h-full rounded-[50%] border border-white/40" />
          </div>

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm text-white/75">Total Balance</p>
              <h2 className="mt-4 text-4xl font-bold">{isLoading ? "..." : displayBalance}</h2>
              <div className="mt-4 inline-flex rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                +12.5% vs last month
              </div>
            </div>

            <button className="rounded-2xl bg-white/15 px-3 py-2 text-white backdrop-blur">
              •••
            </button>
          </div>

          <div className="relative z-10 mt-20 flex items-end justify-between">
            <p className="font-semibold tracking-widest">{maskAccount}</p>
            <p className="text-xl font-black italic">VISA</p>
          </div>
        </section>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h2 className="mb-5 font-bold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs transition hover:-translate-y-1 hover:shadow-md"
              >
                <span
                  className={`mx-auto grid h-12 w-12 place-items-center rounded-full text-xl ${action.color}`}
                >
                  {action.icon}
                </span>
                <span className="mt-3 block text-xs font-semibold">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
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
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Recent Transactions</h2>
            <Link className="text-xs font-semibold text-[#3f3cff]" href="/transactions">
              View All
            </Link>
          </div>

          {isLoading ? (
            <div className="py-8 text-center space-y-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#3f3cff] mx-auto" />
              <p className="text-xs text-slate-400">Fetching live transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent transactions recorded.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const isCredit = tx.type === "DEPOSIT"
                const amountText = `${isCredit ? "+" : "-"}₦${Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`

                return (
                  <div key={tx.id} className="flex items-center gap-4 py-4">
                    <span className={`h-11 w-11 rounded-full ${isCredit ? "bg-emerald-500" : "bg-[#3f3cff]"}`} />
                    <div className="mr-auto">
                      <p className="text-sm font-bold text-slate-900">{tx.recipientName || tx.reference}</p>
                      <p className="text-xs text-slate-400">{tx.type} • {tx.status}</p>
                    </div>
                    <p className={`text-sm font-bold ${isCredit ? "text-emerald-500" : "text-slate-950"}`}>{amountText}</p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-bold">Savings Goals</h2>
            <Link className="text-xs font-semibold text-[#3f3cff]" href="/savings">
              View All
            </Link>
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
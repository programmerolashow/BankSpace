'use client'

import { useState } from "react"
import {
  History,
  Search,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react"

const allTransactions = [
  {
    id: "TX-99812",
    name: "Transfer to Michael Okon",
    type: "Transfer",
    category: "Transfers",
    amount: -50000.0,
    status: "Completed",
    date: "Aug 03, 2026 • 02:45 PM",
    badgeBg: "bg-emerald-500",
    account: "Main Checking (•••• 4598)",
  },
  {
    id: "TX-99811",
    name: "Salary Payment - Neominds Tech",
    type: "Income",
    category: "Salary",
    amount: 650000.0,
    status: "Completed",
    date: "Aug 01, 2026 • 09:00 AM",
    badgeBg: "bg-[#3f3cff]",
    account: "Main Checking (•••• 4598)",
  },
  {
    id: "TX-99810",
    name: "Shoprite Supermarket Ikeja",
    type: "Expense",
    category: "Shopping",
    amount: -15600.0,
    status: "Completed",
    date: "Jul 31, 2026 • 06:12 PM",
    badgeBg: "bg-violet-600",
    account: "Visa Platinum (•••• 2210)",
  },
  {
    id: "TX-99809",
    name: "Ikeja Electricity Payment",
    type: "Expense",
    category: "Bills",
    amount: -8200.0,
    status: "Completed",
    date: "Jul 29, 2026 • 11:30 AM",
    badgeBg: "bg-orange-500",
    account: "Main Checking (•••• 4598)",
  },
  {
    id: "TX-99808",
    name: "Apple Store Online USD",
    type: "Expense",
    category: "Shopping",
    amount: -120.0,
    currency: "$",
    status: "Pending",
    date: "Jul 28, 2026 • 04:15 PM",
    badgeBg: "bg-amber-500",
    account: "USD Virtual Card (•••• 2011)",
  },
  {
    id: "TX-99807",
    name: "Dividend Yield Payout",
    type: "Income",
    category: "Investments",
    amount: 32400.0,
    status: "Completed",
    date: "Jul 25, 2026 • 10:00 AM",
    badgeBg: "bg-sky-500",
    account: "Savings Vault (•••• 9876)",
  },
]

export default function TransactionsPage() {
  const [filterType, setFilterType] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTx, setSelectedTx] = useState<(typeof allTransactions)[0] | null>(null)

  const filteredTxs = allTransactions.filter((tx) => {
    const matchesFilter = filterType === "All" || tx.type === filterType
    const matchesSearch =
      tx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eeeeff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#3f3cff]">
                Transaction History
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" /> Real-Time Sync
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Track every payment and transfer
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Filter by category, search reference numbers, or download official account statements.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors">
            <Download className="h-4 w-4 text-[#3f3cff]" /> Export Statement (CSV/PDF)
          </button>
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-[#f8f9ff] p-4 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Inflow</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">+₦682,400.00</p>
          </div>
          <div className="rounded-2xl bg-[#f8f9ff] p-4 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Outflow</p>
            <p className="mt-1 text-2xl font-black text-slate-900">-₦73,800.00</p>
          </div>
          <div className="rounded-2xl bg-[#f8f9ff] p-4 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Transactions</p>
            <p className="mt-1 text-2xl font-black text-[#3f3cff]">{allTransactions.length} Recorded</p>
          </div>
        </div>
      </section>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Type Filter Buttons */}
        <div className="flex items-center rounded-2xl bg-slate-100 p-1.5 border border-slate-200/70 w-full sm:w-auto">
          {["All", "Income", "Expense", "Transfer"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 sm:flex-none rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                filterType === type ? "bg-white text-[#3f3cff] shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
          />
        </div>
      </div>

      {/* Transactions List Table / Cards */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="divide-y divide-slate-100">
          {filteredTxs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No matching transactions found.</div>
          ) : (
            filteredTxs.map((tx) => {
              const isIncome = tx.amount > 0
              const currSymbol = tx.currency || "₦"
              const formattedAmt = `${isIncome ? "+" : "-"}${currSymbol}${Math.abs(tx.amount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}`

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="flex items-center justify-between py-4 px-2 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tx.badgeBg} text-white shadow-md`}>
                      {isIncome ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{tx.name}</p>
                      <p className="text-xs text-slate-400">
                        {tx.category} • {tx.date}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-black text-sm ${isIncome ? "text-emerald-600" : "text-slate-950"}`}>
                      {formattedAmt}
                    </p>
                    <span
                      className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        tx.status === "Completed"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 text-base">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase">Amount</p>
              <p className={`mt-1 text-3xl font-black ${selectedTx.amount > 0 ? "text-emerald-600" : "text-slate-950"}`}>
                {selectedTx.amount > 0 ? "+" : "-"}
                {selectedTx.currency || "₦"}
                {Math.abs(selectedTx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-800">{selectedTx.name}</p>
            </div>

            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Reference ID</span>
                <span className="font-mono font-bold text-slate-900">{selectedTx.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="font-bold text-emerald-600">{selectedTx.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time</span>
                <span className="font-bold text-slate-900">{selectedTx.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Account</span>
                <span className="font-bold text-slate-900">{selectedTx.account}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

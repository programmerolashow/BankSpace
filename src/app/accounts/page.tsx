'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  ShieldCheck,
  Lock,
  TrendingUp,
  CreditCard,
  ChevronRight,
  Building2,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react"

const defaultAcc = {
  id: "primary_zero",
  name: "Main Checking Account",
  type: "Primary Checking",
  number: "0000000000",
  bank: "BankSpace Microfinance Bank",
  balance: 0.0,
  currency: "₦",
  color: "from-[#7257ff] via-[#4335eb] to-[#2639d9]",
  badgeBg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  inflow: "₦0.00",
  outflow: "₦0.00",
}

export default function AccountsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<any[]>([defaultAcc])
  const [selectedAccount, setSelectedAccount] = useState<any>(defaultAcc)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.accounts && data.accounts.length > 0) {
          const formatted = data.accounts.map((a: any, idx: number) => ({
            id: a.id || `acc_${idx}`,
            name: a.accountName || "Main Checking Account",
            type: a.isPrimary ? "Primary Checking" : "Savings",
            number: a.accountNumber || "0000000000",
            bank: a.bankName || "BankSpace Microfinance Bank",
            balance: Number(a.balance || 0),
            currency: a.currency === "USD" ? "$" : "₦",
            color: idx === 0 ? "from-[#7257ff] via-[#4335eb] to-[#2639d9]" : "from-[#080617] via-[#4924b8] to-[#992aff]",
            badgeBg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
            inflow: `${a.currency === "USD" ? "$" : "₦"}${Number(a.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            outflow: "₦0.00",
          }))
          setAccounts(formatted)
          setSelectedAccount(formatted[0])
        } else {
          const zeroAcc = {
            id: "primary_zero",
            name: "Main Checking Account",
            type: "Primary Checking",
            number: "0000000000",
            bank: "BankSpace Microfinance Bank",
            balance: 0.0,
            currency: "₦",
            color: "from-[#7257ff] via-[#4335eb] to-[#2639d9]",
            badgeBg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
            inflow: "₦0.00",
            outflow: "₦0.00",
          }
          setAccounts([zeroAcc])
          setSelectedAccount(zeroAcc)
        }
      })
      .catch(() => {
        const zeroAcc = {
          id: "primary_zero",
          name: "Main Checking Account",
          type: "Primary Checking",
          number: "0000000000",
          bank: "BankSpace Microfinance Bank",
          balance: 0.0,
          currency: "₦",
          color: "from-[#7257ff] via-[#4335eb] to-[#2639d9]",
          badgeBg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          inflow: "₦0.00",
          outflow: "₦0.00",
        }
        setAccounts([zeroAcc])
        setSelectedAccount(zeroAcc)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const totalBalanceNGN = accounts.reduce((acc, curr) => {
    if (curr.currency === "₦") return acc + curr.balance
    return acc + curr.balance * 1600
  }, 0)

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eeeeff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#3f3cff]">
                Accounts Hub
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" /> Tier 3 Account Verified
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Manage your money across all accounts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Track multi-currency balances, organize business & personal funds, and copy account numbers instantly.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity">
              <Plus className="h-4 w-4" /> Add Account
            </button>
            <Link
              href="/transfer"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <ArrowLeftRight className="h-4 w-4 text-[#3f3cff]" /> Internal Transfer
            </Link>
          </div>
        </div>

        {/* Total Net Worth Counter */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Net Worth</p>
            <p className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">
              ₦{totalBalanceNGN.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> +14.2% overall growth
            </p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Monthly Inflow</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">₦610,000.00</p>
            <p className="mt-1 text-xs text-slate-400">Across 4 active accounts</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-4.5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Active Accounts</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">4 Accounts</p>
            <p className="mt-1 text-xs text-[#3f3cff] font-medium">3 NGN Vaults • 1 USD Vault</p>
          </div>
        </div>
      </section>

      {/* Main Grid Section */}
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Accounts List Cards */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Your Bank Accounts</h2>
          {accounts.map((acc) => {
            const isSelected = (selectedAccount?.id || defaultAcc.id) === acc.id

            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className={`group relative overflow-hidden rounded-3xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-[#3f3cff] ring-2 ring-[#3f3cff]/10 shadow-md"
                    : "border-slate-200/80 bg-white hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br ${acc.color} text-white shadow-md`}>
                        <Wallet className="h-5.5 w-5.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{acc.name}</h3>
                        <p className="text-xs text-slate-500">{acc.bank}</p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${acc.badgeBg}`}>
                      {acc.type}
                    </span>
                  </div>

                  <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Available Balance</p>
                      <p className="mt-1 text-2xl sm:text-3xl font-black text-slate-950">
                        {acc.currency}{acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Account Number Copy Action */}
                    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3.5 py-2 border border-slate-200/70">
                      <span className="text-xs font-mono font-bold text-slate-700">{acc.number}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(acc.number, acc.id)
                        }}
                        className="text-slate-400 hover:text-[#3f3cff] transition-colors p-1"
                        title="Copy Account Number"
                      >
                        {copiedId === acc.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Flow summary bar */}
                  <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Inflow this month:</span>
                      <strong className="text-slate-800 font-bold">{acc.inflow}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 justify-end">
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                      <span>Outflow:</span>
                      <strong className="text-slate-800 font-bold">{acc.outflow}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        {/* Selected Account Detail Sidebar */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 text-lg flex items-center justify-between">
              <span>Account Performance</span>
              <span className="text-xs font-medium text-slate-400">Live Breakdown</span>
            </h2>

            <div className={`mt-6 rounded-3xl bg-linear-to-br ${selectedAccount.color} p-6 text-white shadow-xl`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-white/70">{selectedAccount.type}</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">Active</span>
              </div>
              <p className="mt-6 text-3xl font-black">{selectedAccount.currency}{selectedAccount.balance.toLocaleString()}</p>
              <div className="mt-6 flex items-center justify-between text-xs text-white/80 font-mono">
                <span>Acc: {selectedAccount.number}</span>
                <span>BankSpace Pay</span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50">
                <span className="text-xs font-semibold text-slate-600">Daily Transfer Limit</span>
                <span className="text-xs font-bold text-slate-900">₦5,000,000.00</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50">
                <span className="text-xs font-semibold text-slate-600">Interest Accrued</span>
                <span className="text-xs font-bold text-emerald-600">+₦12,450.00</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50">
                <span className="text-xs font-semibold text-slate-600">Auto-Save Protection</span>
                <span className="text-xs font-bold text-[#3f3cff]">Enabled</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
              <button className="flex-1 rounded-xl bg-[#eeeeff] py-2.5 text-xs font-bold text-[#3f3cff] hover:bg-[#e2e2ff] transition-colors">
                Statement
              </button>
              <button className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                Account Rules
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

'use client'

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Globe,
  Award,
} from "lucide-react"

const assetsList = [
  { id: "a1", symbol: "AAPL", name: "Apple Inc.", type: "US Equities", price: "$224.50", change: "+2.4%", value: "$4,490.00", isUp: true },
  { id: "a2", symbol: "TSLA", name: "Tesla Inc.", type: "US Equities", price: "$248.20", change: "+5.1%", value: "$3,723.00", isUp: true },
  { id: "a3", symbol: "BTC", name: "Bitcoin Vault", type: "Crypto Asset", price: "$64,200.00", change: "+4.8%", value: "$5,136.00", isUp: true },
  { id: "a4", symbol: "ETH", name: "Ethereum Staking", type: "Crypto Asset", price: "$3,450.00", change: "-1.2%", value: "$2,760.00", isUp: false },
  { id: "a5", symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "Index Fund", price: "$512.10", change: "+1.1%", value: "$2,341.00", isUp: true },
]

export default function InvestmentsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eeeeff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#3f3cff]">
                Wealth & Investments
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Award className="h-3.5 w-3.5" /> SEC & FINRA Regulated Portfolios
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Grow your wealth in global markets
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Invest in fractional US stocks, index funds, crypto vaults, and high-yield real estate notes.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity">
            <Plus className="h-4 w-4" /> Explore New Assets
          </button>
        </div>

        {/* Portfolio Stats Widgets */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-linear-to-br from-[#080617] via-[#4924b8] to-[#6757ff] p-5 text-white shadow-xl">
            <p className="text-xs font-medium text-white/70">Total Portfolio Value</p>
            <p className="mt-1 text-3xl font-black">$18,450.00</p>
            <p className="mt-1 text-xs text-white/80 font-mono">≈ ₦29,520,000.00 NGN</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total All-Time Returns</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">+$3,360.00</p>
            <p className="mt-1 text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> +22.4% ROI
            </p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Risk Profile</p>
            <p className="mt-1 text-2xl font-black text-[#3f3cff]">Moderate Growth</p>
            <p className="mt-1 text-xs text-slate-400">Balanced Equities & Fixed Income</p>
          </div>
        </div>
      </section>

      {/* Holdings List */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg">Your Investment Holdings</h2>
          <span className="text-xs font-semibold text-[#3f3cff]">5 Assets Held</span>
        </div>

        <div className="divide-y divide-slate-100">
          {assetsList.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between py-4 hover:bg-slate-50 px-3 rounded-2xl transition-colors">
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-[#7257ff] to-[#4335eb] font-bold text-xs text-white shadow-md">
                  {asset.symbol}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{asset.name}</p>
                  <p className="text-xs text-slate-400">{asset.type} • Price: {asset.price}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-black text-slate-900 text-sm">{asset.value}</p>
                <p className={`text-xs font-bold ${asset.isUp ? "text-emerald-600" : "text-rose-600"}`}>
                  {asset.change}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

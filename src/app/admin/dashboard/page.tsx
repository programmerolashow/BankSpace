/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import {
  TrendingUp,
  Wallet,
  DollarSign,
  Users,
  History,
  ArrowLeftRight,
  ShieldCheck,
  Zap,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  Eye,
  Sliders,
  Calendar,
} from "lucide-react"

export const dynamic = "force-dynamic"

function AdminDashboardContent() {
  const router = useRouter()

  const [range, setRange] = useState("30d")
  const [isLoading, setIsLoading] = useState(true)
  const [statsData, setStatsData] = useState<any>({
    metrics: {
      totalPlatformFunds: 0,
      totalRevenue: 0,
      totalVolume: 0,
      totalUsers: 0,
      activeUsers: 0,
    },
    chartData: [],
    topTransactions: [],
    recentUsers: [],
  })

  const fetchStats = async (r = range) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/stats?range=${r}`)
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") {
          window.location.href = "/admin/login"
        } else {
          router.push("/admin/login")
        }
        return
      }

      if (res.ok) {
        const data = await res.json()
        setStatsData(data)
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats(range)
  }, [range])

  const { metrics, chartData, topTransactions, recentUsers } = statsData

  // SVG Chart Height & Scaling helpers
  const maxRevenue = Math.max(...chartData.map((d: any) => d.revenue || 0), 100)
  const maxVolume = Math.max(...chartData.map((d: any) => d.volume || 0), 1000)

  return (
    <div className="space-y-8 pb-12">
      {/* EXECUTIVE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-amber-400" /> Platform Revenue & Executive Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time financial metrics, platform liquidity, fee revenues, and growth analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 text-xs font-bold">
            <button
              onClick={() => setRange("7d")}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                range === "7d" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setRange("30d")}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                range === "30d" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setRange("90d")}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                range === "90d" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              90 Days
            </button>
          </div>

          <button
            onClick={() => fetchStats(range)}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-amber-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* EXECUTIVE FINANCIAL METRICS GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Platform Funds / Liquidity */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Platform Funds (₦)</span>
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 grid place-items-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">
            ₦{Number(metrics.totalPlatformFunds || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> Customer Wallets & Reserves
          </p>
        </div>

        {/* Metric 2: Fee Revenue Collected */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Revenue (Fees ₦)</span>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 grid place-items-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            ₦{Number(metrics.totalRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> Cumulative Fee Earnings
          </p>
        </div>

        {/* Metric 3: Total Transaction Volume */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Settled Volume (₦)</span>
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 grid place-items-center">
              <History className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">
            ₦{Number(metrics.totalVolume || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] font-semibold text-indigo-400">Lifetime Reconciled Volume</p>
        </div>

        {/* Metric 4: Account Holders */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Account Holders</span>
            <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 grid place-items-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-cyan-400">{metrics.activeUsers || 0}</p>
          <p className="text-[11px] font-semibold text-slate-400">Out of {metrics.totalUsers || 0} Total Registrations</p>
        </div>
      </div>

      {/* FINANCIAL VISUAL CHARTS SECTION */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CHART 1: Platform Revenue & Fee Trend (₦) */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" /> Platform Fee Revenue Trend (₦)
              </h2>
              <p className="text-xs text-slate-400">Accumulated fee revenues over time ({range})</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              REVENUE
            </span>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mr-2" /> Building revenue chart...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              No revenue data recorded for selected period.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Visual Bar Chart */}
              <div className="h-56 flex items-end justify-between gap-1 pt-6 px-2 border-b border-slate-800">
                {chartData.map((d: any, idx: number) => {
                  const pct = Math.min(Math.max((d.revenue / maxRevenue) * 100, 4), 100)
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20">
                        <span className="bg-slate-950 text-white font-mono text-[10px] px-2 py-1 rounded-lg border border-slate-800 shadow-xl whitespace-nowrap">
                          {d.date}: ₦{Number(d.revenue).toLocaleString()}
                        </span>
                      </div>
                      <div
                        style={{ height: `${pct}%` }}
                        className="w-full max-w-[24px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg group-hover:from-emerald-500 group-hover:to-emerald-300 transition-all"
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-2">
                <span>{chartData[0]?.date}</span>
                <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>
                <span>{chartData[chartData.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>

        {/* CHART 2: Settlement Volume & Liquidity Trend (₦) */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-400" /> Settled Transaction Volume (₦)
              </h2>
              <p className="text-xs text-slate-400">Daily transaction volume processed ({range})</p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              VOLUME
            </span>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400 mr-2" /> Building volume chart...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              No transaction volume recorded for selected period.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Visual Bar Chart */}
              <div className="h-56 flex items-end justify-between gap-1 pt-6 px-2 border-b border-slate-800">
                {chartData.map((d: any, idx: number) => {
                  const pct = Math.min(Math.max((d.volume / maxVolume) * 100, 4), 100)
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20">
                        <span className="bg-slate-950 text-white font-mono text-[10px] px-2 py-1 rounded-lg border border-slate-800 shadow-xl whitespace-nowrap">
                          {d.date}: ₦{Number(d.volume).toLocaleString()}
                        </span>
                      </div>
                      <div
                        style={{ height: `${pct}%` }}
                        className="w-full max-w-[24px] bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg group-hover:from-amber-500 group-hover:to-amber-300 transition-all"
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-2">
                <span>{chartData[0]?.date}</span>
                <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>
                <span>{chartData[chartData.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUICK EXECUTIVE NAVIGATION SHORTCUTS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => router.push("/admin/transactions")}
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-left hover:bg-slate-800/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <History className="h-6 w-6 text-indigo-400" />
            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-white">Full Transaction Ledger</h3>
          <p className="text-xs text-slate-400 mt-1">Audit deposits, withdrawals, transfers, and fee breakdown</p>
        </button>

        <button
          onClick={() => router.push("/admin/transfers")}
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-left hover:bg-slate-800/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <ArrowLeftRight className="h-6 w-6 text-emerald-400" />
            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-white">Money Movement Transfers</h3>
          <p className="text-xs text-slate-400 mt-1">Monitor NUBAN transfers & Paystack transfer codes</p>
        </button>

        <button
          onClick={() => router.push("/admin/paystack")}
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-left hover:bg-slate-800/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <Zap className="h-6 w-6 text-amber-400" />
            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-white">Paystack Gateway Console</h3>
          <p className="text-xs text-slate-400 mt-1">Audit Paystack provider references & webhook events</p>
        </button>

        <button
          onClick={() => router.push("/admin/kyc")}
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-left hover:bg-slate-800/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-white">KYC Verification Console</h3>
          <p className="text-xs text-slate-400 mt-1">Approve or reject customer identity submissions</p>
        </button>
      </div>

      {/* EXECUTIVE SUMMARY TABLES */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* High Value Transactions Summary */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" /> High-Value Transactions Preview
            </h3>
            <button
              onClick={() => router.push("/admin/transactions")}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View All ➔
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Sender / Recipient</th>
                  <th className="pb-2">Amount (₦)</th>
                  <th className="pb-2 text-right">Fee (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {topTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-mono text-white text-[11px]">{tx.reference}</td>
                    <td className="py-3 text-[11px] text-slate-400">{tx.senderName}</td>
                    <td className="py-3 font-mono font-bold text-amber-400">
                      ₦{Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 font-mono text-right text-emerald-400">
                      ₦{Number(tx.fee || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Registrations Summary */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" /> New Account Registrations
            </h3>
            <button
              onClick={() => router.push("/admin/dashboard?tab=users")}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View All ➔
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="pb-2">User Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">KYC Status</th>
                  <th className="pb-2 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {recentUsers.map((u: any) => (
                  <tr
                    key={u.id}
                    onClick={() => router.push(`/admin/users/${u.id}`)}
                    className="hover:bg-slate-800/30 cursor-pointer"
                  >
                    <td className="py-3 font-bold text-white">{u.name}</td>
                    <td className="py-3 text-[11px] text-slate-400">{u.email}</td>
                    <td className="py-3">
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-slate-800 text-slate-300">
                        {u.kycStatus || "PENDING"}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-[10px] text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Admin Dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  )
}

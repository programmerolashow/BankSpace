'use client'

import { useState, useEffect } from "react"
import {
  TrendingUp,
  Plus,
  Award,
  Loader2,
} from "lucide-react"

type AssetItem = {
  id: string
  symbol: string
  name: string
  assetType: string
  currentPrice: number
  currency: string
  change24h: number
  riskLevel: string
}

type PortfolioMetrics = {
  totalValueUsd: number
  totalValueNgn: number
  allTimeReturnUsd: number
  roiPercent: number
}

export default function InvestmentsPage() {
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    totalValueUsd: 18450.0,
    totalValueNgn: 29520000.0,
    allTimeReturnUsd: 3360.0,
    roiPercent: 22.4,
  })
  const [isLoading, setIsLoading] = useState(true)

  // Buy Order Modal State
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null)
  const [buyAmountUsd, setBuyAmountUsd] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const fetchInvestmentData = async () => {
    try {
      const res = await fetch("/api/investments")
      if (res.ok) {
        const data = await res.json()
        setAssets(data.assets || [])
        if (data.portfolioMetrics) setMetrics(data.portfolioMetrics)
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvestmentData()
  }, [])

  const handleBuyAsset = async () => {
    if (!selectedAsset || !buyAmountUsd || Number(buyAmountUsd) <= 0) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/investments/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedAsset.symbol,
          amountUsd: Number(buyAmountUsd),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Purchase order failed")

      setSelectedAsset(null)
      setBuyAmountUsd("")
      fetchInvestmentData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to execute order")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
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

          <button
            onClick={() => setSelectedAsset(assets[0] || null)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Explore New Assets
          </button>
        </div>

        {/* Portfolio Stats Widgets */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-linear-to-br from-[#080617] via-[#4924b8] to-[#6757ff] p-5 text-white shadow-xl">
            <p className="text-xs font-medium text-white/70">Total Portfolio Value</p>
            <p className="mt-1 text-3xl font-black">${metrics.totalValueUsd.toLocaleString()}</p>
            <p className="mt-1 text-xs text-white/80 font-mono">≈ ₦{metrics.totalValueNgn.toLocaleString()} NGN</p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total All-Time Returns</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">+${metrics.allTimeReturnUsd.toLocaleString()}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> +{metrics.roiPercent}% ROI
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
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg">Available Investment Assets</h2>
          <span className="text-xs font-semibold text-[#3f3cff]">{assets.length} Assets Listed</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#3f3cff] mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading investment catalog...</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assets.map((asset) => {
              const isUp = asset.change24h >= 0

              return (
                <div key={asset.id} className="flex items-center justify-between py-4 hover:bg-slate-50 px-3 rounded-2xl transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-[#7257ff] to-[#4335eb] font-bold text-xs text-white shadow-md">
                      {asset.symbol}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{asset.name}</p>
                      <p className="text-xs text-slate-400">
                        {asset.assetType} • Price: ${asset.currentPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-black text-slate-900 text-sm">${asset.currentPrice.toLocaleString()}</p>
                      <p className={`text-xs font-bold ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {isUp ? "+" : ""}{asset.change24h}%
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAsset(asset)
                        setErrorMsg("")
                      }}
                      className="rounded-xl bg-[#3f3cff] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90"
                    >
                      Buy Asset
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Buy Order Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Buy {selectedAsset.name} ({selectedAsset.symbol})</h3>
              <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-600">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Payment will be debited in NGN from your primary checking account (1 USD = ₦1,600.00).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Investment Amount ($ USD)</label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={buyAmountUsd}
                onChange={(e) => setBuyAmountUsd(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none focus:border-[#3f3cff]"
              />
              {buyAmountUsd && (
                <p className="mt-1 text-xs text-[#3f3cff] font-semibold">
                  Total NGN Debit: ₦{(Number(buyAmountUsd) * 1600).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>

            <button
              onClick={handleBuyAsset}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#3f3cff] py-3.5 text-xs font-bold text-white shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isSubmitting ? "Executing Order..." : "Confirm & Buy Asset"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

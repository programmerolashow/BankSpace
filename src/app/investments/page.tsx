'use client'

import { useState, useEffect } from "react"
import {
  TrendingUp,
  Plus,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Briefcase,
  Layers,
} from "lucide-react"

type HoldingItem = {
  holdingId: string
  productId: string
  symbol: string
  productName: string
  category: string
  unitsOwned: number
  costBasisUnitPrice: number
  costBasis: number
  currentUnitPrice: number
  currentValue: number
  profitLoss: number
  returnPercent: number
  purchaseDate: string
  maturityDate: string | null
  status: string
}

type CatalogProduct = {
  id: string
  symbol: string
  name: string
  description?: string
  category: string
  unitPriceNav: number
  minInvestmentAmount: number
  riskLevel: string
  returnModel: string
  expectedRateAnnual: number
  managementFeePercent: number
  durationText?: string
  liquidity: string
  status: string
}

type AllocationItem = {
  category: string
  amount: number
  percent: number
}

type TxItem = {
  id: string
  reference: string
  recipientName: string
  amount: number
  fee: number
  type: string
  status: string
  createdAt: string
  description?: string
}

export default function InvestmentsPage() {
  const [metrics, setMetrics] = useState({
    totalInvested: 0,
    currentPortfolioValue: 0,
    totalReturns: 0,
    overallReturnPercent: 0,
    holdingsCount: 0,
  })
  const [allocation, setAllocation] = useState<AllocationItem[]>([])
  const [holdings, setHoldings] = useState<HoldingItem[]>([])
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [transactions, setTransactions] = useState<TxItem[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Active Modals
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null)
  const [selectedHolding, setSelectedHolding] = useState<HoldingItem | null>(null)
  const [modalType, setModalType] = useState<"BUY" | "REDEEM" | "DIVIDEND" | null>(null)

  // Form Fields
  const [amountInput, setAmountInput] = useState("")
  const [unitsInput, setUnitsInput] = useState("")

  const fetchPortfolioData = async () => {
    try {
      const res = await fetch("/api/investments")
      if (res.ok) {
        const data = await res.json()
        if (data.portfolioMetrics) setMetrics(data.portfolioMetrics)
        setAllocation(data.allocation || [])
        setHoldings(data.holdings || [])
        setCatalogProducts(data.catalogProducts || [])
        setTransactions(data.transactions || [])
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolioData()
  }, [])

  const handleBuyAsset = async () => {
    if (!selectedProduct || !amountInput || Number(amountInput) <= 0) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/investments/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          symbol: selectedProduct.symbol,
          amount: Number(amountInput),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Purchase order failed")

      closeModal()
      fetchPortfolioData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to execute buy order")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRedeemAsset = async () => {
    if (!selectedHolding || !unitsInput || Number(unitsInput) <= 0) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/investments/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: selectedHolding.holdingId,
          unitsToRedeem: Number(unitsInput),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Redemption failed")

      closeModal()
      fetchPortfolioData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to redeem investment position")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClaimDividend = async () => {
    if (!selectedHolding || !amountInput || Number(amountInput) <= 0) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/investments/dividends/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: selectedHolding.holdingId,
          dividendAmount: Number(amountInput),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Dividend claim failed")

      closeModal()
      fetchPortfolioData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to claim dividend payout")
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeModal = () => {
    setSelectedProduct(null)
    setSelectedHolding(null)
    setModalType(null)
    setAmountInput("")
    setUnitsInput("")
    setErrorMsg("")
  }

  const isProfit = metrics.totalReturns >= 0

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-700">
                Wealth & Capital Markets
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#3f3cff] bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                <TrendingUp className="h-3.5 w-3.5" /> Direct NAV Valuation
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Institutional Asset Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Build a diversified portfolio across Fixed-Income Treasury Bills, Mutual Funds, US Equity ETFs, and Commercial Property Notes.
            </p>
          </div>
        </div>

        {/* Portfolio Valuation Summary Widgets */}
        <div className="mt-8 grid gap-4 sm:grid-cols-4 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Current Portfolio Value</p>
            <p className="mt-1 text-3xl font-black text-slate-900">
              {isLoading ? "..." : `₦${metrics.currentPortfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            </p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Capital Invested</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {isLoading ? "..." : `₦${metrics.totalInvested.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            </p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Portfolio Returns</p>
            <p className={`mt-1 text-2xl font-bold ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
              {isLoading ? "..." : `${isProfit ? "+" : ""}₦${metrics.totalReturns.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            </p>
            <p className="mt-0.5 text-xs font-bold text-slate-400">
              {isProfit ? "+" : ""}{metrics.overallReturnPercent}% All-Time ROI
            </p>
          </div>

          <div className="rounded-2xl bg-[#f8f9ff] p-5 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Active Positions</p>
            <p className="mt-1 text-2xl font-bold text-[#3f3cff]">
              {isLoading ? "..." : `${metrics.holdingsCount} Holdings`}
            </p>
          </div>
        </div>
      </section>

      {/* Category Asset Allocation Breakdown */}
      {allocation.length > 0 && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#3f3cff]" /> Category Asset Allocation
            </h2>
            <span className="text-xs font-semibold text-slate-400">Server-Derived Weighting</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            {allocation.map((item) => (
              <div key={item.category} className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-700">{item.category.replace("_", " ")}</span>
                  <span className="font-black text-[#3f3cff]">{item.percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-linear-to-r from-[#403eff] to-[#6533ff]" style={{ width: `${item.percent}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">₦{item.amount.toLocaleString()}.00</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* User Active Holdings Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#3f3cff]" /> My Investment Holdings
          </h2>
          <span className="text-xs font-semibold text-[#3f3cff]">{holdings.length} Positions Active</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#3f3cff] mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading portfolio positions...</p>
          </div>
        ) : holdings.length === 0 ? (
          <div className="py-16 text-center text-sm font-medium text-slate-500 rounded-3xl border border-slate-200/80 bg-white p-8">
            No investments yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {holdings.map((h) => {
              const posProfit = h.profitLoss >= 0

              return (
                <div key={h.holdingId} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-extrabold uppercase text-[#3f3cff]">
                      {h.category}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      h.status === "MATURED" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {h.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{h.productName}</h3>
                    <p className="text-xs text-slate-400 font-mono">{h.symbol} • {h.unitsOwned.toFixed(4)} Units</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">Current Value</p>
                      <p className="font-black text-slate-900">₦{h.currentValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Profit / Loss</p>
                      <p className={`font-black ${posProfit ? "text-emerald-600" : "text-rose-600"}`}>
                        {posProfit ? "+" : ""}₦{h.profitLoss.toLocaleString()} ({posProfit ? "+" : ""}{h.returnPercent}%)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedHolding(h)
                        setModalType("REDEEM")
                        setErrorMsg("")
                      }}
                      className="rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                    >
                      Redeem Position
                    </button>
                    <button
                      onClick={() => {
                        setSelectedHolding(h)
                        setModalType("DIVIDEND")
                        setErrorMsg("")
                      }}
                      className="rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 py-2.5 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <DollarSign className="h-3.5 w-3.5" /> Claim Dividend
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Available Investment Products Catalog */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg">Available Investment Products</h2>
          <span className="text-xs font-semibold text-[#3f3cff]">{catalogProducts.length} Products Available</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {catalogProducts.map((p) => (
            <div key={p.id} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {p.category.replace("_", " ")}
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {(p.expectedRateAnnual * 100).toFixed(1)}% Est. Annual Yield
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-lg">{p.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{p.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400">NAV Price</p>
                  <p className="font-extrabold text-slate-900">₦{p.unitPriceNav.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Min Order</p>
                  <p className="font-extrabold text-slate-900">₦{p.minInvestmentAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Risk Level</p>
                  <p className="font-extrabold text-indigo-600">{p.riskLevel}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedProduct(p)
                  setModalType("BUY")
                  setErrorMsg("")
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition-opacity"
              >
                <Plus className="h-4 w-4" /> Place Investment Order
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Investment Transaction Log */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg">Investment Transaction History</h2>
          <span className="text-xs font-semibold text-[#3f3cff]">Live Audit Log</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No investment transactions found yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isCredit = tx.type === "INVESTMENT_REDEMPTION" || tx.type === "INVESTMENT_DIVIDEND" || tx.type === "INVESTMENT_LIQUIDATION"

              return (
                <div key={tx.id} className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-9 w-9 place-items-center rounded-xl font-bold text-xs ${
                      isCredit ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-[#3f3cff]"
                    }`}>
                      {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{tx.description || tx.recipientName}</p>
                      <p className="text-[10px] text-slate-400">Ref: {tx.reference} • {new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-black text-xs ${isCredit ? "text-emerald-600" : "text-slate-900"}`}>
                      {isCredit ? "+" : "-"}₦{tx.amount.toLocaleString()}
                    </p>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {tx.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* BUY ORDER MODAL */}
      {modalType === "BUY" && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Buy Order — {selectedProduct.name}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-600">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Min Investment: <strong className="text-slate-900">₦{selectedProduct.minInvestmentAmount.toLocaleString()}.00</strong>
            </p>

            <input
              type="number"
              placeholder="Enter purchase amount (₦)"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none focus:border-[#3f3cff]"
            />
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

      {/* REDEMPTION MODAL */}
      {modalType === "REDEEM" && selectedHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Redeem Position — {selectedHolding.productName}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-600">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Units Owned: <strong className="text-slate-900">{selectedHolding.unitsOwned.toFixed(4)} Units</strong>
            </p>

            <input
              type="number"
              placeholder="Enter units to redeem"
              value={unitsInput}
              onChange={(e) => setUnitsInput(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none focus:border-[#3f3cff]"
            />
            <button
              onClick={handleRedeemAsset}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 py-3.5 text-xs font-bold text-white shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isSubmitting ? "Processing Redemption..." : "Confirm Redemption"}</span>
            </button>
          </div>
        </div>
      )}

      {/* CLAIM DIVIDEND MODAL */}
      {modalType === "DIVIDEND" && selectedHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Claim Dividend — {selectedHolding.productName}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-600">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-slate-500">Enter available dividend distribution amount to claim into checking wallet.</p>

            <input
              type="number"
              placeholder="Enter dividend amount (₦)"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none focus:border-[#3f3cff]"
            />
            <button
              onClick={handleClaimDividend}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isSubmitting ? "Claiming Dividend..." : "Claim Dividend Payout"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

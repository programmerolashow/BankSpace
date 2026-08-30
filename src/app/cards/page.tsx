'use client'

import { useEffect, useState } from "react"
import {
  CreditCard,
  Plus,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Globe,
  Zap,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react"

export default function CardsPage() {
  const [cards, setCards] = useState<any[]>([])
  const [activeCardId, setActiveCardId] = useState<string>("card_1")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const bal = data?.accounts?.[0]?.balance || 0.0
        const formattedBal = `₦${Number(bal).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        setCards([
          {
            id: "card_1",
            name: "BankSpace Platinum Visa",
            type: "Physical Debit Card",
            number: data?.accounts?.[0]?.accountNumber ? `4598 2210 ${data.accounts[0].accountNumber.slice(-4)} 4598` : "4598 2210 0000 4598",
            cvv: "884",
            exp: "08/28",
            balance: formattedBal,
            limit: "₦1,000,000.00",
            status: "Active",
            bg: "bg-linear-to-br from-[#7257ff] via-[#4335eb] to-[#2639d9]",
            brand: "VISA",
          },
        ])
      })
      .catch(() => {
        setCards([
          {
            id: "card_1",
            name: "BankSpace Platinum Visa",
            type: "Physical Debit Card",
            number: "4598 2210 0000 4598",
            cvv: "884",
            exp: "08/28",
            balance: "₦0.00",
            limit: "₦1,000,000.00",
            status: "Active",
            bg: "bg-linear-to-br from-[#7257ff] via-[#4335eb] to-[#2639d9]",
            brand: "VISA",
          },
        ])
      })
      .finally(() => setIsLoading(false))
  }, [])
  const [showCardDetails, setShowCardDetails] = useState(false)
  const [frozenState, setFrozenState] = useState<Record<string, boolean>>({})
  const [onlinePayments, setOnlinePayments] = useState(true)
  const [internationalPayments, setInternationalPayments] = useState(true)
  const [contactless, setContactless] = useState(true)
  const [spendLimit, setSpendLimit] = useState(1500000)
  const [copiedNum, setCopiedNum] = useState(false)

  const activeCard = cards.find((c) => c.id === activeCardId) || cards[0] || {
    id: "card_1",
    name: "BankSpace Platinum Visa",
    type: "Physical Debit Card",
    number: "4598 2210 0000 4598",
    cvv: "884",
    exp: "08/28",
    balance: "₦0.00",
    limit: "₦1,000,000.00",
    status: "Active",
    bg: "bg-linear-to-br from-[#7257ff] via-[#4335eb] to-[#2639d9]",
    brand: "VISA",
  }
  const isFrozen = Boolean(frozenState[activeCard.id])

  const toggleFreeze = (id: string) => {
    setFrozenState((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyCardNumber = (num: string) => {
    navigator.clipboard.writeText(num)
    setCopiedNum(true)
    setTimeout(() => setCopiedNum(false), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eeeeff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#3f3cff]">
                Cards Management
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" /> 3D Secure 2.0 Protection
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Manage your debit, credit & virtual cards
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Freeze cards instantly, adjust monthly spending limits, and control online & international transactions.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity">
            <Plus className="h-4 w-4" /> Request New Card
          </button>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Card Selector & Interactive Card View */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Select Card</h2>
            <span className="text-xs font-semibold text-[#3f3cff]">{cards.length} Cards Active</span>
          </div>

          {/* Cards Carousel Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            {cards.map((card) => {
              const isSelected = card.id === activeCardId
              const cardFrozen = Boolean(frozenState[card.id])

              return (
                <div
                  key={card.id}
                  onClick={() => setActiveCardId(card.id)}
                  className={`relative rounded-2xl p-4 transition-all cursor-pointer border ${
                    isSelected
                      ? "border-[#3f3cff] ring-2 ring-[#3f3cff]/20 bg-slate-900 text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <CreditCard className={`h-5 w-5 ${isSelected ? "text-[#3f3cff]" : "text-slate-400"}`} />
                    {cardFrozen && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500">Frozen</span>}
                  </div>
                  <p className="mt-4 font-bold text-sm truncate">{card.name}</p>
                  <p className="mt-1 text-xs opacity-75">•••• {card.number.slice(-4)}</p>
                  <p className="mt-3 text-xs font-bold">{card.balance}</p>
                </div>
              )
            })}
          </div>

          {/* Main Visual Digital Credit Card Display */}
          <div className={`relative overflow-hidden rounded-[32px] ${activeCard.bg} p-8 text-white shadow-2xl shadow-indigo-500/20 transition-all`}>
            {/* Background design accents */}
            <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full border border-white/20" />
            <div className="absolute right-12 top-8 h-24 w-24 rounded-full border border-white/10" />

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/75">{activeCard.type}</p>
                <p className="mt-1 font-bold text-lg">{activeCard.name}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCardDetails(!showCardDetails)}
                  className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur-md hover:bg-white/30 transition-colors"
                >
                  {showCardDetails ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showCardDetails ? "Hide Details" : "Show Details"}</span>
                </button>
              </div>
            </div>

            {/* Card Balance */}
            <div className="relative z-10 mt-10">
              <p className="text-xs text-white/70">Card Balance</p>
              <p className="mt-1 text-4xl font-black">{activeCard.balance}</p>
            </div>

            {/* Card Number & Expiry */}
            <div className="relative z-10 mt-10 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-lg tracking-widest font-bold">
                    {showCardDetails ? activeCard.number : `•••• •••• •••• ${activeCard.number.slice(-4)}`}
                  </p>
                  {showCardDetails && (
                    <button onClick={() => copyCardNumber(activeCard.number)} className="text-white/80 hover:text-white">
                      {copiedNum ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-white/80 font-mono">
                  <span>EXPIRES: {activeCard.exp}</span>
                  <span>CVV: {showCardDetails ? activeCard.cvv : "•••"}</span>
                </div>
              </div>

              <span className="text-2xl font-black italic tracking-wider">{activeCard.brand}</span>
            </div>
          </div>
        </section>

        {/* Card Controls & Limits Sidebar */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
            <h2 className="font-bold text-slate-900 text-lg">Card Security & Settings</h2>

            {/* Freeze Card Button */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${isFrozen ? "bg-amber-500 text-white" : "bg-emerald-500/10 text-emerald-600"}`}>
                  {isFrozen ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{isFrozen ? "Card is Frozen" : "Freeze Card"}</p>
                  <p className="text-xs text-slate-500">Temporarily block all card transactions</p>
                </div>
              </div>
              <button
                onClick={() => toggleFreeze(activeCard.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                  isFrozen ? "bg-emerald-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {isFrozen ? "Unfreeze" : "Freeze"}
              </button>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Online Payments</p>
                    <p className="text-xs text-slate-400">Allow card usage on websites</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={onlinePayments}
                  onChange={(e) => setOnlinePayments(e.target.checked)}
                  className="h-5 w-5 accent-[#3f3cff] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">International Usage</p>
                    <p className="text-xs text-slate-400">Allow payments outside Nigeria</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={internationalPayments}
                  onChange={(e) => setInternationalPayments(e.target.checked)}
                  className="h-5 w-5 accent-[#3f3cff] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Contactless (NFC)</p>
                    <p className="text-xs text-slate-400">Tap-to-pay at POS terminals</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={contactless}
                  onChange={(e) => setContactless(e.target.checked)}
                  className="h-5 w-5 accent-[#3f3cff] cursor-pointer"
                />
              </div>
            </div>

            {/* Monthly Spend Limit Slider */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Monthly Spending Limit</span>
                <span className="text-[#3f3cff] font-bold">₦{spendLimit.toLocaleString()}.00</span>
              </div>
              <input
                type="range"
                min={100000}
                max={5000000}
                step={50000}
                value={spendLimit}
                onChange={(e) => setSpendLimit(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3f3cff]"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

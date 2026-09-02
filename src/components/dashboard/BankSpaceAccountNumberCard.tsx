'use client'

import { useEffect, useState } from "react"
import { Copy, Check, Share2, ShieldCheck, Building2 } from "lucide-react"

interface BankSpaceAccountNumberCardProps {
  accountNumber?: string
  bankName?: string
  accountName?: string
  externalDvaNuban?: string
  externalBankName?: string
}

export default function BankSpaceAccountNumberCard({
  accountNumber = "8012345678",
  bankName = "BankSpace Microfinance Bank",
  accountName,
  externalDvaNuban,
  externalBankName = "Wema Bank / BankSpace Partner",
}: BankSpaceAccountNumberCardProps) {
  const [copiedInternal, setCopiedInternal] = useState(false)
  const [copiedExternal, setCopiedExternal] = useState(false)
  const [shared, setShared] = useState(false)
  const [dvaDetails, setDvaDetails] = useState<{ dvaNuban: string; dvaBankName: string } | null>(null)

  useEffect(() => {
    fetch("/api/accounts/virtual")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.externalDvaNuban) {
          setDvaDetails({
            dvaNuban: data.externalDvaNuban,
            dvaBankName: data.externalBankName || externalBankName,
          })
        }
      })
      .catch(() => null)
  }, [externalBankName])

  const effectiveDvaNuban = dvaDetails?.dvaNuban || externalDvaNuban || "1234567890"
  const effectiveDvaBankName = dvaDetails?.dvaBankName || externalBankName

  const handleCopyInternal = async () => {
    if (!accountNumber) return
    try {
      await navigator.clipboard.writeText(accountNumber)
      setCopiedInternal(true)
      setTimeout(() => setCopiedInternal(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleCopyExternal = async () => {
    if (!effectiveDvaNuban) return
    try {
      await navigator.clipboard.writeText(effectiveDvaNuban)
      setCopiedExternal(true)
      setTimeout(() => setCopiedExternal(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleShare = async () => {
    const textToShare = `My BankSpace Payment Details:\n\n1. BankSpace Account Number (P2P): ${accountNumber}\nBank: ${bankName}\n\n2. External Bank Transfer Account (NUBAN): ${effectiveDvaNuban}\nBank: ${effectiveDvaBankName}\nAccount Name: ${accountName || "BankSpace User"}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "BankSpace Payment Identifiers",
          text: textToShare,
        })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
        return
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(textToShare)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              BankSpace Dedicated Accounts
            </p>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{accountName || "BankSpace Customer"}</p>
          </div>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
          title="Share Payment Details"
        >
          {shared ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
          <span>{shared ? "Shared!" : "Share All"}</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 border-y border-slate-100 py-3">
        {/* Card 1: BankSpace Internal Identifier */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
              BankSpace Account Number
            </span>
            <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
              P2P Transfers
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black tracking-widest text-slate-900 font-mono">
              {accountNumber}
            </span>
            <button
              onClick={handleCopyInternal}
              className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Copy BankSpace Identifier"
            >
              {copiedInternal ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[10px] font-medium text-slate-500">{bankName}</p>
        </div>

        {/* Card 2: External Bank Transfer Account (NUBAN) */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <Building2 className="h-3 w-3" /> External Bank NUBAN
            </span>
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
              Other Banks
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black tracking-widest text-slate-900 font-mono">
              {effectiveDvaNuban}
            </span>
            <button
              onClick={handleCopyExternal}
              className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Copy External NUBAN"
            >
              {copiedExternal ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[10px] font-semibold text-emerald-800">{effectiveDvaBankName}</p>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-medium leading-normal">
        Use <strong>{accountNumber}</strong> for instant BankSpace → BankSpace transfers. Use <strong>{effectiveDvaNuban}</strong> ({effectiveDvaBankName}) to receive funds from external commercial banks via Paystack DVA.
      </p>
    </div>
  )
}

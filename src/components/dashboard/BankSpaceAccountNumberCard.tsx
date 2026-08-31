'use client'

import { useState } from "react"
import { Copy, Check, Share2, ShieldCheck } from "lucide-react"

interface BankSpaceAccountNumberCardProps {
  accountNumber?: string
  bankName?: string
  accountName?: string
}

export default function BankSpaceAccountNumberCard({
  accountNumber = "8012345678",
  bankName = "BankSpace Microfinance Bank",
  accountName,
}: BankSpaceAccountNumberCardProps) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  const handleCopy = async () => {
    if (!accountNumber) return
    try {
      await navigator.clipboard.writeText(accountNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleShare = async () => {
    const textToShare = `My BankSpace Account Details:\nBank: ${bankName}\nAccount Name: ${accountName || "BankSpace User"}\nAccount Number: ${accountNumber}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "BankSpace Account Identifier",
          text: textToShare,
        })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
        return
      } catch {
        // Fallback to clipboard
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              BankSpace Account Number
            </p>
            <p className="text-xs font-semibold text-slate-600">{bankName}</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
          Active Identifier
        </span>
      </div>

      <div className="flex items-baseline justify-between border-y border-slate-100 py-3">
        <div>
          <span className="block text-2xl font-black tracking-widest text-slate-900 font-mono">
            {accountNumber}
          </span>
          {accountName && (
            <p className="text-xs text-slate-500 font-medium mt-0.5">{accountName}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
            title="Copy Account Number"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
            title="Share Account Details"
          >
            {shared ? (
              <>
                <Check className="h-3.5 w-3.5 text-indigo-600" />
                <span>Shared!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-indigo-600" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-medium leading-normal">
        Your 10-digit phone number is your unique BankSpace account identifier for transfers and deposits.
      </p>
    </div>
  )
}

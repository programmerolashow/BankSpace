'use client'

import { useEffect, useState } from "react"
import {
  Copy,
  Check,
  Share2,
  ShieldCheck,
  Building2,
  ArrowLeft,
  RotateCw,
  Info,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react"
import Link from "next/link"

export default function ReceiveMoneyPage() {
  const [accountName, setAccountName] = useState("ILLIAS OLANREWAJU")
  const [bankSpaceAcc, setBankSpaceAcc] = useState("8012345678")
  const [dvaNuban, setDvaNuban] = useState("1234567890")
  const [dvaBankName, setDvaBankName] = useState("Wema Bank / BankSpace Partner")

  const [copiedBankSpace, setCopiedBankSpace] = useState(false)
  const [copiedDva, setCopiedDva] = useState(false)
  const [shared, setShared] = useState(false)

  const [isRequerying, setIsRequerying] = useState(false)
  const [requeryStatus, setRequeryStatus] = useState<string | null>(null)

  useEffect(() => {
    // Fetch User Session details
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setAccountName(data.user.name.toUpperCase())
        }
      })
      .catch(() => null)

    // Fetch Dedicated Virtual Account details
    fetch("/api/accounts/virtual")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          if (data.bankSpaceAccountNumber) setBankSpaceAcc(data.bankSpaceAccountNumber)
          if (data.externalDvaNuban) setDvaNuban(data.externalDvaNuban)
          if (data.externalBankName) setDvaBankName(data.externalBankName)
        }
      })
      .catch(() => null)
  }, [])

  const handleCopyBankSpace = async () => {
    try {
      await navigator.clipboard.writeText(bankSpaceAcc)
      setCopiedBankSpace(true)
      setTimeout(() => setCopiedBankSpace(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleCopyDva = async () => {
    try {
      await navigator.clipboard.writeText(dvaNuban)
      setCopiedDva(true)
      setTimeout(() => setCopiedDva(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleShareDetails = async () => {
    const textToShare = `My BankSpace Receiving Details:\n\n1. BankSpace User (P2P Transfer):\nBank: BankSpace Microfinance Bank\nAccount Number: ${bankSpaceAcc}\nAccount Name: ${accountName}\n\n2. Other Banks (External Transfer):\nBank: ${dvaBankName}\nAccount Number: ${dvaNuban}\nAccount Name: ${accountName}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "BankSpace Payment Details",
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

  const handleRequeryTransfer = async () => {
    setIsRequerying(true)
    setRequeryStatus(null)

    try {
      const res = await fetch("/api/accounts/virtual/requery", { method: "POST" })
      const data = await res.json()

      if (res.ok && data?.success) {
        setRequeryStatus(data.message || "Requery completed successfully.")
      } else {
        setRequeryStatus(data?.message || "Could not check expected transfer. Please try again.")
      }
    } catch {
      setRequeryStatus("Network error during transfer check.")
    } finally {
      setIsRequerying(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Receive Money
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Choose how you want to receive funds into your BankSpace account.
            </p>
          </div>

          <button
            onClick={handleRequeryTransfer}
            disabled={isRequerying}
            className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RotateCw className={`h-4 w-4 ${isRequerying ? "animate-spin" : ""}`} />
            <span>{isRequerying ? "Checking Provider..." : "Check Expected Transfer"}</span>
          </button>
        </div>

        {requeryStatus && (
          <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs font-bold text-indigo-900 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>{requeryStatus}</span>
          </div>
        )}
      </section>

      {/* EXPLANATION CALLOUT BANNER */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 font-semibold text-xs text-amber-950 flex items-start gap-3 shadow-xs">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Clear Guidance:</strong> Use your <strong>BankSpace account number</strong> for transfers from other BankSpace users. Use your <strong>dedicated bank account details</strong> when receiving money from another bank.
        </p>
      </div>

      {/* DUAL RECEIVING OPTIONS GRID */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* OPTION 1: BANKSPACE USER (P2P) */}
        <section className="rounded-[28px] border border-indigo-200/90 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full bg-indigo-50/80 pointer-events-none" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider">
                BankSpace User
              </span>
              <span className="text-[11px] font-extrabold text-emerald-600 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 fill-emerald-500" /> Instant (0% Fee)
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Receive from BankSpace
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                For transfers coming from another BankSpace account holder.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Your BankSpace Account Number
                </span>
                <span className="text-2xl font-black text-slate-950 font-mono tracking-widest block mt-0.5">
                  {bankSpaceAcc}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Account Name
                </span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mt-0.5">
                  {accountName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCopyBankSpace}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              {copiedBankSpace ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-500" />
                  <span>Copy Account Number</span>
                </>
              )}
            </button>

            <button
              onClick={handleShareDetails}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
              title="Share Account Details"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </section>

        {/* OPTION 2: OTHER BANKS (EXTERNAL NUBAN) */}
        <section className="rounded-[28px] border border-emerald-200/90 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full bg-emerald-50/80 pointer-events-none" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">
                Other Banks
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Commercial Banks
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Receive from Other Banks
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                For receiving transfers from GTBank, Zenith, Access, Kuda, FirstBank, etc.
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50/40 p-4 border border-emerald-200/70 space-y-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1 block">
                  <Building2 className="h-3 w-3" /> Bank Name
                </span>
                <span className="text-sm font-bold text-emerald-950 block mt-0.5">
                  {dvaBankName}
                </span>
              </div>

              <div className="pt-2 border-t border-emerald-200/60">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                  Account Number (NUBAN)
                </span>
                <span className="text-2xl font-black text-slate-950 font-mono tracking-widest block mt-0.5">
                  {dvaNuban}
                </span>
              </div>

              <div className="pt-2 border-t border-emerald-200/60">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                  Account Name
                </span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mt-0.5">
                  {accountName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCopyDva}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              {copiedDva ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-500" />
                  <span>Copy Account Number</span>
                </>
              )}
            </button>

            <button
              onClick={handleShareDetails}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer"
              title="Share Account Details"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from "react"
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Building2,
  UserCheck,
  Receipt,
  FileText,
  KeyRound,
  Lock,
} from "lucide-react"

const beneficiaries = [
  { id: "b1", name: "Michael Okon", bank: "BankSpace MFB", acc: "2019482910", avatar: "MO", color: "bg-purple-600" },
  { id: "b2", name: "Sophia Martinez", bank: "Zenith Bank", acc: "1098274619", avatar: "SM", color: "bg-blue-600" },
  { id: "b3", name: "David Adeleke", bank: "GTBank", acc: "0123984712", avatar: "DA", color: "bg-emerald-600" },
  { id: "b4", name: "Neominds Corp", bank: "BankSpace MFB", acc: "9988112233", avatar: "NC", color: "bg-orange-600" },
]

export default function TransferPage() {
  const [sourceAcc, setSourceAcc] = useState("Main Checking (₦0.00)")
  const [accountOptions, setAccountOptions] = useState<string[]>(["Main Checking (₦0.00)"])
  const [banksList, setBanksList] = useState<any[]>([])
  const [selectedBankCode, setSelectedBankCode] = useState("000000")
  const [recipientAcc, setRecipientAcc] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [recipientStatus, setRecipientStatus] = useState("ACTIVE")
  const [bankName, setBankName] = useState("BankSpace Microfinance Bank")
  const [category, setCategory] = useState("GENERAL")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [pinInput, setPinInput] = useState("")

  const [isResolvingAccount, setIsResolvingAccount] = useState(false)
  const [accountResolutionSuccess, setAccountResolutionSuccess] = useState<boolean | null>(null)
  const [resolutionErrorMessage, setResolutionErrorMessage] = useState("")

  // Transfer State Machine: "FORM" | "REVIEW" | "PIN_PROMPT" | "PROCESSING" | "RESULT"
  const [step, setStep] = useState<"FORM" | "REVIEW" | "PIN_PROMPT" | "PROCESSING" | "RESULT">("FORM")
  const [errorMessage, setErrorMessage] = useState("")
  const [txResult, setTxResult] = useState<any>(null)

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.accounts && data.accounts.length > 0) {
          const opts = data.accounts.map(
            (a: any) => `${a.accountName || "Main Checking"} (₦${Number(a.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })})`
          )
          setAccountOptions(opts)
          setSourceAcc(opts[0])
        }
      })
      .catch(() => null)

    // Fetch live banks list
    fetch("/api/banks")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.banks && Array.isArray(data.banks)) {
          setBanksList(data.banks)
        }
      })
      .catch(() => null)
  }, [])

  // Auto-resolve 10-digit BankSpace account number
  useEffect(() => {
    const sanitized = recipientAcc.trim()
    if (sanitized.length === 10 && /^\d+$/.test(sanitized)) {
      setIsResolvingAccount(true)
      setAccountResolutionSuccess(null)
      setResolutionErrorMessage("")

      fetch("/api/banks/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber: sanitized, bankCode: selectedBankCode }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => null)
          const name = data?.data?.accountName || data?.accountName
          if (res.ok && data?.success && name) {
            setRecipientName(name.toUpperCase())
            setRecipientStatus(data?.accountStatus || data?.data?.accountStatus || "ACTIVE")
            setAccountResolutionSuccess(true)
            setResolutionErrorMessage("")
          } else {
            setRecipientName("")
            setAccountResolutionSuccess(false)
            setResolutionErrorMessage(
              data?.message || data?.error || "BankSpace account number could not be resolved. Please check the 10-digit number."
            )
          }
        })
        .catch(() => {
          setRecipientName("")
          setAccountResolutionSuccess(false)
          setResolutionErrorMessage("Account verification timed out. Please try again.")
        })
        .finally(() => setIsResolvingAccount(false))
    } else {
      setAccountResolutionSuccess(null)
      setRecipientName("")
      setResolutionErrorMessage("")
    }
  }, [recipientAcc, selectedBankCode])

  const selectBeneficiary = (b: (typeof beneficiaries)[0]) => {
    setRecipientAcc(b.acc)
    setRecipientName(b.name.toUpperCase())
    setBankName(b.bank)
    setErrorMessage("")
  }

  const handleFormReview = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    const sanitizedAcc = String(recipientAcc || "").trim()
    if (!sanitizedAcc || sanitizedAcc.length < 10 || !/^\d+$/.test(sanitizedAcc)) {
      setErrorMessage("Please enter a valid 10-digit BankSpace account number.")
      return
    }

    if (isResolvingAccount) {
      setErrorMessage("Verifying recipient account with BankSpace backend... Please wait.")
      return
    }

    if (accountResolutionSuccess === false || !recipientName) {
      setErrorMessage(resolutionErrorMessage || "BankSpace account number could not be verified.")
      return
    }

    const numAmt = Number(amount)
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMessage("Please enter a valid transfer amount greater than ₦0.00.")
      return
    }

    setStep("REVIEW")
  }

  const executeConfirmTransfer = async () => {
    if (!pinInput || pinInput.trim().length !== 4) {
      setErrorMessage("Please enter your 4-digit Transaction PIN.")
      return
    }

    setStep("PROCESSING")
    setErrorMessage("")

    // Generate unique idempotency key for this transfer attempt
    const idempotencyKey = "IDEM_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000)

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          recipientAccount: recipientAcc.trim(),
          recipientName: recipientName || undefined,
          bankName,
          bankCode: selectedBankCode,
          category,
          amount: Math.round(Number(amount) * 100) / 100,
          note: note.trim() || undefined,
          pin: pinInput.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Transfer failed to process.")
      }

      setTxResult(data.transaction || {
        reference: idempotencyKey,
        recipientName: recipientName || recipientAcc,
        accountNumber: recipientAcc,
        bankName,
        amount: Number(amount),
        fee: 0.0,
        status: "SUCCESSFUL",
        createdAt: new Date().toISOString(),
      })
      setStep("RESULT")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Transfer failed to complete.")
      setStep("REVIEW")
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Instant P2P Ledger Transfer
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              BankSpace → BankSpace Transfer
            </h1>
            <p className="mt-2 text-sm text-slate-500 font-medium max-w-xl">
              Transfer funds instantly to any 10-digit BankSpace account number with zero fees and real-time ledger settlement.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-200/70 shrink-0">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-white font-black">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Transfer Fee</p>
              <p className="text-sm font-black text-emerald-600">₦0.00 (Instant 0% Fee)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Transfer Flow Card */}
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {errorMessage && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-600 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: TRANSFER FORM */}
          {step === "FORM" && (
            <form onSubmit={handleFormReview} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Source Account
                  </label>
                  <select
                    value={sourceAcc}
                    onChange={(e) => setSourceAcc(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-[#3f3cff]"
                  >
                    {accountOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DESTINATION BANK SELECTOR */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Destination Institution
                  </label>
                  <select
                    value={selectedBankCode}
                    onChange={(e) => {
                      setSelectedBankCode(e.target.value)
                      const found = banksList.find((b) => b.code === e.target.value)
                      if (found) setBankName(found.name)
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-[#3f3cff]"
                  >
                    <option value="000000">BankSpace Microfinance Bank (Instant P2P - 0% Fee)</option>
                    {banksList
                      .filter((b) => b.code !== "000000")
                      .map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                  </select>
                </div>

                {/* 10-DIGIT ACCOUNT NUMBER INPUT & AUTO-RESOLVE */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                    <span>10-Digit Account Number *</span>
                    {isResolvingAccount && (
                      <span className="text-[#3f3cff] font-semibold flex items-center gap-1 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" /> Resolving Backend...
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. 8012345678"
                    value={recipientAcc}
                    onChange={(e) => setRecipientAcc(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-black text-slate-900 tracking-widest font-mono outline-none focus:border-[#3f3cff]"
                    required
                  />
                </div>

                {/* RECIPIENT CONFIRMATION CARD */}
                {accountResolutionSuccess && recipientName && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-emerald-600" /> Confirmed Recipient
                      </span>
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 uppercase">
                        {recipientStatus}
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-950 uppercase tracking-wider">
                      {recipientName}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-600 font-mono pt-1 border-t border-emerald-500/20">
                      <span>Acc: {recipientAcc}</span>
                      <span className="text-emerald-700 font-bold">{bankName}</span>
                    </div>
                  </div>
                )}

                {accountResolutionSuccess === false && resolutionErrorMessage && (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3.5 text-xs font-bold text-rose-600 animate-in fade-in flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{resolutionErrorMessage}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Transfer Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#3f3cff]"
                    >
                      <option value="GENERAL">General Payment</option>
                      <option value="BILLS">Bills & Utilities</option>
                      <option value="FAMILY">Family & Friends</option>
                      <option value="BUSINESS">Business Payment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Transfer Amount (₦) *
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-black text-slate-900 outline-none focus:border-[#3f3cff]"
                      required
                    />
                  </div>
                </div>

                {/* Preset Amount Pills */}
                <div className="flex flex-wrap gap-2">
                  {["1000", "5000", "10000", "50000", "100000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#3f3cff] hover:text-[#3f3cff] transition-colors cursor-pointer"
                    >
                      +₦{Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Add Note / Remark (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Payment for invoice #8092"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!accountResolutionSuccess || !amount}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>Review & Confirm Transfer</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* STEP 2: REVIEW TRANSFER & PIN AUTHENTICATION */}
          {step === "REVIEW" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200/80 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#3f3cff]" /> Itemized Transfer Confirmation
                </h3>

                <div className="divide-y divide-slate-200/70 text-xs sm:text-sm">
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Source Account</span>
                    <span className="font-semibold text-slate-900">{sourceAcc}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Recipient Name</span>
                    <span className="font-black text-slate-900 uppercase">{recipientName}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">BankSpace Account Number</span>
                    <span className="font-mono font-bold text-[#3f3cff]">{recipientAcc}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Institution</span>
                    <span className="font-semibold text-slate-900">{bankName}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Transfer Amount</span>
                    <span className="font-black text-slate-900">
                      ₦{Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Transfer Fee</span>
                    <span className="font-bold text-emerald-600">Free (₦0.00)</span>
                  </div>
                  <div className="flex justify-between py-3 border-t border-slate-300 font-bold text-sm">
                    <span className="text-slate-900">Total Debit</span>
                    <span className="text-[#3f3cff] font-black text-base">
                      ₦{Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-DIGIT TRANSACTION PIN PROMPT */}
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-[#3f3cff]" /> Enter 4-Digit Transaction PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-center text-lg font-mono font-black tracking-widest text-slate-900 outline-none focus:border-[#3f3cff]"
                />
                <p className="text-[11px] text-slate-500 text-center">
                  Enter your 4-digit PIN (Default: 0000 or your account security PIN).
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("FORM")}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Back & Edit
                </button>
                <button
                  type="button"
                  onClick={executeConfirmTransfer}
                  disabled={pinInput.length !== 4}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" /> Authorize & Transfer ₦{Number(amount).toLocaleString()}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING SPINNER */}
          {step === "PROCESSING" && (
            <div className="py-12 text-center space-y-4 animate-in fade-in">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#3f3cff]" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Processing BankSpace Transfer...</h3>
                <p className="text-xs text-slate-500 mt-1">Executing double-entry ledger debit and crediting beneficiary.</p>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESSFUL RESULT RECEIPT */}
          {step === "RESULT" && txResult && (
            <div className="space-y-6 animate-in fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Transfer Successful!</h2>
                <p className="text-xs text-slate-500 font-semibold">
                  ₦{Number(txResult.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} has been transferred to {txResult.recipientName}.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200/80 divide-y divide-slate-200/60 text-xs sm:text-sm">
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Transaction Reference</span>
                  <span className="font-mono font-bold text-slate-900">{txResult.reference}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Recipient Name</span>
                  <span className="font-bold text-slate-900 uppercase">{txResult.recipientName}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Account Number</span>
                  <span className="font-mono font-bold text-slate-900">{txResult.accountNumber || recipientAcc}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Institution</span>
                  <span className="font-semibold text-slate-900">{txResult.bankName || "BankSpace MFB"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Date & Time</span>
                  <span className="font-medium text-slate-700">{new Date(txResult.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep("FORM")
                  setAmount("")
                  setRecipientAcc("")
                  setRecipientName("")
                  setPinInput("")
                  setAccountResolutionSuccess(null)
                }}
                className="w-full rounded-2xl bg-slate-900 py-3.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Make Another Transfer
              </button>
            </div>
          )}
        </section>

        {/* Quick Beneficiaries Sidebar */}
        <section className="space-y-6">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>Quick Beneficiaries</span>
              <span className="text-xs text-indigo-600 font-semibold cursor-pointer">Saved (4)</span>
            </h3>

            <div className="space-y-3">
              {beneficiaries.map((b) => (
                <div
                  key={b.id}
                  onClick={() => selectBeneficiary(b)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/80 transition-all cursor-pointer"
                >
                  <div className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-black text-white ${b.color}`}>
                    {b.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{b.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{b.acc} • {b.bank}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

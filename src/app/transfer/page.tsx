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
  const [recipientAcc, setRecipientAcc] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [bankName, setBankName] = useState("BankSpace Microfinance Bank")
  const [category, setCategory] = useState("GENERAL")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")

  // Transfer State Machine: "FORM" | "REVIEW" | "PROCESSING" | "RESULT"
  const [step, setStep] = useState<"FORM" | "REVIEW" | "PROCESSING" | "RESULT">("FORM")
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
  }, [])

  const selectBeneficiary = (b: (typeof beneficiaries)[0]) => {
    setRecipientAcc(b.acc)
    setRecipientName(b.name)
    setBankName(b.bank)
    setErrorMessage("")
  }

  const handleReviewStep = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    const sanitizedAcc = String(recipientAcc || "").trim()
    if (!sanitizedAcc || sanitizedAcc.length < 10 || !/^\d+$/.test(sanitizedAcc)) {
      setErrorMessage("Please enter a valid 10-digit account number.")
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
          recipientAccount: recipientAcc,
          recipientName: recipientName || undefined,
          bankName,
          category,
          amount: Math.round(Number(amount) * 100) / 100,
          note: note.trim() || undefined,
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
      setStep("FORM")
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
                Money Transfer
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Zap className="h-3.5 w-3.5" /> Idempotent Instant Settlement
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Send money anywhere instantly
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Transfer funds zero-fee to BankSpace accounts or any bank across Nigeria with end-to-end encryption.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid: Transfer Steps & Beneficiaries */}
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Transfer Form / Review / Result Section */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Send className="h-5 w-5 text-[#3f3cff]" /> Transfer Journey
            </h2>
            <span className="text-xs font-bold text-[#3f3cff] bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
              {step === "FORM" && "Step 1 of 3: Enter Details"}
              {step === "REVIEW" && "Step 2 of 3: Review Transfer"}
              {step === "PROCESSING" && "Processing Handshake..."}
              {step === "RESULT" && "Step 3 of 3: Confirmation Receipt"}
            </span>
          </div>

          {errorMessage && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: FORM INPUT */}
          {step === "FORM" && (
            <form onSubmit={handleReviewStep} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Source Account
                </label>
                <select
                  value={sourceAcc}
                  onChange={(e) => setSourceAcc(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff]"
                >
                  {accountOptions.map((opt, i) => (
                    <option key={i}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Bank Name
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff]"
                  >
                    <option>BankSpace Microfinance Bank</option>
                    <option>GTBank</option>
                    <option>Zenith Bank</option>
                    <option>First Bank of Nigeria</option>
                    <option>Kuda Bank</option>
                    <option>OPay / Palmpay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0123456789"
                    value={recipientAcc}
                    onChange={(e) => setRecipientAcc(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff]"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Category (Budget Tagging)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff]"
                  >
                    <option value="GENERAL">General Transfer</option>
                    <option value="FOOD">Food & Dining</option>
                    <option value="GROCERIES">Groceries & Supermarket</option>
                    <option value="UTILITIES">Bills & Utilities</option>
                    <option value="TRANSPORT">Transport & Fuel</option>
                    <option value="ENTERTAINMENT">Entertainment & Media</option>
                    <option value="SHOPPING">Shopping & Retail</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Amount (₦)
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
                {["5000", "10000", "50000", "100000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#3f3cff] hover:text-[#3f3cff] transition-colors"
                  >
                    +₦{Number(preset).toLocaleString()}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Add Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="What is this transfer for?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff]"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all cursor-pointer"
              >
                Review Transfer Details <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* STEP 2: REVIEW TRANSFER */}
          {step === "REVIEW" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200/80 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#3f3cff]" /> Itemized Transfer Summary
                </h3>

                <div className="divide-y divide-slate-200/70 text-xs sm:text-sm">
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Source Account</span>
                    <span className="font-semibold text-slate-900">{sourceAcc}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Recipient Account</span>
                    <span className="font-bold text-slate-900">{recipientAcc}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Recipient Bank</span>
                    <span className="font-semibold text-slate-900">{bankName}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Category</span>
                    <span className="font-semibold text-violet-600">{category}</span>
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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("FORM")}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Back & Edit
                </button>
                <button
                  type="button"
                  onClick={executeConfirmTransfer}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95"
                >
                  Confirm & Send Money <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING SPINNER */}
          {step === "PROCESSING" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#3f3cff] mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">Executing Database Handshake...</h3>
              <p className="text-xs text-slate-500">
                Verifying balance guards, creating double-entry ledger entries, and dispatching notifications.
              </p>
            </div>
          )}

          {/* STEP 4: AUTHORITATIVE CONFIRMATION RECEIPT */}
          {step === "RESULT" && txResult && (
            <div className="rounded-3xl bg-emerald-50/70 border border-emerald-200 p-6 sm:p-8 space-y-6 text-slate-900">
              <div className="text-center space-y-3">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black">
                  {txResult.status === "SUCCESSFUL" ? "Transfer Confirmed!" : `Transfer ${txResult.status}`}
                </h3>
                <p className="text-xs text-emerald-800 font-semibold">
                  Backend Financial Record Verified & Double-Entry Ledger Created
                </p>
              </div>

              {/* Real Backend Receipt Table */}
              <div className="rounded-2xl bg-white p-5 border border-emerald-100 divide-y divide-slate-100 text-xs sm:text-sm">
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Recipient</span>
                  <span className="font-bold text-slate-900">{txResult.recipientName || recipientAcc}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Account Number</span>
                  <span className="font-mono font-semibold text-slate-800">{txResult.accountNumber || recipientAcc}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Amount Sent</span>
                  <span className="font-black text-slate-900">
                    ₦{Number(txResult.amount || amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Fee Applied</span>
                  <span className="font-bold text-emerald-600">
                    ₦{Number(txResult.fee || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Transaction Reference</span>
                  <span className="font-mono text-xs text-[#3f3cff] font-bold">{txResult.reference}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Status</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[11px] font-bold uppercase">
                    {txResult.status || "SUCCESSFUL"}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Timestamp</span>
                  <span className="text-xs text-slate-600 font-medium">
                    {txResult.createdAt ? new Date(txResult.createdAt).toLocaleString() : new Date().toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setStep("FORM")
                  setAmount("")
                  setRecipientAcc("")
                  setRecipientName("")
                  setNote("")
                  setErrorMessage("")
                  setTxResult(null)
                }}
                className="w-full rounded-2xl bg-[#3f3cff] py-3.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#3431e0]"
              >
                Make Another Transfer
              </button>
            </div>
          )}
        </section>

        {/* Quick Beneficiaries & Security Card */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-slate-900 text-lg">Quick Beneficiaries</h2>
            <div className="space-y-3">
              {beneficiaries.map((b) => (
                <div
                  key={b.id}
                  onClick={() => selectBeneficiary(b)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-xl ${b.color} text-white font-bold text-xs`}>
                      {b.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{b.name}</p>
                      <p className="text-[10px] text-slate-500">{b.bank} • {b.acc}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#3f3cff]">Select</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-linear-to-br from-[#0a0727] to-[#251e60] p-6 text-white shadow-md space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="h-5 w-5" /> Bank-Grade Security
            </div>
            <p className="text-xs leading-relaxed text-white/80">
              All transfers are processed through isolated database transactions with idempotency locks to prevent duplicate debits.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

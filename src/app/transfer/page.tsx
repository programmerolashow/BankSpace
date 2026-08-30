'use client'

import { useEffect, useState } from "react"
import {
  Send,
  CheckCircle2,
  Zap,
} from "lucide-react"

const beneficiaries = [
  { id: "b1", name: "Michael Okon", bank: "Kuda Bank", acc: "2019482910", avatar: "MO", color: "bg-purple-600" },
  { id: "b2", name: "Sophia Martinez", bank: "Zenith Bank", acc: "1098274619", avatar: "SM", color: "bg-blue-600" },
  { id: "b3", name: "David Adeleke", bank: "GTBank", acc: "0123984712", avatar: "DA", color: "bg-emerald-600" },
  { id: "b4", name: "Neominds Corp", bank: "BankSpace", acc: "9988112233", avatar: "NC", color: "bg-orange-600" },
]

export default function TransferPage() {
  const [sourceAcc, setSourceAcc] = useState("Main Checking (₦0.00)")
  const [accountOptions, setAccountOptions] = useState<string[]>(["Main Checking (₦0.00)"])
  const [recipientAcc, setRecipientAcc] = useState("")

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
  const [bankName, setBankName] = useState("BankSpace Microfinance Bank")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [isConfirmModal, setIsConfirmModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const selectBeneficiary = (b: (typeof beneficiaries)[0]) => {
    setRecipientAcc(b.acc)
    setBankName(b.bank)
    setErrorMessage("")
  }

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    if (!recipientAcc || recipientAcc.length < 10) {
      setErrorMessage("Please enter a valid 10-digit account number.")
      return
    }
    if (!amount || Number(amount) <= 0) {
      setErrorMessage("Please enter a valid transfer amount greater than ₦0.00.")
      return
    }
    setIsConfirmModal(true)
  }

  const confirmTransfer = async () => {
    setIsConfirmModal(false)
    setIsLoading(true)
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
          bankName,
          amount,
          note,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Transfer failed to process.")
      }

      setIsSuccess(true)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Transfer failed")
    } finally {
      setIsLoading(false)
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
                <Zap className="h-3.5 w-3.5" /> Instant 5-Sec Settlement
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Send money anywhere instantly
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Transfer funds zero-fee to BankSpace accounts or any bank across Nigeria with 100% encryption.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid: Transfer Form & Beneficiaries */}
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Transfer Form */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-[#3f3cff]" /> Transfer Details
          </h2>

          {errorMessage && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          {isSuccess ? (
            <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-8 text-center space-y-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Transfer Successful!</h3>
              <p className="text-sm text-slate-600">
                You sent <strong>₦{Number(amount).toLocaleString()}.00</strong> to Account <strong>{recipientAcc}</strong>.
              </p>
              <button
                onClick={() => {
                  setIsSuccess(false)
                  setAmount("")
                  setRecipientAcc("")
                  setNote("")
                  setErrorMessage("")
                }}
                className="mt-4 rounded-2xl bg-[#3f3cff] px-6 py-3 text-xs font-bold text-white shadow-md"
              >
                Make Another Transfer
              </button>
            </div>
          ) : (
            <form onSubmit={handleTransferSubmit} className="space-y-5">
              {/* Source Account */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Source Account
                </label>
                <select
                  value={sourceAcc}
                  onChange={(e) => setSourceAcc(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
                >
                  {accountOptions.map((opt, i) => (
                    <option key={i}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Destination Bank & Account */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Bank Name
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
                    required
                  />
                </div>
              </div>

              {/* Amount Input & Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-black text-slate-900 outline-none focus:border-[#3f3cff] focus:ring-2 focus:ring-[#3f3cff]/10"
                  required
                />
                {/* Preset Pills */}
                <div className="mt-2.5 flex flex-wrap gap-2">
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
              </div>

              {/* Note / Purpose */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Add Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="What is this transfer for?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm text-slate-800 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-4 text-sm font-bold text-white shadow-xl shadow-indigo-500/25 hover:opacity-95 transition-opacity disabled:opacity-70"
              >
                {isLoading ? "Processing Transfer..." : "Proceed to Confirm Transfer"}
              </button>
            </form>
          )}
        </section>

        {/* Beneficiaries & Transfer Tips Sidebar */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-slate-900 text-lg">Saved Beneficiaries</h2>
            <div className="grid grid-cols-2 gap-3">
              {beneficiaries.map((b) => (
                <div
                  key={b.id}
                  onClick={() => selectBeneficiary(b)}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#3f3cff] transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`grid h-8 w-8 place-items-center rounded-full ${b.color} text-white font-bold text-xs`}>
                      {b.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs truncate">{b.name}</p>
                      <p className="text-[10px] text-slate-400">{b.bank}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-6">
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Confirm Transfer</h3>
            <div className="space-y-3 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-bold text-slate-900">₦{Number(amount).toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between">
                <span>Recipient Acc:</span>
                <span className="font-bold text-slate-900">{recipientAcc}</span>
              </div>
              <div className="flex justify-between">
                <span>Bank:</span>
                <span className="font-bold text-slate-900">{bankName}</span>
              </div>
              <div className="flex justify-between">
                <span>Transfer Fee:</span>
                <span className="font-bold text-emerald-600">Free (₦0.00)</span>
              </div>
            </div>

            <button
              onClick={confirmTransfer}
              disabled={isLoading}
              className="w-full rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-3.5 text-xs font-bold text-white shadow-lg disabled:opacity-70"
            >
              {isLoading ? "Authorizing..." : "Confirm & Authorize Transfer"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  Lock,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Building2,
  Sparkles,
} from "lucide-react"
import { normalizePhoneNumberToAccountNumber } from "@/lib/phoneNormalization"

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
]

export default function CompleteProfilePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1: Personal & Contact Information
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState("")
  const [phone, setPhone] = useState("")

  // Step 2: Identity
  const [bvn, setBvn] = useState("")
  const [nin, setNin] = useState("")

  // Step 3: Address
  const [address, setAddress] = useState("")
  const [state, setState] = useState("Lagos")
  const [lga, setLga] = useState("")

  // Step 5 & 6: Allocated Accounts Metadata
  const [allocatedBankSpaceAcc, setAllocatedBankSpaceAcc] = useState("8012345678")
  const [allocatedDvaNuban, setAllocatedDvaNuban] = useState("1234567890")
  const [allocatedDvaBankName, setAllocatedDvaBankName] = useState("Wema Bank / BankSpace Partner")
  const [registeredAccountName, setRegisteredAccountName] = useState("ILLIAS OLANREWAJU")

  const [error, setError] = useState("")
  const [accountPreview, setAccountPreview] = useState("8012345678")

  // Load user profile details from session / Google account
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          const u = data.user
          if (u.name) {
            const parts = u.name.trim().split(/\s+/)
            if (parts.length > 0) setFirstName(parts[0])
            if (parts.length > 1) setLastName(parts[parts.length - 1])
            if (parts.length > 2) setMiddleName(parts.slice(1, -1).join(" "))
          }
          if (u.phone) {
            setPhone(u.phone)
          }
        }
      })
      .catch(() => null)
  }, [])

  // Live account number preview when phone changes
  useEffect(() => {
    if (phone) {
      const normalized = normalizePhoneNumberToAccountNumber(phone)
      setAccountPreview(normalized)
    } else {
      setAccountPreview("8012345678")
    }
  }, [phone])

  // -------------------------------------------------------------------
  // STEP HANDLERS & VALIDATIONS
  // -------------------------------------------------------------------

  // Step 1 Validation -> Proceed to Step 2
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your First Name and Last Name.")
      return
    }
    if (!dob) {
      setError("Please enter your Date of Birth.")
      return
    }
    if (!phone || !phone.trim()) {
      setError("Please enter a valid Phone Number.")
      return
    }
    setStep(2)
  }

  // Step 2 Validation -> Proceed to Step 3
  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!bvn.trim() || bvn.trim().length !== 11 || !/^\d+$/.test(bvn.trim())) {
      setError("Please enter a valid 11-digit BVN number.")
      return
    }
    if (!nin.trim() || nin.trim().length !== 11 || !/^\d+$/.test(nin.trim())) {
      setError("Please enter a valid 11-digit NIN number.")
      return
    }
    setStep(3)
  }

  // Step 3 Submission -> Triggers Step 4 (Verifying), Step 5 (Account Ready), and Step 6 (DVA)
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!address.trim() || !state.trim() || !lga.trim()) {
      setError("Please complete your Residential Address, State, and LGA.")
      return
    }

    // Move to Step 4: Verification Processing
    setStep(4)

    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim(),
          phone: phone.trim(),
          dob,
          gender: "Male",
          bvn: bvn.trim(),
          nin: nin.trim(),
          address: address.trim(),
          state,
          lga: lga.trim(),
          country: "Nigeria",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStep(3)
        throw new Error(data.message || "Identity verification failed.")
      }

      const accNum = data.accountNumber || accountPreview
      const fullName = `${firstName.trim()} ${lastName.trim()}`.toUpperCase()
      setAllocatedBankSpaceAcc(accNum)
      setRegisteredAccountName(fullName)

      // Fetch DVA Account Details
      const dvaRes = await fetch("/api/accounts/virtual").then((r) => (r.ok ? r.json() : null))
      if (dvaRes?.success && dvaRes?.externalDvaNuban) {
        setAllocatedDvaNuban(dvaRes.externalDvaNuban)
        setAllocatedDvaBankName(dvaRes.externalBankName || "Wema Bank / BankSpace Partner")
      }

      // Automatically transition from Step 4 (Verifying) to Step 5 (BankSpace Account) after 1.8 seconds
      setTimeout(() => {
        setStep(5)
      }, 1800)
    } catch (err) {
      setStep(3)
      setError(err instanceof Error ? err.message : "Profile completion failed.")
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl space-y-6">
        {/* Header Branding & Stepper Progress Bar */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-4 py-1.5 text-xs font-bold text-[#4938f2] uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 text-[#4938f2]" />
            BankSpace Account Setup
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Complete Your{" "}
            <span className="bg-linear-to-r from-[#6757ff] to-[#43a1ff] bg-clip-text text-transparent">
              Profile
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto">
            Complete your BankSpace customer identity verification to activate full account features.
          </p>
        </div>

        {/* STEPPER PROGRESS INDICATOR (Dashboard Light Variant) */}
        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#4938f2]">
              {step === 1 && "Step 1 — Personal & Contact Details"}
              {step === 2 && "Step 2 — Identity Verification (BVN & NIN)"}
              {step === 3 && "Step 3 — Residential Address"}
              {step === 4 && "Step 4 — Verification Processing"}
              {step === 5 && "Step 5 — BankSpace Account Ready"}
              {step === 6 && "Step 6 — Dedicated Receiving Account"}
            </span>
            <span className="text-slate-400 font-mono">Step {step} of 6</span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-[#4938f2] via-[#6757ff] to-emerald-500 transition-all duration-500"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* MAIN FORM CONTAINER (Dashboard Light Variant) */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-600 flex items-center gap-2 animate-in fade-in">
              <Lock className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: PERSONAL & CONTACT DETAILS */}
          {step === 1 && (
            <form onSubmit={handleStep1Next} className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#4938f2]" /> Personal & Contact Details
                </h2>
                <p className="text-xs text-slate-500 mt-1">Enter your official name, birth date, and primary phone number.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">First Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Illias"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#4938f2] focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Last Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Olanrewaju"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#4938f2] focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Middle Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. User"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#4938f2] focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#4938f2] focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="08012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-10 pr-3.5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#4938f2] focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {accountPreview && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 flex items-center justify-between text-xs animate-in fade-in">
                  <span className="font-bold text-indigo-900">Allocated BankSpace Account:</span>
                  <span className="font-mono font-black text-[#4938f2] tracking-widest text-base">{accountPreview}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-4 text-sm font-bold text-white hover:opacity-95 transition-opacity cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                <span>Continue to Identity Verification</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* STEP 2: IDENTITY (BVN & NIN) */}
          {step === 2 && (
            <form onSubmit={handleStep2Next} className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#4938f2]" /> Identity Verification
                </h2>
                <p className="text-xs text-slate-500 mt-1">We match your BVN and NIN with official registries for regulatory compliance.</p>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">11-Digit BVN *</label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="22200000000"
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-[#4938f2] focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">11-Digit NIN *</label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="11100000000"
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-[#4938f2] focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-4 text-sm font-bold text-white hover:opacity-95 transition-opacity cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                <span>Continue to Residential Address</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* STEP 3: RESIDENTIAL ADDRESS */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#4938f2]" /> Residential Address
                </h2>
                <p className="text-xs text-slate-500 mt-1">Provide your current physical address for account activation.</p>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Street Address *</label>
                <input
                  type="text"
                  placeholder="e.g. 15 Marina Street, Victoria Island"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#4938f2] focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">State *</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#4938f2] focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">LGA *</label>
                  <input
                    type="text"
                    placeholder="e.g. Eti-Osa"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#4938f2] focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-4 text-sm font-bold text-white hover:opacity-95 transition-opacity cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                <span>Submit for Identity Verification</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* STEP 4: VERIFICATION PROCESSING */}
          {step === 4 && (
            <div className="py-12 text-center space-y-6 animate-in fade-in">
              <div className="relative grid h-20 w-20 place-items-center rounded-full bg-indigo-50 border border-indigo-200/80 mx-auto text-[#4938f2]">
                <Loader2 className="h-10 w-10 animate-spin text-[#4938f2]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">Verifying your information...</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  We are matching your profile with NIMC and NIBSS identity registries. This only takes a moment.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: BANKSPACE ACCOUNT READY (Dashboard Balance Card Style) */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>

              <div className="space-y-1">
                <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  BankSpace Account Activated
                </span>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-2">
                  Your Account is Ready!
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  Use your BankSpace Account Number for instant P2P transfers.
                </p>
              </div>

              {/* Dashboard Balance Card Variant */}
              <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#7257ff] via-[#4335eb] to-[#2639d9] p-7 text-white shadow-2xl shadow-indigo-500/30 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white/80">
                    BankSpace Account Number
                  </span>
                  <span className="rounded-full bg-white/20 backdrop-blur-xs px-3 py-1 text-[10px] font-bold text-white">
                    P2P Transfers
                  </span>
                </div>

                <p className="text-3xl font-black tracking-widest text-white font-mono">
                  {allocatedBankSpaceAcc}
                </p>

                <div className="pt-3 border-t border-white/20 flex justify-between text-xs text-white/90">
                  <span>Account Name:</span>
                  <span className="font-bold text-white uppercase">{registeredAccountName}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(6)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] py-4 text-sm font-bold text-white hover:opacity-95 transition-opacity cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                <span>View External Receiving Account</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STEP 6: DEDICATED RECEIVING ACCOUNT (DVA) */}
          {step === 6 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="text-center space-y-1">
                <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  External Receiving Account
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2 flex items-center justify-center gap-2">
                  <Building2 className="h-6 w-6 text-emerald-600" /> Receiving Account Details
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  Use this dedicated NUBAN to receive deposits from commercial banks (GTBank, Zenith, Access, etc.).
                </p>
              </div>

              {/* DVA Dedicated Balance Card Variant */}
              <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-emerald-600 via-teal-600 to-indigo-700 p-7 text-white shadow-2xl shadow-emerald-500/30 text-left space-y-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/80 block">Bank Name</span>
                  <span className="text-base font-bold text-white block mt-0.5">{allocatedDvaBankName}</span>
                </div>

                <div className="pt-3 border-t border-white/20">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/80 block">Account Number (NUBAN)</span>
                  <span className="text-3xl font-black text-white font-mono tracking-widest block mt-0.5">{allocatedDvaNuban}</span>
                </div>

                <div className="pt-3 border-t border-white/20">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/80 block">Account Name</span>
                  <span className="text-sm font-bold text-white uppercase block mt-0.5">{registeredAccountName}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-emerald-500 via-teal-600 to-indigo-600 py-4 text-sm font-black text-white hover:opacity-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <span>Go to BankSpace Dashboard</span>
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

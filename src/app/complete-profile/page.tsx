'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  Lock,
  User,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  KeyRound,
  RefreshCw,
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

  // Step 1: Personal Information
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState("")

  // Step 2: Phone Verification
  const [phone, setPhone] = useState("")
  const [otpInput, setOtpInput] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpSuccessMessage, setOtpSuccessMessage] = useState("")

  // Step 3: Identity
  const [bvn, setBvn] = useState("")
  const [nin, setNin] = useState("")

  // Step 4: Address
  const [address, setAddress] = useState("")
  const [state, setState] = useState("Lagos")
  const [lga, setLga] = useState("")

  // Step 6 & 7: Created Accounts Metadata
  const [allocatedBankSpaceAcc, setAllocatedBankSpaceAcc] = useState("8012345678")
  const [allocatedDvaNuban, setAllocatedDvaNuban] = useState("1234567890")
  const [allocatedDvaBankName, setAllocatedDvaBankName] = useState("Wema Bank / BankSpace Partner")
  const [registeredAccountName, setRegisteredAccountName] = useState("ILLIAS OLANREWAJU")

  const [error, setError] = useState("")
  const [accountPreview, setAccountPreview] = useState("8012345678")

  // Prefill Google OAuth user details if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem("bankspace_user")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.name) {
          const parts = parsed.name.trim().split(/\s+/)
          if (parts.length > 0) setFirstName(parts[0])
          if (parts.length > 1) setLastName(parts[parts.length - 1])
          if (parts.length > 2) setMiddleName(parts.slice(1, -1).join(" "))
        }
        if (parsed.phone) setPhone(parsed.phone)
      }
    } catch {
      // Ignore
    }
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

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

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
    setStep(2)
  }

  // Step 2: Send OTP
  const handleSendOtp = async () => {
    if (!phone || !phone.trim()) {
      setError("Please enter a valid Nigerian phone number first.")
      return
    }
    setError("")
    setOtpSuccessMessage("")
    setIsSendingOtp(true)

    try {
      const res = await fetch("/api/auth/phone-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to send OTP code.")
      }

      setOtpSent(true)
      setCooldown(60)
      setOtpSuccessMessage(data.message || "Verification code sent to your phone.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.")
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Step 2: Verify OTP -> Proceed to Step 3
  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.trim().length !== 6) {
      setError("Please enter the 6-digit verification OTP code.")
      return
    }
    setError("")
    setIsVerifyingOtp(true)

    try {
      const res = await fetch("/api/auth/phone-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: otpInput.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Invalid or expired verification OTP code.")
      }

      setPhoneVerified(true)
      if (data.accountNumber) {
        setAllocatedBankSpaceAcc(data.accountNumber)
      }
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Step 3 Validation -> Proceed to Step 4
  const handleStep3Next = (e: React.FormEvent) => {
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
    setStep(4)
  }

  // Step 4 Submission -> Triggers Step 5 (Verification), Step 6, and Step 7
  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!address.trim() || !state.trim() || !lga.trim()) {
      setError("Please complete your Residential Address, State, and LGA.")
      return
    }

    // Move to Step 5: Processing Verification
    setStep(5)

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
        setStep(4)
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

      // Automatically transition from Step 5 (Verifying) to Step 6 (BankSpace Account) after 2 seconds
      setTimeout(() => {
        setStep(6)
      }, 2000)
    } catch (err) {
      setStep(4)
      setError(err instanceof Error ? err.message : "Profile completion failed.")
    }
  }

  // Final completion check before allowing user to leave on Step 7
  const handleFinish = () => {
    setError("")
    // Required: Step1 (firstName,lastName,dob), Step2 phoneVerified, Step3 bvn/nin, Step4 address/state/lga
    if (!firstName.trim() || !lastName.trim() || !dob) {
      setError("Incomplete profile: please complete Personal Details to proceed.")
      return
    }
    if (!phoneVerified) {
      setError("Incomplete profile: please verify your phone to proceed.")
      return
    }
    if (!bvn.trim() || bvn.trim().length !== 11) {
      setError("Incomplete profile: please complete BVN information to proceed.")
      return
    }
    if (!nin.trim() || nin.trim().length !== 11) {
      setError("Incomplete profile: please complete NIN information to proceed.")
      return
    }
    if (!address.trim() || !state.trim() || !lga.trim()) {
      setError("Incomplete profile: please complete your address to proceed.")
      return
    }

    // All checks passed - navigate to dashboard
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-[#3f3cff]">
            <ShieldCheck className="h-4 w-4 text-[#3f3cff]" />
            BankSpace Account Setup
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Verify Your Identity
          </h1>
          <p className="mx-auto max-w-lg text-sm text-slate-500 font-medium">
            Complete your financial KYC onboarding in a few quick steps.
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
            <span className="text-[#3f3cff]">
              {step === 1 && "Step 1 — Personal Information"}
              {step === 2 && "Step 2 — Phone Verification"}
              {step === 3 && "Step 3 — Identity (BVN & NIN)"}
              {step === 4 && "Step 4 — Residential Address"}
              {step === 5 && "Step 5 — Verification Processing"}
              {step === 6 && "Step 6 — BankSpace Account Ready"}
              {step === 7 && "Step 7 — Dedicated Receiving Account"}
            </span>
            <span className="font-mono text-slate-400">Step {step} of 7</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-linear-to-r from-[#4938f2] via-[#5f5cef] to-[#3ad7a9] transition-all duration-500"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-600">
              <Lock className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1Next} className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-[#3f3cff]">
                    <User className="h-5 w-5" />
                  </div>
                  Personal Details
                </h2>
                <p className="mt-2 text-sm text-slate-500">Enter your official name as registered on your government IDs.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">First Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Illias"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Last Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Olanrewaju"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Middle Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. User"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Date of Birth *</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95"
              >
                <span>Continue to Phone Verification</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-[#3f3cff]">
                    <Phone className="h-5 w-5" />
                  </div>
                  Phone Verification
                </h2>
                <p className="mt-2 text-sm text-slate-500">Your verified phone number becomes your 10-digit BankSpace Account Number.</p>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Nigerian Phone Number *</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={phoneVerified || otpSent}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || !phone}
                      className="rounded-2xl bg-[#3f3cff] px-4 text-xs font-bold text-white transition hover:bg-[#332ce4] disabled:opacity-50"
                    >
                      {isSendingOtp ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send OTP"}
                    </button>
                  )}
                </div>
              </div>

              {accountPreview && (
                <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 p-3.5 text-xs font-bold text-[#3f3cff]">
                  <span>Allocated BankSpace Number</span>
                  <span className="font-mono text-sm text-slate-900 tracking-widest">{accountPreview}</span>
                </div>
              )}

              {otpSent && !phoneVerified && (
                <div className="space-y-3 pt-2">
                  {otpSuccessMessage && (
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> {otpSuccessMessage}
                    </p>
                  )}

                  <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Enter 6-Digit OTP *</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-center text-xl font-black tracking-[0.5em] text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={cooldown > 0 || isSendingOtp}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {cooldown > 0 ? `Resend Code in ${cooldown}s` : "Resend OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otpInput.length !== 6}
                      className="flex-1 rounded-2xl bg-emerald-500 py-3 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                    >
                      {isVerifyingOtp ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verify & Continue"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleStep3Next} className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-[#3f3cff]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  Identity Verification
                </h2>
                <p className="mt-2 text-sm text-slate-500">We match your BVN and NIN with official registries for regulatory compliance.</p>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">11-Digit BVN *</label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="22200000000"
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-mono font-bold text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">11-Digit NIN *</label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="11100000000"
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-mono font-bold text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95"
              >
                <span>Continue to Address</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleStep4Submit} className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-[#3f3cff]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  Residential Address
                </h2>
                <p className="mt-2 text-sm text-slate-500">Provide your current physical address for account activation.</p>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Street Address *</label>
                <input
                  type="text"
                  placeholder="e.g. 15 Marina Street, Victoria Island"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">State *</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">LGA *</label>
                  <input
                    type="text"
                    placeholder="e.g. Eti-Osa"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-[#3f3cff] focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95"
              >
                <span>Submit for Identity Verification</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 5 && (
            <div className="space-y-6 py-12 text-center animate-in fade-in">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-indigo-200 bg-indigo-50 text-[#3f3cff]">
                <Loader2 className="h-10 w-10 animate-spin" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-950">Verifying your information...</h2>
                <p className="mx-auto max-w-sm text-sm text-slate-500">
                  We are matching your profile with NIMC and NIBSS identity registries. This only takes a moment.
                </p>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 animate-in fade-in text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-500">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div className="space-y-1">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">
                  BankSpace Account Activated
                </span>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Your Account is Ready!
                </h2>
                <p className="text-sm text-slate-500">
                  Use your BankSpace Account Number for instant P2P transfers.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#3f3cff]">BankSpace Account Number</span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-[#3f3cff]">P2P Transfers</span>
                </div>
                <p className="font-mono text-3xl font-black tracking-[0.15em] text-slate-950">{allocatedBankSpaceAcc}</p>
                <div className="flex items-center justify-between border-t border-indigo-200 pt-3 text-sm text-slate-600">
                  <span>Account Name</span>
                  <span className="font-black uppercase text-slate-900">{registeredAccountName}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(7)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95"
              >
                <span>View External Receiving Account</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="text-center space-y-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">
                  External Receiving Account
                </span>
                <h2 className="mt-2 flex items-center justify-center gap-2 text-2xl font-black text-slate-950">
                  <Building2 className="h-6 w-6 text-emerald-600" /> Receiving Account Details
                </h2>
                <p className="text-sm text-slate-500">
                  Use this dedicated NUBAN to receive deposits from commercial banks (GTBank, Zenith, Access, etc.).
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div>
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-600">Bank Name</span>
                  <span className="mt-1 block text-lg font-black text-slate-900">{allocatedDvaBankName}</span>
                </div>

                <div className="border-t border-emerald-200 pt-3">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-600">Account Number (NUBAN)</span>
                  <span className="mt-1 block font-mono text-3xl font-black tracking-[0.12em] text-slate-950">{allocatedDvaNuban}</span>
                </div>

                <div className="border-t border-emerald-200 pt-3">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-600">Account Name</span>
                  <span className="mt-1 block text-base font-black uppercase text-slate-900">{registeredAccountName}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4938f2] to-[#3ad7a9] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95"
              >
                <span>Go to BankSpace Dashboard</span>
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Back and Skip fixed buttons */}
      <div className="pointer-events-none">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="pointer-events-auto fixed bottom-6 left-6 z-50 rounded-2xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm"
          >
            <ArrowLeft className="inline-block mr-2 h-4 w-4" /> Back
          </button>
        )}

        {step < 7 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(7, s + 1))}
            className="pointer-events-auto fixed bottom-6 right-6 z-50 rounded-2xl border-2 border-slate-300 bg-[#f4f4f4] px-4 py-2 text-sm font-bold text-slate-900 shadow-sm"
          >
            Skip <ArrowRight className="inline-block ml-2 h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

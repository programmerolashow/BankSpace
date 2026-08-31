'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Lock, User, Phone, MapPin, CreditCard, CheckCircle2, ArrowRight, Loader2, KeyRound, RefreshCw } from "lucide-react"
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

  // Form Fields
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("Male")
  const [bvn, setBvn] = useState("")
  const [nin, setNin] = useState("")
  const [address, setAddress] = useState("")
  const [state, setState] = useState("Lagos")
  const [lga, setLga] = useState("")
  const [country] = useState("Nigeria")
  const [postalCode, setPostalCode] = useState("")

  // OTP Verification States
  const [otpInput, setOtpInput] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpSuccessMessage, setOtpSuccessMessage] = useState("")

  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accountPreview, setAccountPreview] = useState("8012345678")

  // Load existing Google user name / details if available
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
        if (parsed.phone) {
          setPhone(parsed.phone)
        }
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

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // 1. Send OTP Action
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
      setCooldown(data.cooldownSeconds || 60)
      setOtpSuccessMessage(data.message || "OTP code sent to your phone.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.")
    } finally {
      setIsSendingOtp(false)
    }
  }

  // 2. Verify OTP Action
  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.trim().length !== 6) {
      setError("Please enter the 6-digit OTP code sent to your phone.")
      return
    }
    setError("")
    setIsVerifyingOtp(true)

    try {
      const res = await fetch("/api/auth/phone-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: otpInput }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Invalid OTP code.")
      }

      setPhoneVerified(true)
      if (data.accountNumber) {
        setAccountPreview(data.accountNumber)
      }
      setOtpSuccessMessage("✓ Phone number verified and BankSpace account identifier reserved!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneVerified) {
      setError("Please verify your phone number via OTP before completing registration.")
      return
    }
    setError("")
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          middleName,
          lastName,
          phone,
          dob,
          gender,
          bvn,
          nin,
          address,
          state,
          lga,
          country,
          postalCode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to complete identity verification")
      }

      if (data.user) {
        localStorage.setItem("bankspace_user", JSON.stringify(data.user))
      }

      // Successful completion -> Navigate to dashboard
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile completion failed")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#10162f_0%,#090d1f_50%,#040714_100%)] flex items-center justify-center p-4 font-sans text-slate-100 antialiased py-10">
      <div className="w-full max-w-2xl space-y-6">
        {/* BRAND HEADER */}
        <div className="text-center space-y-3">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-tr from-amber-500 via-indigo-600 to-violet-600 shadow-2xl shadow-indigo-500/30">
            <ShieldCheck className="h-7 w-7 text-slate-950 font-black" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Complete your BankSpace profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto mt-1">
              We need a few additional details to securely activate your financial account.
            </p>
          </div>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="flex items-center justify-between px-6 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-slate-950 text-xs font-black">
              1
            </span>
            <span className="text-xs font-bold text-slate-200">Phone & OTP Verification</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-800 sm:w-24" />
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-white text-xs font-black">
              2
            </span>
            <span className="text-xs font-bold text-slate-200">KYC & Address</span>
          </div>
        </div>

        {/* MAIN FORM CARD */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400 animate-in fade-in">
              ⚠️ {error}
            </div>
          )}

          {otpSuccessMessage && (
            <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-400 animate-in fade-in flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{otpSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <User className="h-4 w-4" /> Personal Identification
                  </h2>
                  <p className="text-xs text-slate-400">Ensure details match your official identification documents.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Illias"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Middle Name</label>
                    <input
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="e.g. Olanrewaju"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. User"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Gender *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-hidden"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* PHONE NUMBER & OTP VERIFICATION BOX */}
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Nigerian Phone Number *
                      </span>
                      {phoneVerified && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Phone Verified
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        disabled={phoneVerified}
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value)
                          setPhoneVerified(false)
                          setOtpSent(false)
                        }}
                        placeholder="e.g. 08012345678 or +2348012345678"
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-hidden disabled:opacity-75"
                      />
                      {!phoneVerified && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || cooldown > 0}
                          className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          {isSendingOtp ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : cooldown > 0 ? (
                            <span>Resend in {cooldown}s</span>
                          ) : (
                            <span>{otpSent ? "Resend OTP" : "Send OTP"}</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* OTP INPUT DISPATCH PANEL */}
                  {otpSent && !phoneVerified && (
                    <div className="rounded-xl border border-amber-500/30 bg-slate-950 p-3.5 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5 text-amber-400" /> Enter 6-Digit OTP Code
                        </span>
                        <span className="text-[11px] text-slate-400">Expires in 10 mins</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                          placeholder="e.g. 123456"
                          className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white font-mono tracking-widest text-center focus:border-amber-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={isVerifyingOtp || otpInput.length !== 6}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {isVerifyingOtp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify OTP"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-amber-500/20 pt-2 text-xs">
                    <span className="text-slate-400 font-medium">BankSpace 10-Digit Account Number:</span>
                    <span className="font-mono font-black text-amber-400 text-sm tracking-widest">
                      {accountPreview}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!firstName || !lastName || !phone || !dob) {
                      setError("Please fill in your names, date of birth, and phone number.")
                      return
                    }
                    if (!phoneVerified) {
                      setError("Please verify your phone number via OTP before continuing.")
                      return
                    }
                    setError("")
                    setStep(2)
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:opacity-95 transition-all cursor-pointer"
                >
                  <span>Continue to Identity Verification</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Government ID & Residential Address
                  </h2>
                  <p className="text-xs text-slate-400">Required by CBN and SEC regulations to activate financial vaults.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Bank Verification Number (BVN) *</label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={bvn}
                      onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                      placeholder="11-digit BVN"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">National Identity Number (NIN) *</label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={nin}
                      onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
                      placeholder="11-digit NIN"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Residential Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 12 Marina Road, Victoria Island"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">State *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                    >
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">LGA *</label>
                    <input
                      type="text"
                      required
                      value={lga}
                      onChange={(e) => setLga(e.target.value)}
                      placeholder="e.g. Eti-Osa"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 101241"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Activating Account...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Complete Identity & Activate Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* SECURITY COMPLIANCE FOOTER */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
          <Lock className="h-3.5 w-3.5 text-emerald-400" />
          <span>Encrypted 256-bit SSL Vault Storage • CBN Regulatory Compliance</span>
        </div>
      </div>
    </div>
  )
}

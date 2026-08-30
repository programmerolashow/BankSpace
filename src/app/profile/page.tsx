'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  CheckCircle2,
  LogOut,
} from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(false)
  const [formData, setFormData] = useState(() => {
    const initial = {
      fullName: "Illias Omotayo",
      email: "illias.o@bankspace.com",
      phone: "+234 812 345 6789",
      dob: "1994-08-14",
      address: "14 Victoria Island Expressway, Lagos, Nigeria",
      tier: "Tier 3 (Verified)",
      bvn: "22198471209",
    }
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("bankspace_user")
        if (stored) {
          const parsed = JSON.parse(stored)
          return {
            ...initial,
            fullName: parsed.name || initial.fullName,
            email: parsed.email || initial.email,
            phone: parsed.phone || initial.phone,
          }
        }
      } catch {
        // Ignore
      }
    }
    return initial
  })

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setFormData((prev) => ({
            ...prev,
            fullName: data.user.name || prev.fullName,
            email: data.user.email || prev.email,
            phone: data.user.phone || prev.phone,
          }))
          localStorage.setItem("bankspace_user", JSON.stringify(data.user))
        }
      })
      .catch(() => null)
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      localStorage.setItem("bankspace_user", JSON.stringify({ name: formData.fullName, email: formData.email, phone: formData.phone }))
    } catch {
      // Ignore
    }
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Fallback
    }
    localStorage.removeItem("bankspace_user")
    document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.push("/?auth=login")
    router.refresh()
  }

  const nameParts = (formData.fullName || "User").trim().split(" ")
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : (nameParts[0][0] || "U").toUpperCase()

  return (
    <div className="space-y-8">
      {/* Header Profile Hero Card */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-linear-to-br from-[#7257ff] via-[#4335eb] to-[#2639d9] font-black text-2xl text-white shadow-xl shadow-indigo-500/20">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950">{formData.fullName}</h1>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" /> {formData.tier}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">{formData.email} • Member since Jan 2024</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-linear-to-br from-[#f0edff] to-[#e9ecff] p-4 text-xs font-semibold text-[#3f3cff]">
              <p>Premium Account Tier</p>
              <p className="mt-1 text-slate-700">Daily limit: ₦10,000,000.00</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </section>

      {/* Edit Form & Account Security Sidebar */}
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Form */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="font-bold text-slate-900 text-lg flex items-center justify-between">
            <span>Personal Information</span>
            {isSaved && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Profile Updated!</span>}
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Bank Verification Number (BVN)</label>
                <input
                  type="text"
                  value={`•••• •••• ${formData.bvn.slice(-3)}`}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 p-3.5 text-xs sm:text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Residential Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#3f3cff]"
              />
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
            >
              Save Profile Changes
            </button>
          </form>
        </section>

        {/* Security Summary Sidebar */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-slate-900 text-lg">Security & Verifications</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50">
                <span className="text-xs font-semibold text-slate-700">Two-Factor Auth (2FA)</span>
                <span className="text-xs font-bold text-emerald-600">Active (SMS & App)</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50">
                <span className="text-xs font-semibold text-slate-700">Biometric Login</span>
                <span className="text-xs font-bold text-emerald-600">Enabled</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50">
                <span className="text-xs font-semibold text-slate-700">Active Devices</span>
                <span className="text-xs font-bold text-[#3f3cff]">2 Sessions Active</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

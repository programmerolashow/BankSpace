'use client'

import { useState } from "react"
import {
  Settings,
  Bell,
  Lock,
  ShieldCheck,
  Globe,
  Sliders,
  CheckCircle2,
  Moon,
  Sun,
  Smartphone,
  Check,
} from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Security")
  const [isSaved, setIsSaved] = useState(false)
  const [notifications, setNotifications] = useState({
    emailTx: true,
    smsTx: true,
    lowBalance: true,
    weeklyReport: false,
  })
  const [currency, setCurrency] = useState("NGN (₦)")
  const [darkMode, setDarkMode] = useState(false)

  const saveSettings = () => {
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eeeeff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#3f3cff]">
                App Preferences
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" /> High Security Environment
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Customize your BankSpace settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Manage your notification alerts, security PIN, login authentication, and display preferences.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </section>

      {/* Main Settings Tabs & Content */}
      <div className="grid gap-8 xl:grid-cols-[260px_1fr]">
        {/* Settings Sub-Sidebar Tabs */}
        <aside className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm h-fit space-y-1">
          {[
            { id: "Security", label: "Security & PIN", icon: Lock },
            { id: "Notifications", label: "Notifications", icon: Bell },
            { id: "Preferences", label: "Preferences & Display", icon: Sliders },
            { id: "Privacy", label: "Privacy & Data", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition-all text-left ${
                  isActive ? "bg-[#eeeeff] text-[#3f3cff]" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#3f3cff]" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </aside>

        {/* Content Box */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {activeTab === "Security" && (
            <div className="space-y-6">
              <h2 className="font-bold text-slate-900 text-lg">Change Transaction PIN</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Current PIN</label>
                  <input type="password" maxLength={4} placeholder="••••" className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">New 4-Digit PIN</label>
                  <input type="password" maxLength={4} placeholder="••••" className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Confirm New PIN</label>
                  <input type="password" maxLength={4} placeholder="••••" className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-lg font-bold text-slate-900 outline-none" />
                </div>
                <button onClick={saveSettings} className="rounded-2xl bg-[#3f3cff] px-6 py-3 text-xs font-bold text-white shadow-md">
                  Update PIN
                </button>
              </div>
            </div>
          )}

          {activeTab === "Notifications" && (
            <div className="space-y-6">
              <h2 className="font-bold text-slate-900 text-lg">Notification Preferences</h2>
              <div className="space-y-4 max-w-lg">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Transaction Email Alerts</p>
                    <p className="text-xs text-slate-500">Receive receipt for every debit/credit</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailTx}
                    onChange={(e) => setNotifications({ ...notifications, emailTx: e.target.checked })}
                    className="h-5 w-5 accent-[#3f3cff] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">SMS Alerts</p>
                    <p className="text-xs text-slate-500">Instant SMS on high-value transfers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.smsTx}
                    onChange={(e) => setNotifications({ ...notifications, smsTx: e.target.checked })}
                    className="h-5 w-5 accent-[#3f3cff] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Low Balance Warning</p>
                    <p className="text-xs text-slate-500">Alert when balance drops under ₦10,000</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.lowBalance}
                    onChange={(e) => setNotifications({ ...notifications, lowBalance: e.target.checked })}
                    className="h-5 w-5 accent-[#3f3cff] cursor-pointer"
                  />
                </div>

                <button onClick={saveSettings} className="rounded-2xl bg-[#3f3cff] px-6 py-3 text-xs font-bold text-white shadow-md">
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {activeTab === "Preferences" && (
            <div className="space-y-6">
              <h2 className="font-bold text-slate-900 text-lg">Display & Currency</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Primary Currency Display</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-bold text-slate-800 outline-none"
                  >
                    <option>NGN (₦) - Nigerian Naira</option>
                    <option>USD ($) - US Dollar</option>
                    <option>EUR (€) - Euro</option>
                    <option>GBP (£) - British Pound</option>
                  </select>
                </div>

                <button onClick={saveSettings} className="rounded-2xl bg-[#3f3cff] px-6 py-3 text-xs font-bold text-white shadow-md">
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {activeTab === "Privacy" && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-900 text-lg">Privacy & Data Controls</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                BankSpace encrypts all financial data using AES-256 bank-level security standards. You can request a full download of your personal data archive at any time.
              </p>
              <button className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                Download Data Archive
              </button>
            </div>
          )}

          {isSaved && (
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="h-4 w-4" /> Preferences Saved Successfully!
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

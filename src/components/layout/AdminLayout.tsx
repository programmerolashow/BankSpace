'use client'

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef, Suspense } from "react"
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  History,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  AlertOctagon,
  Activity,
  Radio,
  Bell,
  FileText,
  ShieldAlert,
  Settings,
  Sliders,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  CheckCheck,
} from "lucide-react"

type NavSection = {
  title: string
  items: Array<{
    tabKey: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
  }>
}

const adminNavSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { tabKey: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "USERS",
    items: [
      { tabKey: "users", label: "All Users", icon: Users },
      { tabKey: "kyc", label: "User Verification / KYC", icon: UserCheck },
      { tabKey: "suspended", label: "Suspended Users", icon: UserX },
    ],
  },
  {
    title: "FINANCIAL",
    items: [
      { tabKey: "transactions", label: "Transactions", icon: History },
      { tabKey: "transfers", label: "Transfers", icon: ArrowLeftRight },
      { tabKey: "deposits", label: "Deposits", icon: ArrowDownLeft },
      { tabKey: "withdrawals", label: "Withdrawals", icon: ArrowUpRight },
      { tabKey: "failed", label: "Failed Transactions", icon: AlertOctagon },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { tabKey: "monitoring", label: "Payment/Transfer Monitoring", icon: Activity },
      { tabKey: "activity", label: "System Activity", icon: Radio },
      { tabKey: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "SECURITY",
    items: [
      { tabKey: "logs", label: "Admin Activity Logs", icon: FileText },
      { tabKey: "security", label: "Security Events", icon: ShieldAlert },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { tabKey: "settings", label: "Admin Settings", icon: Settings },
      { tabKey: "system_settings", label: "System Settings", icon: Sliders },
    ],
  },
]

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentTab = searchParams.get("tab") || "dashboard"

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [adminUser, setAdminUser] = useState<{ name: string; email: string }>({
    name: "System Administrator",
    email: "admin@bankspace.com",
  })

  // Load current admin info
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setAdminUser(data.user)
        }
      })
      .catch(() => null)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAdminDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null)
    document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.push("/admin/login")
  }

  const navigateToTab = (tabKey: string) => {
    setMobileOpen(false)
    if (pathname === "/admin/dashboard") {
      router.push(`/admin/dashboard?tab=${tabKey}`)
    } else {
      router.push(`/admin/dashboard?tab=${tabKey}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col">
      {/* TOP HEADER BAR */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Drawer Trigger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Toggle Navigation Drawer"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Brand Logo & System Admin Badge */}
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-tr from-amber-500 to-indigo-600 text-slate-950 font-black shadow-md shadow-amber-500/20">
                <ShieldCheck className="h-5 w-5 text-slate-950" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm tracking-tight text-white">BankSpace</span>
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    Admin System
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-400">Enterprise Control Console</p>
              </div>
            </div>
          </div>

          {/* Top Bar Center Search */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search accounts, transactions, logs, or users..."
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 pl-10 pr-4 py-2 text-xs font-semibold text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500/60 transition-colors"
              />
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            {/* Live System Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Settlement Engine
            </div>

            {/* Admin Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-900 p-1.5 pr-3 hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
                  {adminUser.name ? adminUser.name[0].toUpperCase() : "A"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-200 line-clamp-1">{adminUser.name}</p>
                  <p className="text-[10px] font-medium text-amber-400">System Admin</p>
                </div>
              </button>

              {adminDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white">{adminUser.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{adminUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setAdminDropdownOpen(false)
                      navigateToTab("settings")
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <Settings className="h-4 w-4 text-amber-400" /> Admin Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-rose-400" /> Logout Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER: SIDEBAR + CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-800/80 bg-slate-900/60 transition-all duration-300 ${
            isCollapsed ? "w-20" : "w-72"
          }`}
        >
          {/* Collapse Toggle Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800/60">
            {!isCollapsed && (
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Navigation Console
              </span>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors mx-auto"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
            {adminNavSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                    {section.title}
                  </p>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentTab === item.tabKey

                  return (
                    <button
                      key={item.tabKey}
                      onClick={() => navigateToTab(item.tabKey)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                      } ${isCollapsed ? "justify-center" : ""}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-slate-950" : "text-amber-400/80"}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* MOBILE DRAWER SIDEBAR */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
            <div className="relative w-80 max-w-xs bg-slate-900 border-r border-slate-800 p-4 space-y-6 overflow-y-auto z-50">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-400" />
                  <span className="font-bold text-sm text-white">Admin Navigation</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {adminNavSections.map((section, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = currentTab === item.tabKey

                    return (
                      <button
                        key={item.tabKey}
                        onClick={() => navigateToTab(item.tabKey)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                          isActive
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-slate-950" : "text-amber-400"}`} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  )
}

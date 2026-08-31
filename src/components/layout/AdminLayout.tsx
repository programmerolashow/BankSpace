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

function AdminLayoutInner({ children }: { children: React.ReactNode; title?: string }) {
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

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [operationalAlerts, setOperationalAlerts] = useState<any[]>([])

  // GLOBAL COMMAND PALETTE SEARCH STATE
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any>({ users: [], accounts: [], transactions: [], transfers: [], auditLogs: [] })
  const [isSearching, setIsSearching] = useState(false)

  // Ctrl+K / Cmd+K Hotkey Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Debounced Search API Call
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults({ users: [], accounts: [], transactions: [], transfers: [], auditLogs: [] })
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery.trim())}`)
        if (res.ok) {
          const data = await res.json()
          if (data.results) setSearchResults(data.results)
        }
      } catch {
        // Error
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/admin/notifications")
      if (res.ok) {
        const data = await res.json()
        if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount)
        if (data.operationalAlerts) setOperationalAlerts(data.operationalAlerts)
      }
    } catch {
      // Error
    }
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      })
      setUnreadCount(0)
      setOperationalAlerts([])
    } catch {
      // Error
    }
  }

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
    if (tabKey === "kyc") {
      router.push("/admin/kyc")
    } else if (tabKey === "logs" || tabKey === "activity") {
      router.push("/admin/activity")
    } else if (tabKey === "settings" || tabKey === "profile") {
      router.push("/admin/settings")
    } else if (tabKey === "paystack" || tabKey === "monitoring") {
      router.push("/admin/paystack")
    } else if (tabKey === "transactions" || tabKey === "transfers") {
      router.push("/admin/transactions")
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

          {/* Top Bar Center Search Button */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-400 hover:border-amber-500/50 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-500" />
                <span>Search accounts, transactions, logs, users...</span>
              </span>
              <kbd className="hidden sm:inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            {/* Live System Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Settlement Engine
            </div>

            {/* OPERATIONAL ALERT BELL BUTTON */}
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative rounded-2xl border border-slate-800 bg-slate-900 p-2.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              aria-label="Operational Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-slate-950 animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

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

      {/* OPERATIONAL ALERT DRAWER SLIDE-OVER MODAL */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end p-0">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setNotificationsOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-6 shadow-2xl z-50 flex flex-col justify-between overflow-y-auto space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-400" /> Operational Event Alerts
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time system health checks & warnings</p>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {operationalAlerts.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <CheckCheck className="h-10 w-10 mx-auto text-emerald-400" />
                  <p className="text-sm font-bold text-slate-300">All Systems Normal</p>
                  <p className="text-xs">No pending operational warnings or critical alert events.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {operationalAlerts.map((alert) => {
                    const isWarning = alert.type === "WARNING"
                    const isSecurity = alert.type === "SECURITY"
                    const isInfo = alert.type === "INFO"

                    return (
                      <div
                        key={alert.id}
                        className={`rounded-2xl border p-4 space-y-2 text-xs font-semibold ${
                          isWarning
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                            : isSecurity
                            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${
                              isWarning
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : isSecurity
                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {alert.type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(alert.createdAt).toLocaleTimeString()}
                          </span>
                        </div>

                        <p className="font-bold text-white text-sm">{alert.title}</p>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{alert.message}</p>

                        {alert.link && (
                          <button
                            onClick={() => {
                              setNotificationsOpen(false)
                              router.push(alert.link)
                            }}
                            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1 cursor-pointer pt-1"
                          >
                            Take Action ➔
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {operationalAlerts.length > 0 && (
              <div className="border-t border-slate-800 pt-4">
                <button
                  onClick={handleMarkAllRead}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Mark All Operational Alerts as Read
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GLOBAL SEARCH COMMAND PALETTE MODAL (Ctrl+K) */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl z-50 overflow-hidden space-y-0">
            {/* Command Palette Input Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3.5 bg-slate-950/80">
              <Search className="h-5 w-5 text-amber-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search Users, Transactions, Transfers, Accounts, Audit Logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-white placeholder-slate-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                ESC
              </kbd>
            </div>

            {/* Results Container */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {isSearching ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="h-6 w-6 animate-spin mx-auto text-amber-400 border-2 border-amber-400 border-t-transparent rounded-full" />
                  <p className="text-xs font-semibold">Searching BankSpace database...</p>
                </div>
              ) : !searchQuery.trim() || searchQuery.trim().length < 2 ? (
                <div className="py-12 text-center text-slate-500 space-y-1">
                  <Search className="h-8 w-8 mx-auto text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">Type at least 2 characters to search</p>
                  <p className="text-[11px] text-slate-500">Supports NUBANs, User Names, Emails, Transaction & Transfer References</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Category: Users */}
                  {searchResults.users && searchResults.users.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Users className="h-3 w-3 text-amber-400" /> Users ({searchResults.users.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.users.map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSearchOpen(false)
                              router.push(item.link)
                            }}
                            className="w-full flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950 p-3 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                          >
                            <div>
                              <p className="font-bold text-white text-xs">{item.title}</p>
                              <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                            </div>
                            <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                              {item.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Accounts */}
                  {searchResults.accounts && searchResults.accounts.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-400" /> Bank Accounts ({searchResults.accounts.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.accounts.map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSearchOpen(false)
                              router.push(item.link)
                            }}
                            className="w-full flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950 p-3 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                          >
                            <div>
                              <p className="font-bold text-white text-xs font-mono">{item.title}</p>
                              <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                            </div>
                            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold font-mono">
                              {item.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Transactions */}
                  {searchResults.transactions && searchResults.transactions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <History className="h-3 w-3 text-indigo-400" /> Transactions ({searchResults.transactions.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.transactions.map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSearchOpen(false)
                              router.push(item.link)
                            }}
                            className="w-full flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950 p-3 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                          >
                            <div>
                              <p className="font-bold text-white text-xs font-mono">{item.title}</p>
                              <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                            </div>
                            <span className="rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                              {item.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Transfers */}
                  {searchResults.transfers && searchResults.transfers.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <ArrowLeftRight className="h-3 w-3 text-cyan-400" /> Transfers ({searchResults.transfers.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.transfers.map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSearchOpen(false)
                              router.push(item.link)
                            }}
                            className="w-full flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950 p-3 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                          >
                            <div>
                              <p className="font-bold text-white text-xs font-mono">{item.title}</p>
                              <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                            </div>
                            <span className="rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                              {item.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Audit Logs */}
                  {searchResults.auditLogs && searchResults.auditLogs.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Activity className="h-3 w-3 text-purple-400" /> Audit Logs ({searchResults.auditLogs.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.auditLogs.map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSearchOpen(false)
                              router.push(item.link)
                            }}
                            className="w-full flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950 p-3 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                          >
                            <div>
                              <p className="font-bold text-white text-xs font-mono">{item.title}</p>
                              <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                            </div>
                            <span className="rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                              {item.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <AdminLayoutInner title={title}>{children}</AdminLayoutInner>
    </Suspense>
  )
}

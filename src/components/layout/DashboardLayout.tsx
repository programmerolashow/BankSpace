'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  History,
  ArrowLeftRight,
  TrendingUp,
  PiggyBank,
  PieChart,
  User as UserIcon,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
  CheckCheck,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/transactions", label: "Transactions", icon: History },
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { href: "/receive", label: "Receive Money", icon: ArrowUpRight },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/analytics", label: "Analytics", icon: PieChart },
  { href: "/profile", label: "Profile", icon: UserIcon },
  { href: "/settings", label: "Settings", icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Notifications state
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; type: string; isRead: boolean; createdAt: string }>
  >([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Dynamic user state
  const [user, setUser] = useState<{ name: string; email: string; phone?: string }>({
    name: "Illias Omotayo",
    email: "illias.o@bankspace.com",
  })

  // Load user & notifications
  useEffect(() => {
    try {
      const stored = localStorage.getItem("bankspace_user")
      if (stored) {
        const parsed = JSON.parse(stored)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed.name) setUser(parsed)
      }
    } catch {
      // Ignore JSON parse error
    }

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setUser(data.user)
          localStorage.setItem("bankspace_user", JSON.stringify(data.user))
        }
      })
      .catch(() => null)

    // Fetch live notifications
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.notifications) {
          setNotifications(data.notifications)
          setUnreadCount(data.unreadCount || 0)
        }
      })
      .catch(() => null)
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleOpenNotifications = () => {
    setNotifDropdownOpen(!notifDropdownOpen)
    if (!notifDropdownOpen && unreadCount > 0) {
      setUnreadCount(0)
      fetch("/api/notifications", { method: "POST" }).catch(() => null)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Fallback
    }
    localStorage.removeItem("bankspace_user")
    document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    setUserDropdownOpen(false)
    router.push("/?auth=login")
    router.refresh()
  }

  // Compute initials & short name
  const nameParts = (user.name || "User").trim().split(" ")
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : (nameParts[0][0] || "U").toUpperCase()

  const shortName =
    nameParts.length >= 2
      ? `${nameParts[0]} ${nameParts[1][0]}.`
      : nameParts[0]

  return (
    <main className={`min-h-screen font-sans ${isDarkMode ? "dark bg-slate-950 text-slate-50" : "bg-[#f8f9ff] text-slate-950"}`}>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Desktop Sidebar */}
        <aside className={`hidden border-r px-5 py-6 backdrop-blur-md lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:shrink-0 ${
          isDarkMode ? "border-slate-800 bg-slate-900/90 text-slate-100" : "border-slate-200/70 bg-white/80"
        }`}>
          <div className="mb-8 flex items-center justify-between gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-[#7c4dff] via-[#4938f2] to-[#2454ff] font-bold text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                B
              </div>
              <span className={`text-xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Bank<span className="text-[#3f3cff]">Space</span>
              </span>
            </Link>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1 overflow-y-auto pr-1 flex-1 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-[#eeeeff] text-[#3f3cff] shadow-xs"
                      : isDarkMode
                      ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 transition-transform group-hover:scale-110 ${
                      isActive ? "text-[#3f3cff]" : isDarkMode ? "text-slate-400 group-hover:text-white" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Theme Toggle - Directly above Upgrade to Premium container */}
          <div className={`mt-3 mb-2 rounded-2xl border p-3 shadow-xs flex items-center justify-between transition-colors ${
            isDarkMode ? "border-slate-800 bg-slate-800/80 text-slate-200" : "border-slate-200/80 bg-white/90 text-slate-700"
          }`}>
            <div className="flex items-center gap-2.5 font-semibold text-xs">
              {isDarkMode ? (
                <Moon className="h-4 w-4 text-violet-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
              <span>{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isDarkMode ? "bg-[#3f3cff]" : "bg-slate-200"
              }`}
              aria-label="Toggle light and dark mode"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  isDarkMode ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Upgrade Banner */}
          <div className={`rounded-2xl p-4.5 shadow-xs ${
            isDarkMode ? "bg-linear-to-br from-indigo-950 via-slate-900 to-slate-950 border border-slate-800" : "bg-linear-to-br from-[#f0edff] via-[#e9ecff] to-[#e0e7ff]"
          }`}>
            <div className="flex items-center gap-2 text-[#3f3cff] font-bold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Upgrade to Premium</span>
            </div>
            <p className={`mt-1.5 text-xs leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Unlock unlimited transfers, card analytics & priority support.
            </p>
            <button className="mt-3.5 w-full rounded-xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 hover:opacity-95 transition-opacity">
              Upgrade Now
            </button>
          </div>
        </aside>

        {/* Mobile & Tablet Backdrop Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile & Tablet Slide-Over Drawer Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 sm:w-80 flex-col border-r px-5 py-6 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out lg:hidden ${
            isDarkMode ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200/70 bg-white"
          } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-[#7c4dff] to-[#2454ff] font-bold text-white shadow-md">
                B
              </div>
              <span className={`text-xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Bank<span className="text-[#3f3cff]">Space</span>
              </span>
            </Link>
            <button
              type="button"
              className={`rounded-full border p-2 ${isDarkMode ? "border-slate-800 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="space-y-1 overflow-y-auto pr-1 flex-1 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#eeeeff] text-[#3f3cff] shadow-xs"
                      : isDarkMode
                      ? "text-slate-300 hover:bg-slate-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? "text-[#3f3cff]" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <section className={`px-4 py-5 sm:px-8 lg:px-12 ${
          isDarkMode ? "bg-slate-950 text-white" : "bg-[radial-gradient(circle_at_top_left,#ffffff_0,#f7f6ff_38%,#f8f9ff_70%)]"
        }`}>
          {/* Header */}
          <header className={`mb-8 flex items-center justify-between gap-4 sticky top-0 z-30 py-3 backdrop-blur-md ${
            isDarkMode ? "bg-slate-950/90" : "bg-[#f8f9ff]/90"
          }`}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[#3f3cff] shadow-xs transition-colors lg:hidden ${
                  isDarkMode ? "border-slate-800 bg-slate-900 hover:bg-slate-800" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Search Bar */}
              <div className={`relative hidden sm:flex h-11 w-64 md:w-80 lg:w-96 items-center rounded-full border pl-4 pr-1.5 shadow-xs focus-within:border-[#3f3cff] focus-within:ring-2 focus-within:ring-[#3f3cff]/10 transition-all ${
                isDarkMode ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200/90 bg-white"
              }`}>
                <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search transactions, cards, beneficiaries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-slate-400 ${
                    isDarkMode ? "text-white" : "text-slate-700"
                  }`}
                />
              </div>
            </div>

            {/* Right Action Bar */}
            <div className="ml-auto flex items-center gap-3">
              {/* Notification Bell Button & Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={handleOpenNotifications}
                  className={`relative grid h-10 w-10 place-items-center rounded-xl border shadow-xs transition-colors ${
                    isDarkMode ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800" : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-violet-600 ring-2 ring-white" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notifDropdownOpen && (
                  <div className={`absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-3xl border p-4 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
                    isDarkMode ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900"
                  }`}>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-[#3f3cff]" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Notifications</h3>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <CheckCheck className="h-3 w-3 text-emerald-500" /> Synced
                      </span>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-6">No new notifications</p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 rounded-2xl border transition-colors ${
                              n.type === "SECURITY"
                                ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50"
                                : n.type === "SUCCESS"
                                ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50"
                                : isDarkMode
                                ? "border-slate-800 bg-slate-800/50"
                                : "border-slate-100 bg-slate-50/70"
                            }`}
                          >
                            <p className="font-bold text-xs">{n.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Send Money Button */}
              <Link
                href="/transfer"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-[#3248f4] to-[#662dff] px-4.5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-opacity"
              >
                <span>Send Money</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              {/* Profile Avatar Button with Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex items-center gap-2.5 rounded-full border p-1 pr-3 shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#3f3cff]/20 ${
                    isDarkMode ? "border-slate-800 bg-slate-900 hover:bg-slate-800" : "border-slate-200/80 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-linear-to-br from-[#7257ff] to-[#4335eb] font-bold text-xs text-white">
                    {initials}
                  </div>
                  <div className="hidden md:block text-left text-xs">
                    <p className={`font-bold leading-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>{shortName}</p>
                    <p className="text-[10px] text-emerald-500 font-medium">Verified User</p>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${userDropdownOpen ? "rotate-180 text-[#3f3cff]" : ""}`} />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className={`absolute right-0 top-full mt-2 w-64 rounded-3xl border p-3 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
                    isDarkMode ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900"
                  }`}>
                    {/* User Identity Header */}
                    <div className={`rounded-2xl p-3.5 mb-2 ${
                      isDarkMode ? "bg-slate-800/80" : "bg-linear-to-br from-[#f0edff] to-[#e9ecff]"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-[#7257ff] to-[#4335eb] font-bold text-xs text-white shadow-xs">
                          {initials}
                        </div>
                        <div className="overflow-hidden">
                          <p className={`font-bold text-xs truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>{user.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] font-semibold text-emerald-600">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Tier 3 Account
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 font-bold">Active</span>
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                          isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <UserIcon className="h-4 w-4 text-[#3f3cff]" />
                        <span>View Profile</span>
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                          isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Settings className="h-4 w-4 text-[#3f3cff]" />
                        <span>Account Settings & Security</span>
                      </Link>

                      <Link
                        href="/accounts"
                        onClick={() => setUserDropdownOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                          isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Wallet className="h-4 w-4 text-[#3f3cff]" />
                        <span>My Accounts & Cards</span>
                      </Link>
                    </div>

                    <div className={`my-2 border-t ${isDarkMode ? "border-slate-800" : "border-slate-100"}`} />

                    {/* Logout Button */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 text-rose-600" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Body */}
          {children}
        </section>
      </div>
    </main>
  )
}

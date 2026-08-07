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
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/transactions", label: "Transactions", icon: History },
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
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
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Dynamic user state
  const [user, setUser] = useState<{ name: string; email: string; phone?: string }>({
    name: "Illias Omotayo",
    email: "illias.o@bankspace.com",
  })

  // Load user from localStorage & verify via /api/auth/me
  useEffect(() => {
    try {
      const stored = localStorage.getItem("bankspace_user")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.name) setUser(parsed)
      }
    } catch {
      // Ignore JSON parse error
    }

    // Fetch live user from database session
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setUser(data.user)
          localStorage.setItem("bankspace_user", JSON.stringify(data.user))
        }
      })
      .catch(() => null)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Fallback manual cookie clear
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
    <main className="min-h-screen bg-[#f8f9ff] text-slate-950 font-sans">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="hidden border-r border-slate-200/70 bg-white/80 px-5 py-6 backdrop-blur-md lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:shrink-0">
          <div className="mb-8 flex items-center justify-between gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-[#7c4dff] via-[#4938f2] to-[#2454ff] font-bold text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                B
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
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
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 transition-transform group-hover:scale-110 ${
                      isActive ? "text-[#3f3cff]" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Upgrade Banner */}
          <div className="mt-4 rounded-2xl bg-linear-to-br from-[#f0edff] via-[#e9ecff] to-[#e0e7ff] p-4.5 shadow-xs">
            <div className="flex items-center gap-2 text-[#3f3cff] font-bold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Upgrade to Premium</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Unlock unlimited transfers, card analytics & priority support.
            </p>
            <button className="mt-3.5 w-full rounded-xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 hover:opacity-95 transition-opacity">
              Upgrade Now
            </button>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile Drawer Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/70 bg-white px-5 py-6 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out lg:hidden ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-[#7c4dff] to-[#2454ff] font-bold text-white">
                B
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Bank<span className="text-[#3f3cff]">Space</span>
              </span>
            </Link>
            <button
              type="button"
              className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="space-y-1 overflow-y-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#eeeeff] text-[#3f3cff]"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? "text-[#3f3cff]" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-4 rounded-2xl bg-linear-to-br from-[#f0edff] to-[#e9ecff] p-4">
            <div className="flex items-center gap-2 text-[#3f3cff] font-bold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Upgrade to Premium</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Higher limits & advanced features.
            </p>
            <button className="mt-3 w-full rounded-xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25">
              Upgrade Now
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="bg-[radial-gradient(circle_at_top_left,#ffffff_0,#f7f6ff_38%,#f8f9ff_70%)] px-4 py-5 sm:px-8 lg:px-12">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between gap-4 sticky top-0 z-30 bg-[#f8f9ff]/90 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#3f3cff] shadow-xs hover:bg-slate-50 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Search Bar */}
              <div className="relative hidden sm:flex h-11 w-72 md:w-96 items-center rounded-full border border-slate-200/90 bg-white pl-4 pr-1.5 shadow-xs focus-within:border-[#3f3cff] focus-within:ring-2 focus-within:ring-[#3f3cff]/10 transition-all">
                <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search transactions, cards, beneficiaries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Right Action Bar */}
            <div className="ml-auto flex items-center gap-3">
              {/* Notification Button */}
              <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-xs hover:bg-slate-50 transition-colors">
                <Bell className="h-4.5 w-4.5 text-slate-600" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-violet-600 ring-2 ring-white" />
              </button>

              {/* Send Money Button */}
              <Link
                href="/transfer"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-[#3248f4] to-[#662dff] px-4.5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-opacity"
              >
                <span>Send Money</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              {/* Profile Avatar Button with Dropdown at the Very Edge */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white p-1 pr-3 shadow-xs hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#3f3cff]/20"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-linear-to-br from-[#7257ff] to-[#4335eb] font-bold text-xs text-white">
                    {initials}
                  </div>
                  <div className="hidden md:block text-left text-xs">
                    <p className="font-bold text-slate-900 leading-tight">{shortName}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Verified User</p>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${userDropdownOpen ? "rotate-180 text-[#3f3cff]" : ""}`} />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User Identity Header */}
                    <div className="rounded-2xl bg-linear-to-br from-[#f0edff] to-[#e9ecff] p-3.5 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-[#7257ff] to-[#4335eb] font-bold text-xs text-white shadow-xs">
                          {initials}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 text-xs truncate">{user.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] font-semibold text-emerald-700">
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
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <UserIcon className="h-4 w-4 text-[#3f3cff]" />
                        <span>View Profile</span>
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-[#3f3cff]" />
                        <span>Account Settings & Security</span>
                      </Link>

                      <Link
                        href="/accounts"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <Wallet className="h-4 w-4 text-[#3f3cff]" />
                        <span>My Accounts & Cards</span>
                      </Link>
                    </div>

                    <div className="my-2 border-t border-slate-100" />

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

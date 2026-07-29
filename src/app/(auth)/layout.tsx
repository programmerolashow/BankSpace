import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            Bankite
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Back home
          </Link>
        </header>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          {children}
        </div>
      </div>
    </main>
  )
}

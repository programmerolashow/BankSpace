import Link from "next/link"

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Reset access</p>
        <h1 className="text-3xl font-bold text-slate-900">Recover your password</h1>
        <p className="text-sm text-slate-600">We’ll send a recovery link to the email address associated with your account.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          type="email"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0"
          placeholder="name@example.com"
        />

        <button className="mt-4 w-full rounded-2xl bg-linear-to-r from-[#4938f2] to-[#622dff] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25">
          Send recovery link
        </button>
      </div>

      <Link href="/login" className="text-sm font-semibold text-violet-700 hover:underline">
        Back to login
      </Link>
    </div>
  )
}

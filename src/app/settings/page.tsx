import Link from "next/link"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Preferences</p>
        <h2 className="text-3xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-600">Control your profile, security, and notification preferences.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-900">Profile</h3>
          <p className="mt-2 text-sm text-slate-600">Update personal details and your preferred contact method.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-900">Security</h3>
          <p className="mt-2 text-sm text-slate-600">Configure two-factor authentication and login preferences.</p>
        </div>
      </div>

      <Link href="/dashboard" className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
        Return to dashboard
      </Link>
    </div>
  )
}

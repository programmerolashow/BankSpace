'use client'

import { useRouter } from "next/navigation"
import AuthModalForms from "@/components/auth/AuthModalForms"

export default function LoginPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f7f6ff_38%,#f8f9ff_70%)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
        <AuthModalForms
          initialMode="login"
          onSwitchMode={(mode) => {
            if (mode === "register") router.push("/register")
          }}
        />
      </div>
    </main>
  )
}

import { Suspense } from "react"
import WelcomePageClient from "@/components/WelcomePage/WelcomePageClient"

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <WelcomePageClient />
    </Suspense>
  )
}

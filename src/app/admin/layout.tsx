'use client'

import { usePathname } from "next/navigation"
import AdminLayout from "@/components/layout/AdminLayout"

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === "/admin/login" || pathname === "/admin/register") {
    return <>{children}</>
  }

  return <AdminLayout>{children}</AdminLayout>
}

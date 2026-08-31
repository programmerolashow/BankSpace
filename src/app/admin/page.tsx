import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"

export default async function AdminRootPage() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("auth")?.value || ""

  if (!authToken) {
    redirect("/admin/login")
  }

  const { valid, user } = await verifySessionToken(authToken)
  if (!valid || !user || user.role !== "ADMIN") {
    redirect("/admin/login")
  }

  redirect("/admin/dashboard")
}

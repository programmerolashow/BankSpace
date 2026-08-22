import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { apiForbidden, apiInternalError } from "@/lib/errors"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid) {
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const auditLogs = [
      {
        id: "log_101",
        event: "ADMIN_LOGIN_SUCCESS",
        details: "Administrator authenticated successfully",
        ip: "127.0.0.1",
        timestamp: new Date().toISOString(),
      },
      {
        id: "log_102",
        event: "RATE_LIMIT_TRIGGERED",
        details: "IP 192.168.1.50 exceeded max login rate limit",
        ip: "192.168.1.50",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: "log_103",
        event: "PAYSTACK_WEBHOOK_VERIFIED",
        details: "HMAC SHA512 signature verified for charge.success reference DEP_88912",
        ip: "52.31.139.75",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "log_104",
        event: "ACCOUNT_FROZEN",
        details: "Account 2019482910 placed under security hold by System Admin",
        ip: "127.0.0.1",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
    ]

    return NextResponse.json({ logs: auditLogs })
  } catch (err) {
    return apiInternalError(err)
  }
}

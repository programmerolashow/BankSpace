/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { getClientIp } from "@/lib/rateLimit"
import { apiUnauthorized, apiForbidden, apiBadRequest, apiInternalError } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid || !authCheck.user) {
      if (authCheck.status === 401) {
        return apiUnauthorized(authCheck.error || "Authentication required. Please log in.")
      }
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { userId, accountId, action, reason } = await request.json().catch(() => ({}))

    if (!userId || !action || (action !== "SUSPEND" && action !== "ACTIVATE")) {
      return apiBadRequest("Invalid request parameters (userId, action: SUSPEND | ACTIVATE required)")
    }

    const targetStatus = action === "SUSPEND" ? "FROZEN" : "ACTIVE"
    const auditAction = action === "SUSPEND" ? "USER_SUSPEND" : "USER_RESTORE"
    const { client } = getPrismaClient()

    if (client.bankAccount && typeof client.bankAccount.updateMany === "function") {
      const whereCond: { userId: string; id?: string } = { userId }
      if (accountId) whereCond.id = accountId

      await client.bankAccount.updateMany({
        where: whereCond,
        data: { status: targetStatus },
      })
    }

    if (client.user && typeof client.user.update === "function") {
      await client.user.update({
        where: { id: userId },
        data: { isSuspended: action === "SUSPEND" },
      })
    }

    // Trigger Security Notification to User
    await createNotification(
      userId,
      `Account Status Alert: ${targetStatus}`,
      `Your BankSpace account status has been updated to ${targetStatus} by System Security.`,
      "SECURITY"
    )

    // Record Audit Log Entry
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || undefined

    if (client.auditLog && typeof client.auditLog.create === "function") {
      try {
        await client.auditLog.create({
          data: {
            adminId: authCheck.user.id,
            adminEmail: authCheck.user.email,
            adminName: authCheck.user.name,
            action: auditAction,
            targetEntity: "User",
            targetId: userId,
            ipAddress,
            userAgent,
            metadata: JSON.stringify({ userId, accountId, action, targetStatus, reason }),
          },
        })
      } catch (err) {
        console.warn("[Admin Suspend Audit Log Notice]:", err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Account status successfully updated to ${targetStatus}.`,
      status: targetStatus,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

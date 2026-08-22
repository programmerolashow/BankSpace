import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { apiForbidden, apiBadRequest, apiInternalError } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid) {
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { userId, accountId, action } = await request.json()

    if (!userId || !action || (action !== "SUSPEND" && action !== "ACTIVATE")) {
      return apiBadRequest("Invalid request parameters (userId, action: SUSPEND | ACTIVATE required)")
    }

    const targetStatus = action === "SUSPEND" ? "FROZEN" : "ACTIVE"
    const { client } = getPrismaClient()

    if (client.bankAccount && typeof client.bankAccount.updateMany === "function") {
      const whereCond: { userId: string; id?: string } = { userId }
      if (accountId) whereCond.id = accountId

      await client.bankAccount.updateMany({
        where: whereCond,
        data: { status: targetStatus },
      })
    }

    // Trigger Security Notification to User
    await createNotification(
      userId,
      `Account Status Alert: ${targetStatus}`,
      `Your BankSpace account status has been updated to ${targetStatus} by System Security.`,
      "SECURITY"
    )

    return NextResponse.json({
      success: true,
      message: `Account status successfully updated to ${targetStatus}.`,
      status: targetStatus,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

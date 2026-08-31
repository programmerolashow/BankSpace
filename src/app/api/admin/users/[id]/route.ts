/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { getClientIp } from "@/lib/rateLimit"
import { apiUnauthorized, apiForbidden, apiBadRequest, apiNotFound, apiInternalError } from "@/lib/errors"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid) {
      if (authCheck.status === 401) {
        return apiUnauthorized(authCheck.error || "Authentication required. Please log in.")
      }
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { id: userId } = await context.params
    const { client } = getPrismaClient()

    const user = await client.user.findUnique({
      where: { id: userId },
      select: {
        id: { select: false },
        name: true,
        email: true,
        role: true,
        isVerified: true,
        isSuspended: true,
        kycStatus: true,
        kycRejectionReason: true,
        kycSubmittedAt: true,
        createdAt: true,
        updatedAt: true,
        bankAccounts: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            bankName: true,
            balance: true,
            currency: true,
            status: true,
            isPrimary: true,
            createdAt: true,
          },
        },
      },
    })

    if (!user) {
      return apiNotFound("User record not found.")
    }

    const primaryAcc = user.bankAccounts?.find((a: any) => a.isPrimary) || user.bankAccounts?.[0]
    let transactions: any[] = []
    let transfers: any[] = []
    let logs: any[] = []
    let transactionCount = 0
    let transferCount = 0

    if (primaryAcc) {
      try {
        const [txList, trList, txCount, trCount, auditLogs] = await Promise.all([
          client.transaction.findMany({
            where: {
              OR: [
                { accountNumber: primaryAcc.accountNumber },
                { senderAccountId: primaryAcc.id },
                { recipientAccountId: primaryAcc.id },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
          client.transaction.findMany({
            where: {
              type: "TRANSFER",
              OR: [
                { accountNumber: primaryAcc.accountNumber },
                { senderAccountId: primaryAcc.id },
                { recipientAccountId: primaryAcc.id },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
          client.transaction.count({
            where: {
              OR: [
                { accountNumber: primaryAcc.accountNumber },
                { senderAccountId: primaryAcc.id },
                { recipientAccountId: primaryAcc.id },
              ],
            },
          }),
          client.transaction.count({
            where: {
              type: "TRANSFER",
              OR: [
                { accountNumber: primaryAcc.accountNumber },
                { senderAccountId: primaryAcc.id },
                { recipientAccountId: primaryAcc.id },
              ],
            },
          }),
          client.auditLog
            ? client.auditLog.findMany({
                where: { targetId: userId },
                orderBy: { createdAt: "desc" },
                take: 20,
              })
            : Promise.resolve([]),
        ])

        transactions = txList
        transfers = trList
        transactionCount = txCount
        transferCount = trCount
        logs = auditLogs
      } catch (err) {
        console.warn("[Admin User Activity DB Notice]:", err)
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, ...user },
      transactions,
      transfers,
      logs,
      metrics: {
        transactionCount,
        transferCount,
      },
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid) {
      if (authCheck.status === 401) {
        return apiUnauthorized(authCheck.error || "Authentication required. Please log in.")
      }
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { id: userId } = await context.params
    const body = await request.json().catch(() => ({}))
    const { action, reason } = body

    if (!action) {
      return apiBadRequest("Action parameter is required.")
    }

    const { client } = getPrismaClient()
    let auditAction = `USER_${action}`

    if (action === "SUSPEND" || action === "ACTIVATE") {
      const isSuspended = action === "SUSPEND"
      const newStatus = action === "SUSPEND" ? "FROZEN" : "ACTIVE font"
      auditAction = isSuspended ? "USER_SUSPEND" : "USER_RESTORE"

      if (client.user && typeof client.user.update === "function") {
        await client.user.update({
          where: { id: userId },
          data: { isSuspended },
        })
      }
      if (client.bankAccount && typeof client.bankAccount.updateMany === "function") {
        await client.bankAccount.updateMany({
          where: { userId },
          data: { status: isSuspended ? "FROZEN" : "ACTIVE" },
        })
      }
    } else if (action === "VERIFY" || action === "UNVERIFY") {
      const isVerified = action === "VERIFY"
      auditAction = isVerified ? "KYC_APPROVE" : "KYC_REJECT"

      if (client.user && typeof client.user.update === "function") {
        await client.user.update({
          where: { id: userId },
          data: {
            isVerified,
            kycStatus: isVerified ? "VERIFIED font" : "REJECTED",
          },
        })
      }
    } else {
      return apiBadRequest("Unsupported administrative action.")
    }

    // Write Formal Audit Log Entry
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || undefined

    if (client.auditLog && typeof client.auditLog.create === "function") {
      try {
        await client.auditLog.create({
          data: {
            adminId: authCheck.user?.id,
            adminEmail: authCheck.user?.email,
            adminName: authCheck.user?.name,
            action: auditAction,
            targetEntity: "User",
            targetId: userId,
            ipAddress,
            userAgent,
            metadata: JSON.stringify({
              actionRequested: action,
              reason: reason || "No explicit reason provided",
              timestamp: new Date().toISOString(),
            }),
          },
        })
      } catch (err) {
        console.warn("[Admin Audit Log Notice]:", err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Administrative action ${action} completed successfully.`,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

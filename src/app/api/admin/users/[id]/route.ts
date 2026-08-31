/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiUnauthorized, apiForbidden, apiNotFound, apiBadRequest, apiInternalError } from "@/lib/errors"

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
    if (!userId) {
      return apiNotFound("User ID is required.")
    }

    const { client } = getPrismaClient()

    let user: any = null
    let transactions: any[] = []
    let transfers: any[] = []
    let logs: any[] = []
    let transactionCount = 0
    let transferCount = 0

    if (client.user && typeof client.user.findUnique === "function") {
      try {
        user = await client.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isVerified: true,
            phone: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true,
            bankAccounts: {
              select: {
                id: true,
                accountNumber: true,
                accountName: true,
                bankName: true,
                balance: true,
                status: true,
                isPrimary: true,
                createdAt: true,
              },
            },
          },
        })
      } catch (err) {
        console.warn("[Admin User Detail DB Notice]:", err)
      }
    }

    if (!user) {
      return apiNotFound("User not found.")
    }

    const primaryAcc = user.bankAccounts?.find((a: any) => a.isPrimary) || user.bankAccounts?.[0]

    // Fetch user recent transactions, transfers, counts & logs
    if (primaryAcc && client.transaction && typeof client.transaction.findMany === "function") {
      try {
        const [txList, trList, txCount, trCount, auditLogs] = await Promise.all([
          client.transaction.findMany({
            where: {
              OR: [
                { accountNumber: primaryAcc.accountNumber },
                { bankAccountId: primaryAcc.id },
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
                { bankAccountId: primaryAcc.id },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
          client.transaction.count({
            where: {
              OR: [
                { accountNumber: primaryAcc.accountNumber },
                { bankAccountId: primaryAcc.id },
              ],
            },
          }),
          client.transaction.count({
            where: {
              type: "TRANSFER",
              OR: [
                { accountNumber: primaryAcc.accountNumber },
                { bankAccountId: primaryAcc.id },
              ],
            },
          }),
          client.auditLog
            ? client.auditLog.findMany({
                where: { userId: user.id },
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
      user,
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

    if (action === "SUSPEND" || action === "ACTIVATE") {
      const newStatus = action === "SUSPEND" ? "FROZEN" : "ACTIVE"
      if (client.bankAccount && typeof client.bankAccount.updateMany === "function") {
        await client.bankAccount.updateMany({
          where: { userId },
          data: { status: newStatus },
        })
      }
    } else if (action === "VERIFY" || action === "UNVERIFY") {
      const isVerified = action === "VERIFY"
      if (client.user && typeof client.user.update === "function") {
        await client.user.update({
          where: { id: userId },
          data: { isVerified },
        })
      }
    } else {
      return apiBadRequest("Unsupported administrative action.")
    }

    // Write Audit Log
    if (client.auditLog && typeof client.auditLog.create === "function") {
      try {
        await client.auditLog.create({
          data: {
            userId: authCheck.user?.id || userId,
            action: `ADMIN_ACTION_${action}`,
            resource: `USER_${userId}`,
            details: reason || `Administrative action ${action} executed for user ${userId}`,
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

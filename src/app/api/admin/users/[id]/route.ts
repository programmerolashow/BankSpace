/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiUnauthorized, apiForbidden, apiNotFound, apiInternalError } from "@/lib/errors"

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

    // Fetch user recent transactions and transfers if account exists
    if (primaryAcc && client.transaction && typeof client.transaction.findMany === "function") {
      try {
        const [txList, trList] = await Promise.all([
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
        ])

        transactions = txList
        transfers = trList
      } catch (err) {
        console.warn("[Admin User Transactions DB Notice]:", err)
      }
    }

    return NextResponse.json({
      success: true,
      user,
      transactions,
      transfers,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

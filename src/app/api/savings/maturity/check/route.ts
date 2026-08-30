/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { calculateDailyInterest } from "@/lib/savingsInterest"
import { createNotification } from "@/lib/notifications"
import { logAuditEvent } from "@/lib/audit"
import { apiUnauthorized, apiInternalError } from "@/lib/errors"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    const { client } = getPrismaClient()
    const now = new Date()
    const maturedAccounts: any[] = []

    if (client.savingsAccount && typeof client.savingsAccount.findMany === "function") {
      const activeFixedAccounts = await client.savingsAccount.findMany({
        where: {
          userId: user.id,
          status: { in: ["ACTIVE", "LOCKED"] },
          maturityDate: { lte: now },
        },
      })

      for (const acc of activeFixedAccounts) {
        const yieldAmount = calculateDailyInterest(acc.currentBalance, acc.interestRate, 1)

        const updated = await client.savingsAccount.update({
          where: { id: acc.id },
          data: {
            status: "MATURED",
            currentBalance: { increment: yieldAmount },
            interestAccrued: { increment: yieldAmount },
          },
        })

        maturedAccounts.push(updated)

        await createNotification(
          user.id,
          "Fixed Deposit Matured! 🏆",
          `Your fixed deposit "${acc.title}" has matured with ₦${updated.currentBalance.toLocaleString()}.00 in total value. Choose to withdraw to checking or rollover.`,
          "SUCCESS"
        )

        await logAuditEvent(
          user.id,
          "TRANSACTION_SUCCESS",
          `Savings account ${acc.id} (${acc.title}) transitioned to MATURED state.`
        )
      }
    }

    return NextResponse.json({
      success: true,
      maturedCount: maturedAccounts.length,
      maturedAccounts,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
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
    let accruedHoldingsCount = 0
    let totalAccruedReturns = 0.0

    if (client.investmentHolding && typeof client.investmentHolding.findMany === "function") {
      const activeHoldings = await client.investmentHolding.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        include: { product: true },
      })

      for (const h of activeHoldings) {
        if (h.product?.category === "FIXED_INCOME" || h.product?.expectedRateAnnual) {
          const annualRate = h.product?.expectedRateAnnual || 0.12
          const principal = h.principalInvested || h.currentValue
          const dailyYield = Math.round(((principal * annualRate) / 365) * 100) / 100

          if (dailyYield > 0) {
            await client.investmentHolding.update({
              where: { id: h.id },
              data: {
                currentValue: { increment: dailyYield },
                totalReturns: { increment: dailyYield },
              },
            })

            accruedHoldingsCount++
            totalAccruedReturns += dailyYield
          }
        }
      }
    }

    if (accruedHoldingsCount > 0) {
      await createNotification(
        user.id,
        "Daily Investment Yield Accrued 📈",
        `Accrued ₦${totalAccruedReturns.toFixed(2)} in daily interest across ${accruedHoldingsCount} fixed-income holdings.`,
        "SUCCESS"
      )

      await logAuditEvent(
        user.id,
        "TRANSACTION_SUCCESS",
        `Accrued ₦${totalAccruedReturns} daily yield for user ${user.id}`
      )
    }

    return NextResponse.json({
      success: true,
      accruedHoldingsCount,
      totalAccruedReturns,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

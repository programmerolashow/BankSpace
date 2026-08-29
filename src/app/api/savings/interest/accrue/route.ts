import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { processSavingsInterestAccrual } from "@/lib/savingsInterest"
import {
  apiUnauthorized,
  apiBadRequest,
  apiInternalError,
} from "@/lib/errors"

export async function POST(request: Request) {
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

    const body = await request.json()
    const { savingsAccountId, goalId, daysElapsed } = body

    const targetSavingsId = savingsAccountId || goalId
    if (!targetSavingsId) {
      return apiBadRequest("Savings account ID or goal ID is required.")
    }

    const days = daysElapsed ? Math.max(1, Number(daysElapsed)) : 1

    const result = await processSavingsInterestAccrual(user.id, targetSavingsId, days)

    return NextResponse.json({
      success: true,
      message: result.interestPayout > 0
        ? `Successfully credited ₦${result.interestPayout.toFixed(2)} in interest returns.`
        : "No interest accrued for the selected period.",
      interestPayout: result.interestPayout,
      savingsAccount: result.savingsAccount,
      transaction: result.transaction,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

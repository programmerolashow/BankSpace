import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { calculateUserPortfolioValuation } from "@/lib/investmentValuation"
import { apiUnauthorized, apiInternalError } from "@/lib/errors"

export async function GET() {
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

    const summary = await calculateUserPortfolioValuation(user.id)

    return NextResponse.json({
      success: true,
      summary,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

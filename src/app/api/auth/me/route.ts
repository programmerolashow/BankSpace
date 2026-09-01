import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { deriveUserKycState } from "@/lib/kycStateEngine"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const result = await verifySessionToken(authToken)

    if (!result.valid || !result.user) {
      return NextResponse.json(
        { message: result.error || "Invalid or expired session" },
        { status: 401 }
      )
    }

    const kycEvaluation = deriveUserKycState(result.user)

    return NextResponse.json({
      user: {
        ...result.user,
        kycState: kycEvaluation.state,
        accessLevel: kycEvaluation.accessLevel,
        kycDescription: kycEvaluation.description,
        canPerformFinancialMutations: kycEvaluation.canPerformFinancialMutations,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Authentication error" },
      { status: 401 }
    )
  }
}

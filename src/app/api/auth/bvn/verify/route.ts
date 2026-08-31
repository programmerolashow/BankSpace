/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { verifyBvnWithProvider } from "@/lib/bvnVerificationService"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated session. Please log in." }, { status: 401 })
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return NextResponse.json({ message: error || "Invalid or expired session" }, { status: 401 })
    }

    const body = await request.json()
    const { bvn, firstName, lastName, dob, phone } = body

    if (!bvn || String(bvn).replace(/\D/g, "").length !== 11) {
      return NextResponse.json({ message: "BVN must be exactly 11 numeric digits." }, { status: 400 })
    }

    if (!firstName || !lastName || !dob) {
      return NextResponse.json(
        { message: "First name, last name, and date of birth are required for identity matching." },
        { status: 400 }
      )
    }

    const result = await verifyBvnWithProvider({
      userId: user.id,
      bvn,
      firstName,
      lastName,
      dob,
      phone,
    })

    return NextResponse.json({
      success: result.success,
      status: result.status,
      maskedBvn: result.maskedBvn,
      provider: result.provider,
      referenceId: result.referenceId,
      verifiedAt: result.verifiedAt,
      failureReason: result.failureReason,
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "BVN Verification service failure." },
      { status: 400 }
    )
  }
}

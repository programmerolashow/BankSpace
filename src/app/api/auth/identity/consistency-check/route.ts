/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { evaluateIdentityConsistency } from "@/lib/identityConsistencyEngine"

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
    const {
      googleName,
      profileFirstName,
      profileLastName,
      profileDob,
      bvnFirstName,
      bvnLastName,
      bvnDob,
      ninFirstName,
      ninLastName,
      ninDob,
      phoneVerified,
    } = body

    const result = evaluateIdentityConsistency({
      googleName: googleName || user.name,
      profileFirstName,
      profileLastName,
      profileDob,
      bvnFirstName,
      bvnLastName,
      bvnDob,
      ninFirstName,
      ninLastName,
      ninDob,
      phoneVerified: Boolean(phoneVerified),
    })

    return NextResponse.json({
      success: true,
      status: result.status,
      score: result.score,
      flags: result.flags,
      summary: result.summary,
      details: result.details,
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Identity consistency check failed." },
      { status: 400 }
    )
  }
}

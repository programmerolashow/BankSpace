/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { sendPhoneOtp } from "@/lib/otpService"

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
    const { phone } = body

    if (!phone || !phone.trim()) {
      return NextResponse.json({ message: "Phone number is required to send OTP." }, { status: 400 })
    }

    const result = await sendPhoneOtp(user.id, phone.trim())

    return NextResponse.json({
      success: result.success,
      message: result.message,
      cooldownSeconds: result.cooldownSeconds || 60,
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to dispatch phone verification OTP." },
      { status: 400 }
    )
  }
}

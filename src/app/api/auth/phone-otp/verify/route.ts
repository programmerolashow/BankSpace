/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { verifyPhoneOtp } from "@/lib/otpService"

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
    const { phone, otp } = body

    if (!phone || !phone.trim() || !otp || !otp.trim()) {
      return NextResponse.json({ message: "Phone number and OTP verification code are required." }, { status: 400 })
    }

    const result = await verifyPhoneOtp(user.id, phone.trim(), otp.trim())

    return NextResponse.json({
      success: true,
      message: result.message,
      accountNumber: result.accountNumber,
      user: {
        id: user.id,
        phone: phone.trim(),
        phoneVerified: true,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to verify phone OTP." },
      { status: 400 }
    )
  }
}
